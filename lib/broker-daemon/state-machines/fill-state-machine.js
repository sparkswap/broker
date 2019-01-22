const StateMachineHistory = require('javascript-state-machine/lib/history');
const Fill = require('../models/fill');
const { generateId, payInvoice } = require('../utils');
const StateMachine = require('./state-machine');
const { StateMachinePersistence, StateMachineRejection, StateMachineLogging, StateMachineEvents } = require('./plugins');
const UNASSIGNED_PREFIX = 'NO_ASSIGNED_ID_';
const FILL_ERROR_CODES = Object.freeze({
    ORDER_NOT_PLACED: 'ORDER_NOT_PLACED'
});
const FillStateMachine = StateMachine.factory({
    plugins: [
        new StateMachineHistory(),
        new StateMachineRejection(),
        new StateMachineEvents(),
        new StateMachineLogging({
            skipTransitions: ['goto']
        }),
        new StateMachinePersistence({
            key: function (key) {
                if (!key) {
                    return this.fill.key || `${UNASSIGNED_PREFIX}${generateId()}`;
                }
            },
            additionalFields: {
                fill: function (fillObject, key) {
                    if (fillObject) {
                        this.fill = Fill.fromObject(key, fillObject);
                    }
                    return this.fill.valueObject;
                },
                history: function (history) {
                    if (history) {
                        this.clearHistory();
                        this.history = history;
                    }
                    return this.history;
                },
                error: function (errorMessage) {
                    if (errorMessage) {
                        this.error = new Error(errorMessage);
                    }
                    if (this.error) {
                        return this.error.message;
                    }
                }
            }
        })
    ],
    transitions: [
        { name: 'create', from: 'none', to: 'created' },
        { name: 'fillOrder', from: 'created', to: 'filled' },
        { name: 'execute', from: 'filled', to: 'executed' },
        { name: 'cancel', from: 'created', to: 'cancelled' }
    ],
    data: function ({ store, logger, relayer, engines }) {
        return { store, logger, relayer, engines, fill: {} };
    },
    methods: {
        onBeforeCreate: async function (lifecycle, blockOrderId, { orderId, side, baseSymbol, counterSymbol, baseAmount, counterAmount }, { fillAmount }) {
            this.fill = new Fill(blockOrderId, { orderId, baseSymbol, counterSymbol, side, baseAmount, counterAmount }, { fillAmount });
            const { inboundAmount, inboundSymbol } = this.fill;
            const inboundEngine = this.engines.get(inboundSymbol);
            if (!inboundEngine) {
                throw new Error(`No engine available for ${inboundEngine}`);
            }
            const baseEngine = this.engines.get(baseSymbol);
            if (!baseEngine) {
                throw new Error(`No engine available for ${baseEngine}`);
            }
            const counterEngine = this.engines.get(counterSymbol);
            if (!counterEngine) {
                throw new Error(`No engine available for ${counterEngine}`);
            }
            this.fill.takerBaseAddress = await baseEngine.getPaymentChannelNetworkAddress();
            this.fill.takerCounterAddress = await counterEngine.getPaymentChannelNetworkAddress();
            const swapHash = await inboundEngine.createSwapHash(this.fill.order.orderId, inboundAmount);
            this.fill.setSwapHash(swapHash);
            const { fillId, feePaymentRequest, depositPaymentRequest, feeRequired, depositRequired, fillError } = await this.relayer.takerService.createFill(this.fill.paramsForCreate);
            if (fillError) {
                this.logger.error(`Encountered error with fill: ${fillError.message}`);
                throw new Error(fillError.code);
            }
            this.fill.setCreatedParams({
                fillId,
                feePaymentRequest,
                depositPaymentRequest,
                feeRequired,
                depositRequired
            });
            this.logger.info(`Created fill ${this.fill.fillId} on the relayer`);
        },
        onAfterCreate: function (lifecycle) {
            this.logger.info(`Create transition completed, triggering fill`);
            process.nextTick(() => {
                this.tryTo('fillOrder');
            });
        },
        onBeforeFillOrder: async function (lifecycle) {
            const { feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired, fillId, outboundSymbol } = this.fill.paramsForFill;
            const outboundEngine = this.engines.get(outboundSymbol);
            if (!outboundEngine) {
                throw new Error(`No engine available for ${outboundSymbol}`);
            }
            this.logger.debug(`Paying fee and deposit invoices for ${fillId}`);
            let payFeeInvoice;
            let payDepositInvoice;
            if (feeRequired) {
                payFeeInvoice = payInvoice(outboundEngine, feePaymentRequest);
            }
            else {
                this.logger.debug(`Skipping paying fee invoice for ${fillId}, not required`);
            }
            if (depositRequired) {
                payDepositInvoice = payInvoice(outboundEngine, depositPaymentRequest);
            }
            else {
                this.logger.debug(`Skipping paying deposit invoice for ${fillId}, not required`);
            }
            const [feeRefundPaymentRequest, depositRefundPaymentRequest] = await Promise.all([
                payFeeInvoice,
                payDepositInvoice
            ]);
            const authorization = this.relayer.identity.authorize(fillId);
            this.logger.debug(`Generated authorization for ${fillId}`, authorization);
            const { fillError } = await this.relayer.takerService.fillOrder({ fillId, feeRefundPaymentRequest, depositRefundPaymentRequest, authorization });
            if (fillError) {
                this.logger.error(`Encountered error with fill: ${fillError.message}`);
                throw new Error(fillError.code);
            }
            this.logger.info(`Filled order ${fillId} on the relayer`);
        },
        onAfterFillOrder: function (lifecycle) {
            this.triggerExecute(lifecycle);
        },
        triggerExecute: function (lifecycle) {
            const { fillId } = this.fill;
            this.logger.info(`In filled state, attempting to listen for executions on fill ${fillId}`);
            const authorization = this.relayer.identity.authorize(fillId);
            this.logger.debug(`Generated authorization for ${fillId}`, authorization);
            const call = this.relayer.takerService.subscribeExecute({ fillId, authorization });
            const finish = () => {
                call.removeListener('error', errHandler);
                call.removeListener('end', endHandler);
                call.removeListener('data', dataHandler);
            };
            const errHandler = (e) => {
                this.reject(e);
                finish();
            };
            const endHandler = () => {
                const err = new Error(`SubscribeExecute stream for ${fillId} ended early by Relayer`);
                this.reject(err);
                finish();
            };
            const dataHandler = ({ makerAddress }) => {
                try {
                    this.fill.setExecuteParams({ makerAddress });
                    this.logger.info(`Fill ${fillId} is being executed`);
                    this.tryTo('execute');
                }
                catch (e) {
                    this.reject(e);
                }
                finish();
            };
            call.on('error', errHandler);
            call.on('end', endHandler);
            call.on('data', dataHandler);
        },
        onBeforeExecute: async function (lifecycle) {
            const { makerAddress, swapHash, symbol, amount } = this.fill.paramsForSwap;
            const engine = this.engines.get(symbol);
            if (!engine) {
                throw new Error(`No engine available for ${symbol}`);
            }
            await engine.executeSwap(makerAddress, swapHash, amount);
        },
        onBeforeReject: function (lifecycle, error) {
            this.logger.error(`Encountered error during transition, rejecting`, error);
            this.fill.error = error;
        },
        shouldRetry: function () {
            return !!this.fill.error && this.fill.error.message === FILL_ERROR_CODES.ORDER_NOT_PLACED;
        },
        triggerState: function (lifecycle) {
            if (this.state === 'created') {
                process.nextTick(() => this.tryTo('cancel'));
            }
            else if (this.state === 'filled') {
                this.triggerExecute();
            }
        }
    }
});
FillStateMachine.create = async function (initParams, ...createParams) {
    const fsm = new FillStateMachine(initParams);
    await fsm.tryTo('create', ...createParams);
    return fsm;
};
FillStateMachine.STATES = Object.freeze({
    NONE: 'none',
    CREATED: 'created',
    FILLED: 'filled',
    EXECUTED: 'executed',
    CANCELLED: 'cancelled'
});
FillStateMachine.INDETERMINATE_STATES = Object.freeze({
    CREATED: 'created',
    FILLED: 'filled'
});
module.exports = FillStateMachine;
//# sourceMappingURL=fill-state-machine.js.map
const StateMachineHistory = require('javascript-state-machine/lib/history');
const Order = require('../models/order');
const { generateId, payInvoice } = require('../utils');
const StateMachine = require('./state-machine');
const { StateMachinePersistence, StateMachineRejection, StateMachineLogging, StateMachineEvents } = require('./plugins');
const UNASSIGNED_PREFIX = 'NO_ASSIGNED_ID_';
const OrderStateMachine = StateMachine.factory({
    plugins: [
        new StateMachineHistory(),
        new StateMachineRejection(),
        new StateMachineLogging({
            skipTransitions: ['goto']
        }),
        new StateMachineEvents(),
        new StateMachinePersistence({
            key: function (key) {
                if (!key) {
                    return this.order.key || `${UNASSIGNED_PREFIX}${generateId()}`;
                }
            },
            additionalFields: {
                order: function (orderObject, key) {
                    if (orderObject) {
                        this.order = Order.fromObject(key, orderObject);
                    }
                    return this.order.valueObject;
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
        { name: 'place', from: 'created', to: 'placed' },
        { name: 'cancel', from: 'placed', to: 'cancelled' },
        { name: 'execute', from: 'placed', to: 'executing' },
        { name: 'complete', from: 'executing', to: 'completed' }
    ],
    data: function ({ store, logger, relayer, engines }) {
        return { store, logger, relayer, engines, order: {} };
    },
    methods: {
        onBeforeCreate: async function (lifecycle, blockOrderId, { side, baseSymbol, counterSymbol, baseAmount, counterAmount }) {
            this.order = new Order(blockOrderId, { baseSymbol, counterSymbol, side, baseAmount, counterAmount });
            const baseEngine = this.engines.get(this.order.baseSymbol);
            if (!baseEngine) {
                throw new Error(`No engine available for ${this.order.baseSymbol}`);
            }
            const counterEngine = this.engines.get(this.order.counterSymbol);
            if (!counterEngine) {
                throw new Error(`No engine available for ${this.order.counterSymbol}`);
            }
            this.order.makerBaseAddress = await baseEngine.getPaymentChannelNetworkAddress();
            this.order.makerCounterAddress = await counterEngine.getPaymentChannelNetworkAddress();
            const { orderId, feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired } = await this.relayer.makerService.createOrder(this.order.paramsForCreate);
            this.order.setCreatedParams({
                orderId,
                feePaymentRequest,
                feeRequired,
                depositPaymentRequest,
                depositRequired
            });
            this.logger.info(`Created order ${this.order.orderId} on the relayer`);
        },
        onAfterCreate: function (lifecycle) {
            this.logger.info(`Create transition completed, triggering place`);
            process.nextTick(() => {
                this.tryTo('place');
            });
        },
        onBeforePlace: async function (lifecycle) {
            const { feePaymentRequest, feeRequired, depositPaymentRequest, depositRequired, orderId, outboundSymbol } = this.order.paramsForPlace;
            const outboundEngine = this.engines.get(outboundSymbol);
            if (!outboundEngine) {
                throw new Error(`No engine available for ${outboundSymbol}`);
            }
            this.logger.debug(`Paying fee and deposit invoices for ${orderId}`);
            let payFeeInvoice;
            let payDepositInvoice;
            if (feeRequired) {
                payFeeInvoice = payInvoice(outboundEngine, feePaymentRequest);
            }
            else {
                this.logger.debug(`Skipping paying fee invoice for ${orderId}, not required`);
            }
            if (depositRequired) {
                payDepositInvoice = payInvoice(outboundEngine, depositPaymentRequest);
            }
            else {
                this.logger.debug(`Skipping paying deposit invoice for ${orderId}, not required`);
            }
            const [feeRefundPaymentRequest, depositRefundPaymentRequest] = await Promise.all([
                payFeeInvoice,
                payDepositInvoice
            ]);
            const authorization = this.relayer.identity.authorize(orderId);
            this.logger.debug(`Generated authorization for ${orderId}`, authorization);
            const call = this.relayer.makerService.placeOrder({
                orderId,
                feeRefundPaymentRequest,
                depositRefundPaymentRequest,
                authorization
            });
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
                const err = new Error(`PlaceOrder stream for ${orderId} ended early by Relayer`);
                this.reject(err);
                finish();
            };
            const dataHandler = ({ orderStatus, fill }) => {
                try {
                    if (OrderStateMachine.STATES[orderStatus] === OrderStateMachine.STATES.CANCELLED) {
                        this.logger.info(`Order ${orderId} was cancelled on the relayer, cancelling locally.`, { orderId });
                        this.tryTo('cancel');
                    }
                    else {
                        this.logger.info(`Order ${this.order.orderId} is being filled`, { orderId });
                        const { swapHash, fillAmount, takerAddress } = fill;
                        this.order.setFilledParams({ swapHash, fillAmount, takerAddress });
                        this.tryTo('execute');
                    }
                }
                catch (e) {
                    this.reject(e);
                }
                finally {
                    finish();
                }
            };
            call.on('error', errHandler);
            call.on('end', endHandler);
            call.on('data', dataHandler);
            this.logger.info(`Placed order ${orderId} on the relayer`, { orderId });
        },
        onBeforeExecute: async function (lifecycle) {
            const { orderId, swapHash, symbol, amount } = this.order.paramsForPrepareSwap;
            const engine = this.engines.get(symbol);
            if (!engine) {
                throw new Error(`No engine available for ${symbol}`);
            }
            await engine.prepareSwap(orderId, swapHash, amount);
            const authorization = this.relayer.identity.authorize(orderId);
            this.logger.debug(`Generated authorization for ${orderId}`, authorization);
            await this.relayer.makerService.executeOrder({ orderId, authorization });
        },
        onAfterExecute: function (lifecycle) {
            this.triggerComplete();
        },
        triggerState: function (lifecycle) {
            if (this.state === 'executing') {
                this.triggerComplete();
            }
            else if (this.state === 'created' || this.state === 'placed') {
                process.nextTick(() => this.tryTo('cancel'));
            }
        },
        triggerComplete: function () {
            process.nextTick(() => this.tryTo('complete'));
        },
        onBeforeComplete: async function (lifecycle) {
            const { swapHash, symbol } = this.order.paramsForGetPreimage;
            const engine = this.engines.get(symbol);
            if (!engine) {
                throw new Error(`No engine available for ${symbol}`);
            }
            const swapPreimage = await engine.getSettledSwapPreimage(swapHash);
            this.order.setSettledParams({ swapPreimage });
            const { orderId } = this.order.paramsForComplete;
            const authorization = this.relayer.identity.authorize(orderId);
            this.logger.debug(`Generated authorization for ${orderId}`, authorization);
            return this.relayer.makerService.completeOrder({ orderId, swapPreimage, authorization });
        },
        onBeforeReject: function (lifecycle, error) {
            this.logger.error(`Encountered error during transition, rejecting`, error);
            this.order.error = error;
        }
    }
});
OrderStateMachine.create = async function (initParams, ...createParams) {
    const osm = new OrderStateMachine(initParams);
    await osm.tryTo('create', ...createParams);
    return osm;
};
OrderStateMachine.STATES = Object.freeze({
    NONE: 'none',
    CREATED: 'created',
    PLACED: 'placed',
    CANCELLED: 'cancelled',
    EXECUTING: 'executing'
});
OrderStateMachine.INDETERMINATE_STATES = Object.freeze({
    CREATED: 'created',
    PLACED: 'placed',
    EXECUTING: 'executing'
});
module.exports = OrderStateMachine;
//# sourceMappingURL=order-state-machine.js.map
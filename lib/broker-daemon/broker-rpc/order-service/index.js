const { GrpcUnaryMethod } = require('grpc-methods');
const { loadProto } = require('../../utils');
const createBlockOrder = require('./create-block-order');
const getBlockOrder = require('./get-block-order');
const cancelBlockOrder = require('./cancel-block-order');
const getBlockOrders = require('./get-block-orders');
class OrderService {
    constructor(protoPath, { logger, blockOrderWorker, auth }) {
        this.protoPath = protoPath;
        this.proto = loadProto(this.protoPath);
        this.logger = logger;
        this.definition = this.proto.broker.rpc.OrderService.service;
        this.serviceName = 'OrderService';
        const { CreateBlockOrderResponse, TimeInForce, GetBlockOrderResponse, GetBlockOrdersResponse } = this.proto.broker.rpc;
        this.implementation = {
            createBlockOrder: new GrpcUnaryMethod(createBlockOrder, this.messageId('createBlockOrder'), { logger, blockOrderWorker, auth }, { CreateBlockOrderResponse, TimeInForce }).register(),
            getBlockOrder: new GrpcUnaryMethod(getBlockOrder, this.messageId('getBlockOrder'), { logger, blockOrderWorker, auth }, { GetBlockOrderResponse }).register(),
            cancelBlockOrder: new GrpcUnaryMethod(cancelBlockOrder, this.messageId('cancelBlockOrder'), { logger, blockOrderWorker, auth }).register(),
            getBlockOrders: new GrpcUnaryMethod(getBlockOrders, this.messageId('getBlockOrders'), { logger, blockOrderWorker, auth }, { GetBlockOrdersResponse }).register()
        };
    }
    messageId(methodName) {
        return `[${this.serviceName}:${methodName}]`;
    }
}
module.exports = OrderService;
//# sourceMappingURL=index.js.map
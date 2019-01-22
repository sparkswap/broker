const { GrpcServerStreamingMethod } = require('grpc-methods');
const { loadProto } = require('../utils');
const getPreimage = require('./get-preimage');
class ExternalPreimageService {
    constructor(protoPath, { ordersByHash, engines, logger }) {
        this.protoPath = protoPath;
        this.proto = loadProto(this.protoPath);
        this.definition = this.proto.extpreimage.ExternalPreimageService.service;
        this.serviceName = 'ExternalPreimageService';
        this.implementation = {
            getPreimage: new GrpcServerStreamingMethod(getPreimage, this.messageId('getPreimage'), { ordersByHash, logger, engines }).register()
        };
    }
    messageId(methodName) {
        return `[${this.serviceName}:${methodName}]`;
    }
}
module.exports = ExternalPreimageService;
//# sourceMappingURL=external-preimage-service.js.map
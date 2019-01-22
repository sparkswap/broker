const path = require('path');
const { expect, rewire, sinon } = require('test/test-helper');
const getPaymentChannelNetworkAddress = rewire(path.resolve(__dirname, 'get-payment-channel-network-address'));
describe('get-payment-channel-network-address', () => {
    let logger;
    let params;
    let engine;
    let engines;
    let getNetworkAddressStub;
    let getNetworkAddressResponse;
    let responseStub;
    before(() => {
        logger = {
            error: sinon.stub()
        };
        params = {
            symbol: 'BTC'
        };
        getNetworkAddressResponse = '12345';
        getNetworkAddressStub = sinon.stub().returns(getNetworkAddressResponse);
        responseStub = sinon.stub();
        engine = { getPaymentChannelNetworkAddress: getNetworkAddressStub };
        engines = new Map([['BTC', engine]]);
    });
    describe('getPaymentChannelNetworkAddress', () => {
        beforeEach(async () => {
            await getPaymentChannelNetworkAddress({ logger, engines, params }, { GetPaymentChannelNetworkAddressResponse: responseStub });
        });
        it('calls an engine with getPaymentChannelNetworkAddress', () => {
            expect(getNetworkAddressStub).to.have.been.called();
        });
        it('constructs a Response', () => {
            const paymentChannelNetworkAddress = getNetworkAddressResponse;
            expect(responseStub).to.have.been.calledWith({ paymentChannelNetworkAddress });
        });
    });
    describe('invalid engine type', () => {
        const badParams = { symbol: 'BAD' };
        it('throws an error', () => {
            return expect(getPaymentChannelNetworkAddress({ logger, engines, params: badParams }, { GetPaymentChannelNetworkAddressResponse: responseStub })).to.eventually.be.rejectedWith('Unable to get network address');
        });
    });
});
//# sourceMappingURL=get-payment-channel-network-address.spec.js.map
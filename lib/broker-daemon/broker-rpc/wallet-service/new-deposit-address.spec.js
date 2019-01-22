const path = require('path');
const { expect, rewire, sinon } = require('test/test-helper');
const newDepositAddress = rewire(path.resolve(__dirname, 'new-deposit-address'));
describe('new-deposit-address', () => {
    let logger;
    let params;
    let engine;
    let engines;
    let newAddressStub;
    let newAddressResponse;
    let responseStub;
    before(() => {
        logger = {
            error: sinon.stub()
        };
        params = {
            symbol: 'BTC'
        };
        newAddressResponse = '12345';
        newAddressStub = sinon.stub().returns(newAddressResponse);
        responseStub = sinon.stub();
        engine = { createNewAddress: newAddressStub };
        engines = new Map([['BTC', engine]]);
    });
    describe('newDepositAddress', () => {
        beforeEach(async () => {
            await newDepositAddress({ logger, engines, params }, { NewDepositAddressResponse: responseStub });
        });
        it('calls an engine with createNewAddress', () => {
            expect(newAddressStub).to.have.been.called();
        });
        it('constructs a NewAddressResponse', () => {
            const address = newAddressResponse;
            expect(responseStub).to.have.been.calledWith({ address });
        });
    });
    describe('invalid engine type', () => {
        const badParams = { symbol: 'BAD' };
        it('throws an error', () => {
            return expect(newDepositAddress({ logger, engines, params: badParams }, { NewDepositAddressResponse: responseStub })).to.eventually.be.rejectedWith('Unable to generate address');
        });
    });
});
//# sourceMappingURL=new-deposit-address.spec.js.map
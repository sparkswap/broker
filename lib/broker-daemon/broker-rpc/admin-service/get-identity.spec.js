const path = require('path');
const { sinon, rewire, expect } = require('test/test-helper');
const getIdentity = rewire(path.resolve(__dirname, 'get-identity'));
describe('get-identity', () => {
    describe('getIdentity', () => {
        let GetIdentityResponse;
        let relayerStub;
        let pubKey;
        let loggerStub;
        let result;
        beforeEach(() => {
            pubKey = 'fakekey';
            relayerStub = {
                identity: {
                    pubKey
                }
            };
            loggerStub = {
                info: sinon.stub(),
                debug: sinon.stub()
            };
            GetIdentityResponse = sinon.stub();
        });
        beforeEach(async () => {
            result = await getIdentity({ relayer: relayerStub, logger: loggerStub }, { GetIdentityResponse });
        });
        it('returns the public key', async () => {
            expect(result).to.be.an.instanceOf(GetIdentityResponse);
            expect(GetIdentityResponse).to.have.been.calledOnce();
            expect(GetIdentityResponse).to.have.been.calledWithNew();
            expect(GetIdentityResponse).to.have.been.calledWith(sinon.match({ publicKey: pubKey }));
        });
    });
});
//# sourceMappingURL=get-identity.spec.js.map
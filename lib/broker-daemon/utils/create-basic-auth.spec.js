const path = require('path');
const { expect, sinon, rewire } = require('test/test-helper');
const { PublicError } = require('grpc-methods');
const createBasicAuth = rewire(path.resolve(__dirname, 'create-basic-auth'));
const credentialGenerator = rewire(path.resolve(__dirname, '..', '..', 'broker-cli', 'utils', 'basic-auth'));
describe('createBasicAuth', () => {
    let logger;
    let credentialsToBasicAuth;
    let grpcAuthHandler;
    beforeEach(() => {
        logger = {
            debug: sinon.stub()
        };
        credentialsToBasicAuth = credentialGenerator.__get__('credentialsToBasicAuth');
    });
    it('does not error if auth is disabled', async () => {
        const disableAuth = true;
        const rpcUser = 'sparkswap';
        const rpcPass = 'sparkswap';
        const token = credentialsToBasicAuth(rpcUser, rpcPass);
        const metadata = { authorization: token };
        grpcAuthHandler = createBasicAuth(rpcUser, rpcPass, disableAuth);
        const res = await grpcAuthHandler({ metadata, logger });
        expect(res).to.be.undefined();
    });
    it('errors if no authorization token is available', () => {
        const metadata = {};
        const rpcUser = 'sparkswap';
        const rpcPass = 'sparkswap';
        grpcAuthHandler = createBasicAuth(rpcUser, rpcPass);
        return expect(grpcAuthHandler({ metadata, logger })).to.eventually.be.rejectedWith(PublicError);
    });
    it('does not error if credentials are verified', async () => {
        const rpcUser = 'sparkswap';
        const rpcPass = 'sparkswap';
        const disableAuth = true;
        const token = credentialsToBasicAuth(rpcUser, rpcPass);
        const metadata = { authorization: token };
        grpcAuthHandler = createBasicAuth(rpcUser, rpcPass, disableAuth);
        const res = await grpcAuthHandler({ metadata, logger });
        expect(res).to.be.undefined();
    });
    it('errors if username is incorrect', () => {
        const rpcUser = 'sparkswap';
        const rpcPass = 'sparkswap';
        const token = credentialsToBasicAuth(rpcUser, rpcPass);
        const metadata = { authorization: token };
        const badUser = 'sperkswap';
        grpcAuthHandler = createBasicAuth(badUser, rpcPass);
        return expect(grpcAuthHandler({ metadata, logger })).to.eventually.be.rejectedWith(PublicError);
    });
    it('errors if password is incorrect', () => {
        const rpcUser = 'sparkswap';
        const rpcPass = 'sparkswap';
        const token = credentialsToBasicAuth(rpcUser, rpcPass);
        const metadata = { authorization: token };
        const badPass = 'sperkswap';
        grpcAuthHandler = createBasicAuth(rpcUser, badPass);
        return expect(grpcAuthHandler({ metadata, logger })).to.eventually.be.rejectedWith(PublicError);
    });
    it('errors if username and password are incorrect', () => {
        const rpcUser = 'sparkswap';
        const rpcPass = 'sparkswap';
        const token = credentialsToBasicAuth(rpcUser, rpcPass);
        const metadata = { authorization: token };
        const badUser = 'sperkswap';
        const badPass = 'sperkswap';
        grpcAuthHandler = createBasicAuth(badUser, badPass);
        return expect(grpcAuthHandler({ metadata, logger })).to.eventually.be.rejectedWith(PublicError);
    });
});
//# sourceMappingURL=create-basic-auth.spec.js.map
const { PublicError } = require('grpc-methods');
const BASIC_AUTH_DELIMITER = ':';
function createBasicAuth(rpcUser, rpcPass, disableAuth = false) {
    return async ({ metadata, logger }) => {
        if (disableAuth === true)
            return;
        const { authorization: authToken } = metadata;
        if (!authToken) {
            logger.debug('Basic Authentication has failed. No auth token could be found');
            throw new PublicError('Basic Authentication Failed, please check your authorization credentials');
        }
        const [scheme, base64Token] = authToken.split(' ');
        logger.debug('Received auth token', { scheme, base64Token });
        const rawCredentials = Buffer.from(base64Token, 'base64').toString();
        const [username, password] = rawCredentials.split(BASIC_AUTH_DELIMITER);
        logger.debug('Checking if credentials are valid between cli and broker');
        if (username !== rpcUser || password !== rpcPass) {
            logger.debug('Basic Authentication has failed. Username/Password did not match');
            throw new PublicError('Basic Authentication Failed, please check your authorization credentials');
        }
    };
}
module.exports = createBasicAuth;
//# sourceMappingURL=create-basic-auth.js.map
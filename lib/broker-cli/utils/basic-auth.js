const grpc = require('grpc');
const BASIC_AUTH_PREFIX = 'Basic';
const BASIC_AUTH_DELIMITER = ':';
function credentialsToBasicAuth(username, password) {
    const encodedCredentials = Buffer.from(`${username}${BASIC_AUTH_DELIMITER}${password}`).toString('base64');
    return `${BASIC_AUTH_PREFIX} ${encodedCredentials}`;
}
function generateBasicAuthCredentials(username, password) {
    return grpc.credentials.createFromMetadataGenerator((_, callback) => {
        const metadata = new grpc.Metadata();
        metadata.set('Authorization', credentialsToBasicAuth(username, password));
        callback(null, metadata);
    });
}
module.exports = {
    generateBasicAuthCredentials
};
//# sourceMappingURL=basic-auth.js.map
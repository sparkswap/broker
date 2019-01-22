const crypto = require('crypto');
function generateId() {
    const id = Buffer.alloc(12);
    const timestamp = Math.floor(Date.now() / 1000);
    id.writeUInt32BE(timestamp);
    const rand = crypto.randomBytes(8);
    rand.copy(id, 4);
    return urlEncode(id.toString('base64'));
}
function urlEncode(base64Str) {
    return base64Str
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}
module.exports = generateId;
//# sourceMappingURL=generate-id.js.map
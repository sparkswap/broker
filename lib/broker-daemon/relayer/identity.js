const { readFileSync } = require('fs');
const { randomBytes, createSign } = require('crypto');
const { Metadata } = require('grpc');
const { nowInSeconds } = require('../utils');
const PUB_KEY_MARKERS = {
    START: '-----BEGIN PUBLIC KEY-----',
    END: '-----END PUBLIC KEY-----'
};
class Identity {
    constructor(privKeyPath, pubKeyPath) {
        this.privKeyPath = privKeyPath;
        this.pubKeyPath = pubKeyPath;
    }
    loadSync() {
        if (!this.privKeyPath) {
            throw new Error('Private Key path is required to load a Relayer Identity');
        }
        if (!this.pubKeyPath) {
            throw new Error('Public Key path is required to load a Relayer Identity');
        }
        this.privKey = readFileSync(this.privKeyPath, 'utf8');
        this.pubKey = readFileSync(this.pubKeyPath, 'utf8');
        this.pubKeyBase64 = pubKeyToBase64(this.pubKey);
    }
    identify() {
        const metadata = new Metadata();
        metadata.set('pubkey', this.pubKeyBase64);
        return metadata;
    }
    sign(data) {
        if (typeof this.privKey !== 'string' || !this.privKey) {
            throw new Error('Cannot create a signature without a private key.');
        }
        const sign = createSign('sha256');
        sign.update(data);
        return sign.sign(this.privKey, 'base64');
    }
    authorize(id) {
        const timestamp = nowInSeconds().toString();
        const nonce = randomBytes(32).toString('base64');
        const payload = [timestamp, nonce, id].join(',');
        const signature = this.sign(payload);
        return {
            timestamp,
            nonce,
            signature
        };
    }
}
Identity.load = function (privKeyPath, pubKeyPath) {
    const id = new this(privKeyPath, pubKeyPath);
    id.loadSync();
    return id;
};
function pubKeyToBase64(fileContents) {
    if (!fileContents) {
        throw new Error('Public Key is empty. Check that you have specified the correct cert path');
    }
    const strippedContents = fileContents.replace(/\r?\n|\r/g, '');
    if (!strippedContents.startsWith(PUB_KEY_MARKERS.START) || !strippedContents.endsWith(PUB_KEY_MARKERS.END)) {
        throw new Error('Public Key should be in PEM printable format');
    }
    return strippedContents.substring(PUB_KEY_MARKERS.START.length, strippedContents.length - PUB_KEY_MARKERS.END.length);
}
module.exports = Identity;
//# sourceMappingURL=identity.js.map
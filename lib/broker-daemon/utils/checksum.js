const { createHash } = require('crypto');
const SHA256_BYTE_SIZE = 32;
function sha256(value) {
    return createHash('sha256').update(value).digest();
}
function xor(a, b) {
    const length = Math.max(a.length, b.length);
    const buffer = Buffer.allocUnsafe(length);
    for (var i = 0; i < length; ++i) {
        buffer[i] = a[i] ^ b[i];
    }
    return buffer;
}
class Checksum {
    constructor() {
        this.sum = Buffer.alloc(SHA256_BYTE_SIZE);
    }
    matches(sum) {
        if (!Buffer.isBuffer(sum)) {
            throw new Error(`Checksums can only be matched against Buffers`);
        }
        if (sum.length !== SHA256_BYTE_SIZE) {
            throw new Error(`Checksums can only be matched against Buffers of length ${SHA256_BYTE_SIZE}`);
        }
        return this.sum.equals(sum);
    }
    process(value) {
        this.sum = xor(this.sum, sha256(value));
        return this;
    }
}
module.exports = Checksum;
//# sourceMappingURL=checksum.js.map
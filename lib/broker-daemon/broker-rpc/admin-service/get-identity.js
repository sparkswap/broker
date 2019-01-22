async function getIdentity({ relayer, logger }, { GetIdentityResponse }) {
    const publicKey = relayer.identity.pubKey;
    return new GetIdentityResponse({ publicKey });
}
module.exports = getIdentity;
//# sourceMappingURL=get-identity.js.map
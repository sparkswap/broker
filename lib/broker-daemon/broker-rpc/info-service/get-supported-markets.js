async function getSupportedMarkets({ params, relayer, logger, engines, orderbooks }, { GetSupportedMarketsResponse }) {
    const { markets } = await relayer.infoService.getMarkets({});
    const supportedMarkets = markets.reduce((acc, market) => {
        if (!orderbooks.get(market))
            return acc;
        const [base, counter] = market.split('/');
        const marketInfo = {
            id: market,
            symbol: market,
            base,
            counter,
            active: true
        };
        acc.push(marketInfo);
        return acc;
    }, []);
    return new GetSupportedMarketsResponse({ supportedMarkets });
}
module.exports = getSupportedMarkets;
//# sourceMappingURL=get-supported-markets.js.map
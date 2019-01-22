const STATUS_CODES = Object.freeze({
    UNAVAILABLE: 'UNAVAILABLE',
    OK: 'OK',
    NOT_SYNCED: 'NOT_SYNCED'
});
async function getRelayerStatus(relayer, { logger }) {
    try {
        await relayer.healthService.check({});
        return STATUS_CODES.OK;
    }
    catch (e) {
        logger.error(`Relayer error during status check: `, { error: e.stack });
        return STATUS_CODES.UNAVAILABLE;
    }
}
async function healthCheck({ relayer, logger, engines, orderbooks }, { HealthCheckResponse }) {
    const engineStatus = Array.from(engines).map(([symbol, engine]) => {
        return { symbol, status: engine.status };
    });
    logger.debug(`Received status from engines`, { engineStatus });
    const relayerStatus = await getRelayerStatus(relayer, { logger });
    logger.debug(`Received status from relayer`, { relayerStatus });
    const orderbookStatus = Array.from(orderbooks).map(([market, orderbook]) => {
        const status = orderbook.synced ? STATUS_CODES.OK : STATUS_CODES.NOT_SYNCED;
        return { market, status };
    });
    logger.debug(`Received status from orderbooks`, { orderbookStatus });
    return new HealthCheckResponse({ engineStatus, relayerStatus, orderbookStatus });
}
module.exports = healthCheck;
//# sourceMappingURL=health-check.js.map
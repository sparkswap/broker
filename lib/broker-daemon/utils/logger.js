const winston = require('winston');
const SENSITIVE_PROP_LIST = Object.freeze([
    'username',
    'pass',
    'password',
    'passphrase',
    'recoverySeed'
]);
const SENSITIVE_REPLACEMENT = '***FILTERED***';
function createLogger() {
    const filterSensitive = winston.format((info) => {
        const updatedInfo = Object.assign({}, info);
        Object.entries(updatedInfo).forEach(([key, value]) => {
            if (SENSITIVE_PROP_LIST.includes(key)) {
                updatedInfo[key] = SENSITIVE_REPLACEMENT;
            }
        });
        return updatedInfo;
    });
    const logger = winston.createLogger({
        level: (process.env.NODE_ENV === 'production') ? 'info' : 'debug',
        format: winston.format.combine(filterSensitive(), winston.format.timestamp(), winston.format.json()),
        json: true,
        humanReadableUnhandledException: true,
        handleExceptions: true
    });
    if (process.env.NODE_ENV !== 'production') {
        logger.add(new winston.transports.Console({
            format: winston.format.combine(filterSensitive(), winston.format.timestamp(), winston.format.colorize(), winston.format.simple())
        }));
    }
    return logger;
}
const logger = createLogger();
logger._createLogger = createLogger;
module.exports = logger;
//# sourceMappingURL=logger.js.map
const logger = require('./logger');
const delay = require('./delay');
const DELAY_MULTIPLIER = 1.5;
const EXPONENTIAL_BACKOFF_ATTEMPTS = 24;
const EXPONENTIAL_BACKOFF_DELAY = 5000;
async function exponentialBackoff(callFunction, attempts = EXPONENTIAL_BACKOFF_ATTEMPTS, delayTime = EXPONENTIAL_BACKOFF_DELAY, logOptions = {}) {
    try {
        var res = await callFunction();
    }
    catch (error) {
        if (attempts > 0) {
            const attemptsLeft = attempts - 1;
            logger.error(`Error calling ${callFunction}. Retrying in ${delayTime / 1000} seconds, attempts left: ${attemptsLeft}`, logOptions);
            await delay(delayTime);
            res = await exponentialBackoff(callFunction, attemptsLeft, delayTime * DELAY_MULTIPLIER, logOptions);
        }
        else {
            throw new Error(error, `Error with ${callFunction}, no retry attempts left`);
        }
    }
    return res;
}
module.exports = exponentialBackoff;
//# sourceMappingURL=exponential-backoff.js.map
const nano = require('nano-seconds');
function nanoToDatetime(nanoseconds) {
    const timeMilliseconds = nanoseconds.substring(0, nanoseconds.length - 9);
    const timeNanoseconds = nanoseconds.substring(nanoseconds.length - 9, nanoseconds.length);
    const formattedDate = [timeMilliseconds, timeNanoseconds];
    const datetime = nano.toISOString(formattedDate);
    return datetime;
}
module.exports = nanoToDatetime;
//# sourceMappingURL=nano-to-datetime.js.map
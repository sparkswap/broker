const MILLISECONDS_INDEX = 9;
function nanoTimestampToNanoType(timestamp) {
    return [
        timestamp.substring(0, timestamp.length - MILLISECONDS_INDEX),
        timestamp.substring(timestamp.length - MILLISECONDS_INDEX, timestamp.length)
    ];
}
module.exports = nanoTimestampToNanoType;
//# sourceMappingURL=timestamp-to-nano.js.map
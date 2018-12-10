/**
 * Default transform function which is a no-op
 * @param  {Function} logFn function to call to log output
 * @param  {...mixed} args  Arguments called on the log function
 * @return {mixed}
 */
const passThrough = (logFn, ...args) => {
  return logFn(...args)
}

/**
 * Array of functions that we want to transform on a logger object
 * @constant
 * @type {Array}
 */
const logFns = [
  'info',
  'debug',
  'warn',
  'log',
  'error'
]

/**
 * Transform a logger object by applying a function to every input.
 * @param  {Logger}   logger    Logger object to transform, e.g. `console`
 * @param  {Function} transform Function to apply to every input of the logger
 * @return {Logger}             New logger with the transform function applied
 */
function transformLogger (logger, transform = passThrough) {
  // copy over every log function to a new object that keeps the
  // original context of the logger, skipping unavailable functions
  const boundLogger = logFns.reduce((obj, fnName) => {
    if (logger[fnName]) {
      obj[fnName] = logger[fnName].bind(logger)
    }
    return obj
  }, {})

  // map the `boundLogger` into an identical object with each
  // function passing through the `transform` function
  return Object.entries(boundLogger).map(([key, fn]) => {
    return [key, (...args) => transform(fn, ...args)]
  }).reduce((obj, [key, transformedFn]) => {
    obj[key] = transformedFn
    return obj
  }, {})
}

module.exports = transformLogger

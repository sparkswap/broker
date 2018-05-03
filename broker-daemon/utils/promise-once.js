/**
 * Given an emitter and an event, will resolve the promise the first
 * time the event is emitted
 *
 * @param {Object} emitter
 * @param {String} event
 */
function promiseOnce (emitter, event) {
  return new Promise((resolve) => {
    emitter.once(event, resolve)
  })
}

module.exports = promiseOnce

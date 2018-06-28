
/**
 * Gets a preimage from another chain by making a payment if the
 * inbound preimage meets its criteria.
 *
 * CURRENTLY UNIMPLEMENTED
 *
 * @param  {Object}   request.params   Parameters of the request
 * @param  {Function} request.send     Send responses back to the client
 * @param  {Function} request.onCancel Handle cancellations of the stream by the client
 * @param  {Function} request.onError  Handle errors in the stream with the client
 * @param  {Object}   request.logger
 * @return {String}   base64 encoded string of the preimage
 * @throws {Error} If it is called, as the method is currently unimplemented
 */
async function getPreimage ({ params, send, onCancel, onError, logger }) {
  throw new Error('getPreimage is unimplemented')
}

module.exports = getPreimage

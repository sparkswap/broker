/**
 * Makes a call to the broker daemon to create a block order
 *
 * @function
 * @param {Object} params
 * @returns {Promise}
 */
async function createBlockOrder (params) {
  // TODO: Add a duration for gRPC
  // TODO: Be more specific about params passed into function
  // TODO: logging
  return new Promise((resolve, reject) => {
    this.orderService.createBlockOrder(params, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

/**
 * Retrieve information about an existing block order
 *
 * @param  {Object} params
 * @return {Object}
 */
async function getBlockOrder (params) {
  return new Promise((resolve, reject) => {
    this.orderService.getBlockOrder(params, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

module.exports = {
  createBlockOrder,
  getBlockOrder
}

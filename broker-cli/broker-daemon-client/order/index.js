/**
 * Makes a call to the broker daemon to create an order
 *
 * @function
 * @param {Object} params
 * @returns {Promise}
 */
async function createOrder (params) {
  // TODO: Add a duration for gRPC
  // TODO: Be more specific about params passed into function
  // TODO: logging
  return new Promise((resolve, reject) => {
    this.order.createOrder(params, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

module.exports = {
  createOrder
}

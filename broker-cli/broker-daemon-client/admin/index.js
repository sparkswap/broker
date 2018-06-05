/**
 * Calls a healthcheck endpoint on the broker to determine connectivity
 *
 * @function
 * @return {Promise}
 */
function healthCheck () {
  return new Promise((resolve, reject) => {
    // TODO: logging
    this.adminService.healthCheck({}, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

/**
 * Calls setup on the daemon
 *
 * @function
 * @param {String} address - host address of relayer
 * @return {Promise}
 */
function setup (amount, symbol) {
  return new Promise((resolve, reject) => {
    this.adminService.setup({ amount, symbol }, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

module.exports = {
  healthCheck,
  setup
}

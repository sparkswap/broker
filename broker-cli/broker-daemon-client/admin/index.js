/**
 * Calls a healthcheck endpoint on the broker to determine connectivity
 *
 * @function
 * @return {Promise}
 */
async function healthCheck () {
  return new Promise((resolve, reject) => {
    // TODO: logging
    this.adminService.healthCheck({}, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

module.exports = {
  healthCheck
}

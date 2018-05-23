function newDepositAddress () {
  return new Promise((resolve, reject) => {
    this.walletService.newDepositAddress({}, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

function walletBalance () {
  return new Promise((resolve, reject) => {
    this.walletService.getBalance({}, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

module.exports = {
  newDepositAddress,
  walletBalance
}

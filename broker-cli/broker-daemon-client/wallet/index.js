function newDepositAddress () {
  return new Promise((resolve, reject) => {
    this.wallet.newDepositAddress({}, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

module.exports = {
  newDepositAddress
}

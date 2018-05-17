function newWalletAddress () {
  return new Promise((resolve, reject) => {
    this.wallet.newWalletAddress({}, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

module.exports = {
  newWalletAddress
}

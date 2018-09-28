class BlockOrderError extends Error {
  constructor (message, err) {
    if (!message) throw new Error('No message provided for BlockOrderError')
    super(message)

    this.name = this.constructor.name

    if (err) this.stack = err.stack
  }
}

module.exports = {
  BlockOrderError
}

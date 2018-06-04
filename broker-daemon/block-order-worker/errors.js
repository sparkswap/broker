class BlockOrderError extends Error {
  constructor (message, err) {
    if (!message) throw new Error('No message provided for BlockOrderError')
    super(message)

    this.name = this.constructor.name

    if (err) this.stack = err.stack
  }
}

class BlockOrderNotFoundError extends BlockOrderError {
  constructor (id, err) {
    super(`Block Order with ID ${id} was not found.`, err)

    this.notFound = true
  }
}

module.exports = {
  BlockOrderError,
  BlockOrderNotFoundError
}

/**
 * Custom error for BlockOrder model
 */
class BlockOrderNotFoundError extends Error {
  /**
   * @param {string} id - a blockorder id
   * @param {Error} err
   */
  constructor (id, err) {
    super(`Block Order with ID ${id} was not found: ` + err.toString())

    this.name = this.constructor.name
    this.notFound = true

    if (err) this.stack = err.stack
  }
}

module.exports = BlockOrderNotFoundError

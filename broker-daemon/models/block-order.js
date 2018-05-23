const bigInt = require('big-integer')

class BlockOrder {
  constructor({ id, marketName, side, amount, price, timeInForce }) {
    this.id = id
    this.marketName = marketName
    this.side = side
    this.amount = bigInt(amount)
    this.price = price ? bigInt(price) : null
    this.timeInForce = timeInForce
  }

  get key() {
    return this.id
  }

  get value() {
    const { marketName, side, amount, price, timeInForce } = this

    return JSON.stringify({
      marketName,
      side,
      amount: amount.toString(),
      price: price ? price.toString() : null,
      timeInForce
    })
  }

  static fromStorage(key, value) {
    const { marketName, side, amount, price, timeInForce } = JSON.parse(value)
    const id = key

    return new this({ id, marketName, side, amount, price, timeInForce })
  }
}

module.exports = BlockOrder

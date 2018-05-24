const bigInt = require('big-integer')

class BlockOrder {
  constructor ({ id, marketName, side, amount, price, timeInForce, status }) {
    this.id = id
    this.marketName = marketName
    this.side = side
    this.amount = bigInt(amount)
    this.price = price ? bigInt(price) : null
    this.timeInForce = timeInForce

    if (!BlockOrder.STATUSES[status]) {
      throw new Error(`Block Order status of ${status} is invalid`)
    }

    this.status = status
  }

  get key () {
    return this.id
  }

  get value () {
    const { marketName, side, amount, price, timeInForce, status } = this

    return JSON.stringify({
      marketName,
      side,
      amount: amount.toString(),
      price: price ? price.toString() : null,
      timeInForce,
      status
    })
  }

  serialize () {
    return {
      market: this.marketName,
      side: this.side,
      amount: this.amount.toString(),
      price: this.price ? this.price.toString() : null,
      timeInForce: this.timeInForce,
      status: this.status
    }
  }

  static fromStorage (key, value) {
    const { marketName, side, amount, price, timeInForce, status } = JSON.parse(value)
    const id = key

    return new this({ id, marketName, side, amount, price, timeInForce, status })
  }
}

BlockOrder.STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED'
})

module.exports = BlockOrder

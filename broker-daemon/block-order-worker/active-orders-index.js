const { OrderStateMachine } = require('../state-machines')
const { SubsetStore } = require('../utils')

/**
 * @class Index of of our own orders currently in an active state
 */
class ActiveOrdersIndex extends SubsetStore {
  /**
   * Create a new index of a subset of only active orders
   * @param {sublevel} store - Store of orders to create an active subset of
   */
  constructor (store) {
    super(store.sublevel('activeOrders'), store)
  }

  /**
   * Create an object that can be passed to Sublevel to create or remove a record
   * @param {string} key   - Key of the record to create an index op for
   * @param {string} value - Value of the record being added to the events store to create an index op for
   * @returns {Object} object for create/delete for use with sublevel
   */
  addToIndexOperation (key, value) {
    const { state } = JSON.parse(value)

    if (Object.values(OrderStateMachine.ACTIVE_STATES).includes(state)) {
      return { key, value, type: 'put', prefix: this.store }
    }

    return { key, type: 'del', prefix: this.store }
  }
}

module.exports = ActiveOrdersIndex

/**
 * @author kinesis
 */

const TIME_IN_FORCE = Object.freeze({
  PO: 'PO',
  FOK: 'FOK',
  IOC: 'IOC',
  GTC: 'GTC'
})

const ORDER_TYPES = Object.freeze({
  BID: 'BID',
  SELL: 'SELL'
})

const STATUS_CODES = Object.freeze({
  OK: 'OK'
})

module.exports = {
  TIME_IN_FORCE,
  ORDER_TYPES,
  STATUS_CODES
}

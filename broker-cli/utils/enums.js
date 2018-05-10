/**
 * @author kinesis
 */

const TIME_IN_FORCE = Object.freeze({
  PO: 'post-only',
  FOK: 'fill-or-kill',
  IOC: 'immediate-or-cancel',
  GTC: 'good-til-cancel'
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

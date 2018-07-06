const { expect } = require('test/test-helper')
const { Big } = require('../utils')

const convertBalance = require('./convert-balance')

describe('convertBalance', () => {
  let balance
  let currency
  let currencyToConvertTo

  beforeEach(() => {
    balance = Big(1)
    currency = 'BTC'
    currencyToConvertTo = 'LTC'
  })

  it('returns the converted balance', () => {
    const res = convertBalance(balance, currency, currencyToConvertTo)
    expect(res).to.eql(Big(79.612))
  })

  it('throws an error if the market conversion is not defined', () => {
    currency = 'XYZ'
    const error = `Market XYZ/LTC is not currently supported`
    expect(() => convertBalance(balance, currency, currencyToConvertTo)).to.throw(error)
  })
})

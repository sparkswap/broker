const { expect } = require('test/test-helper')

const convertBalance = require('./convert-balance')

describe('convertBalance', () => {
  let balance
  let firstCurrency
  let secondCurrency

  beforeEach(() => {
    balance = '1'
    firstCurrency = 'BTC'
    secondCurrency = 'LTC'
  })

  it('returns the converted balance if the original balance is in the base currency', () => {
    const res = convertBalance(balance, firstCurrency, secondCurrency)
    expect(res).to.eql('79.612')
  })

  it('returns the converted balance if the original balance is in the counter currency', () => {
    const res = convertBalance(balance, secondCurrency, firstCurrency)
    expect(res).to.eql('0.012560920464251621')
  })

  it('throws an error if the market conversion is not defined', () => {
    firstCurrency = 'XYZ'
    const error = `Market XYZ/LTC is not currently supported`
    expect(() => convertBalance(balance, firstCurrency, secondCurrency)).to.throw(error)
  })
})

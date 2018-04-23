const { chai } = require('test/test-helper.spec')
const { expect } = chai

const {
  isPrice,
  isMarketName,
  isRPCHost
} = require('./validations')

describe('Validations', () => {
  describe('isPrice', () => {
    it('returns true for a valid price', () => {
      const validPrice = '100'
      expect(isPrice(validPrice)).to.be.true()
    })

    it('returns false if a price is too large (over 99999)', () => {
      const invalidPrice = '100000'
      expect(isPrice(invalidPrice)).to.be.false()
    })

    it('returns false for an incorrect string', () => {
      const invalidPrice = 'banana'
      expect(isPrice(invalidPrice)).to.be.false()
    })
  })

  describe('isMarketName', () => {
    it('returns true if market name is valid', () => {
      const validMarket = 'BTC/LTC'
      expect(isMarketName(validMarket)).to.be.true()
    })

    it('returns false if base market is not a letter', () => {
      const invalidMarket = '10/LTC'
      expect(isMarketName(invalidMarket)).to.be.false()
    })

    it('returns false if base market is too long', () => {
      const invalidMarket = 'BTCCCCCCC/LTC'
      expect(isMarketName(invalidMarket)).to.be.false()
    })

    it('returns false if base market is too short', () => {
      const invalidMarket = 'B/LTC'
      expect(isMarketName(invalidMarket)).to.be.false()
    })

    it('returns false if counter market is not a string', () => {
      const invalidMarket = 'BTC/10'
      expect(isMarketName(invalidMarket)).to.be.false()
    })

    it('returns false if counter market is too long', () => {
      const invalidMarket = 'BTC/LTCCCCC'
      expect(isMarketName(invalidMarket)).to.be.false()
    })

    it('returns false if counter market is too short', () => {
      const invalidMarket = 'BTC/L'
      expect(isMarketName(invalidMarket)).to.be.false()
    })

    it('returns false if marketName cannot be parsed', () => {
      const invalidMarket = 10
      expect(isMarketName(invalidMarket)).to.be.false()
    })
  })

  describe('isRPCHost', () => {
    it('returns true for a valid container name', () => {
      const validHost = 'kinesis:10009'
      expect(isRPCHost(validHost)).to.be.true()
    })

    it('returns true for localhost', () => {
      const validHost = 'localhost:10009'
      expect(isRPCHost(validHost)).to.be.true()
    })

    it('returns true for valid url', () => {
      const validHost = 'http://test.exchange.kines.is'
      expect(isRPCHost(validHost)).to.be.true()
    })

    it('returns false when host is invalid', () => {
      const invalidHost = 'bad url'
      expect(isRPCHost(invalidHost)).to.be.false()
    })
  })
})

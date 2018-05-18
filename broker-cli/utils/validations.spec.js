const { expect } = require('test/test-helper')

const {
  isPrice,
  isMarketName,
  isHost,
  areValidMarketNames,
  isFormattedPath
} = require('./validations')

describe('Validations', () => {
  describe('isPrice', () => {
    const expectedError = 'Invalid Price Format'

    it('returns a valid price', () => {
      const validPrice = '100'
      expect(isPrice(validPrice)).to.eql(validPrice)
    })

    it('throws an error if a price is too large (over 99999)', () => {
      const invalidPrice = '100000'
      expect(() => isPrice(invalidPrice)).to.throw(expectedError)
    })

    it('throws an error for an incorrect string', () => {
      const invalidPrice = 'banana'
      expect(() => isPrice(invalidPrice)).to.throw(expectedError)
    })
  })

  describe('isMarketName', () => {
    const expectedError = 'Market Name format is incorrect'

    it('returns a market name if market name is valid', () => {
      const validMarket = 'BTC/LTC'
      expect(isMarketName(validMarket)).to.eql(validMarket)
    })

    it('throws an error if base market is not a letter', () => {
      const invalidMarket = '10/LTC'
      expect(() => isMarketName(invalidMarket)).to.throw(expectedError)
    })

    it('throws an error if base market is too long', () => {
      const invalidMarket = 'BTCCCCCCC/LTC'
      expect(() => isMarketName(invalidMarket)).to.throw(expectedError)
    })

    it('throws an error if base market is too short', () => {
      const invalidMarket = 'B/LTC'
      expect(() => isMarketName(invalidMarket)).to.throw(expectedError)
    })

    it('throws an error if counter market is not a string', () => {
      const invalidMarket = 'BTC/10'
      expect(() => isMarketName(invalidMarket)).to.throw(expectedError)
    })

    it('throws an error if counter market is too long', () => {
      const invalidMarket = 'BTC/LTCCCCC'
      expect(() => isMarketName(invalidMarket)).to.throw(expectedError)
    })

    it('throws an error if counter market is too short', () => {
      const invalidMarket = 'BTC/L'
      expect(() => isMarketName(invalidMarket)).to.throw(expectedError)
    })

    it('throws an error if marketName cannot be parsed', () => {
      const invalidMarket = 10
      expect(() => isMarketName(invalidMarket)).to.throw(expectedError)
    })
  })

  describe('isHost', () => {
    const expectedError = 'Invalid Host name'

    it('returns a valid container name host', () => {
      const validHost = 'kinesis:10009'
      expect(isHost(validHost)).to.eql(validHost)
    })

    it('returns a valid localhost host', () => {
      const validHost = 'localhost:10009'
      expect(isHost(validHost)).to.eql(validHost)
    })

    it('returns a valid url host', () => {
      const validHost = 'http://test.exchange.kines.is'
      expect(isHost(validHost)).to.eql(validHost)
    })

    it('throws an error when host is invalid', () => {
      const invalidHost = 'bad url'
      expect(() => isHost(invalidHost)).to.throw(expectedError)
    })
  })

  describe('areValidMarketNames', () => {
    const expectedError = 'One or more market names is invalid'

    it('returns comma separated market names if all market names are valid', () => {
      const marketNames = 'BTC/LTC,BTC/ETH'
      expect(areValidMarketNames(marketNames)).to.eql(marketNames)
    })

    it('throws an error if marketnames are not comma separated', () => {
      const invalidMarketNames = 'BTC/LTC BTC/ETH'
      expect(() => areValidMarketNames(invalidMarketNames)).to.throw(expectedError)
    })

    it('returns empty string if empty string is passed in', () => {
      const marketNames = ''
      expect(areValidMarketNames(marketNames)).to.eql(marketNames)
    })
  })

  describe('isPath', () => {
    const expectedError = 'Path format is incorrect'

    it('returns directory path if path is valid', () => {
      const path = '/home/myfolder'
      expect(isFormattedPath(path)).to.eql(path)
    })

    it('throws an error if given path does not have correct format', () => {
      const path = '/home/myfolder/\n'
      expect(() => isFormattedPath(path)).to.throw(expectedError)
    })
  })
})

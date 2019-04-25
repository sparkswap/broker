const { expect } = require('test/test-helper')

const {
  isDecimal,
  isMarketName,
  isHost,
  areValidMarketNames,
  isFormattedPath,
  isBlockOrderId,
  isDate,
  isBlockchainNetwork
} = require('./validations')

describe('Validations', () => {
  describe('isDecimal', () => {
    const expectedError = 'Invalid decimal format'

    it('returns a valid price', () => {
      const validPrice = '100'
      expect(isDecimal(validPrice)).to.eql(validPrice)
    })

    it('allows decimal prices', () => {
      const validPrice = '100.8789'
      expect(isDecimal(validPrice)).to.eql(validPrice)
    })

    it('throws if the price is greater than max value', () => {
      const invalidPrice = '9223372036854775808'
      expect(() => isDecimal(invalidPrice)).to.throw(expectedError)
    })

    it('throws an error for an incorrect string', () => {
      const invalidPrice = 'banana'
      expect(() => isDecimal(invalidPrice)).to.throw(expectedError)
    })
  })

  describe('isMarketName', () => {
    const expectedError = 'Market Name should be specified with \'--market <marketName>\', where <marketName> is the base and counter symbols separated by a \'/\' e.g. \'BTC/LTC\''

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
    it('returns a valid container name host', () => {
      const validHost = 'sparkswap:10009'
      expect(isHost(validHost)).to.eql(validHost)
    })

    it('returns a valid localhost host', () => {
      const validHost = 'localhost:10009'
      expect(isHost(validHost)).to.eql(validHost)
    })

    it('returns a valid local container host', () => {
      const validHost = 'lnd_btc:10009'
      expect(isHost(validHost)).to.eql(validHost)
    })

    it('returns a valid url host', () => {
      const validHost = 'http://test.exchange.kines.is'
      expect(isHost(validHost)).to.eql(validHost)
    })

    it('throws an error when host is invalid', () => {
      const invalidHost = 'bad url'
      expect(() => isHost(invalidHost)).to.throw()
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

  describe('isBlockOrderId', () => {
    const expectedError = 'Block order IDs only contain upper and lower case letters, numbers, dashes (-) and underscores (_).'

    it('returns id if it is valid', () => {
      const id = 'Cl9vzL7xhzsAHqVnEU0s1X2ClMffWcPSMR85mwb7'
      expect(isBlockOrderId(id)).to.eql(id)
    })

    it('throws an error if the id contains bad characters', () => {
      const id = '$:Cl9vzL7xhzsAHqVnEU0s1X2ClMffWcPSMR85mwb7'
      expect(() => isBlockOrderId(id)).to.throw(expectedError)
    })

    it('throws an error if the id is falsey', () => {
      const id = ''
      expect(() => isBlockOrderId(id)).to.throw(expectedError)
    })
  })

  describe('isDate', () => {
    const expectedError = 'Given datetime is not in a valid date format'

    it('returns the date string if the string can be parsed to a valid date', () => {
      const date = '2018-09-25T13:10:53.023Z'
      expect(isDate(date)).to.eql(date)
    })

    it('throws an error if the string can be parsed to a valid date', () => {
      const date = '2018-09-T13:10:53.0233343Z'
      expect(() => isDate(date)).to.throw(expectedError)
    })
  })

  describe('isBlockchainNetwork', () => {
    it('returns the network if it is valid', () => {
      const network = 'mainnet'
      expect(isBlockchainNetwork(network)).to.eql(network)
    })

    it('throws an error if the string can be parsed to a valid date', () => {
      expect(() => isBlockchainNetwork('badnetwork')).to.throw('Invalid blockchain network')
    })
  })
})

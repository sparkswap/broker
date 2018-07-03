const path = require('path')
const { expect, rewire } = require('test/test-helper')

const getPreimage = rewire(path.resolve(__dirname, 'get-preimage'))

describe('getPreimage', () => {
  let params

  beforeEach(() => {
    params = {
      paymentHash: 'as09fdjasdf09ja0dsf==',
      amount: '1000000',
      symbol: 'BTC',
      timeLock: '1000000',
      bestHeight: '900000'
    }
  })

  it('throws an Error', () => {
    return expect(getPreimage({ params })).to.eventually.be.rejectedWith(Error)
  })
})

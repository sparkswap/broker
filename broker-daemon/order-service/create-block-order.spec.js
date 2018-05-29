const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const createBlockOrder = rewire(path.resolve(__dirname, 'create-block-order'))

describe('createBlockOrder', () => {
  let PublicError
  let CreateBlockOrderResponse
  let blockOrderWorker
  let TimeInForce

  beforeEach(() => {
    PublicError = sinon.stub()

    createBlockOrder.__set__('PublicError', PublicError)

    CreateBlockOrderResponse = sinon.stub()
    TimeInForce = {
      GTC: 1
    }
    blockOrderWorker = {
      createBlockOrder: sinon.stub()
    }
  })

  xit('throws if trying to create a market order')

  xit('throws if trying to use a time in force other than GTC')

  xit('creates a block order on the BlockOrderWorker')

  xit('returns the block order id')
})
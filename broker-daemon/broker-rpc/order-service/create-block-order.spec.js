const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const createBlockOrder = rewire(path.resolve(__dirname, 'create-block-order'))

describe('createBlockOrder', () => {
  let CreateBlockOrderResponse
  let blockOrderWorker
  let TimeInForce
  let CONFIG
  let revert

  beforeEach(() => {
    CreateBlockOrderResponse = sinon.stub()
    TimeInForce = {
      GTC: 1,
      PO: 3
    }
    blockOrderWorker = {
      createBlockOrder: sinon.stub().resolves('fakeId')
    }

    CONFIG = {
      currencies: [
        {
          symbol: 'BTC',
          quantumsPerCommon: '100000000'
        },
        {
          symbol: 'XYZ',
          quantumsPerCommon: '10000'
        }
      ]
    }

    revert = createBlockOrder.__set__('CONFIG', CONFIG)
  })

  afterEach(() => {
    revert()
  })

  it('throws if trying to use a time in force other than GTC or PO', () => {
    const params = {
      limitPrice: '1000.678',
      timeInForce: 'FOK'
    }
    return expect(createBlockOrder({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce })).to.be.rejectedWith('Only Good-til-cancelled and Post Only limit orders are currently supported.')
  })

  it('creates a block order on the BlockOrderWorker', async () => {
    const params = {
      amount: '100',
      limitPrice: '1000.678',
      market: 'XYZ/ABC',
      side: 'BID',
      timeInForce: 'GTC'
    }
    await createBlockOrder({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce })

    expect(blockOrderWorker.createBlockOrder).to.have.been.calledOnce()
    expect(blockOrderWorker.createBlockOrder).to.have.been.calledWith({ marketName: 'XYZ/ABC', side: 'BID', amount: '100', price: '1000.678', timeInForce: 'GTC' })
  })

  it('creates a market priced block order', async () => {
    const params = {
      amount: '100',
      market: 'XYZ/ABC',
      isMarketOrder: true,
      side: 'BID',
      timeInForce: 'GTC'
    }
    await createBlockOrder({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce })

    expect(blockOrderWorker.createBlockOrder).to.have.been.calledOnce()
    expect(blockOrderWorker.createBlockOrder).to.have.been.calledWith({ marketName: 'XYZ/ABC', price: null, side: 'BID', amount: '100', timeInForce: 'GTC' })
  })

  it('returns a block order response', async () => {
    const params = {
      amount: '100',
      limitPrice: '1000.678',
      market: 'XYZ/ABC',
      side: 'BID',
      timeInForce: 'GTC'
    }
    const response = await createBlockOrder({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce })

    expect(CreateBlockOrderResponse).to.have.been.calledOnce()
    expect(CreateBlockOrderResponse).to.have.been.calledWithNew()
    expect(response).to.be.instanceOf(CreateBlockOrderResponse)
  })

  it('returns the block order id', async () => {
    const fakeOrderId = 'fakeId'
    blockOrderWorker.createBlockOrder.resolves(fakeOrderId)

    const params = {
      amount: '100',
      limitPrice: '1000.678',
      market: 'XYZ/ABC',
      side: 'BID',
      timeInForce: 'GTC'
    }
    await createBlockOrder({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce })

    expect(CreateBlockOrderResponse).to.have.been.calledOnce()
    expect(CreateBlockOrderResponse).to.have.been.calledWith({ blockOrderId: fakeOrderId })
  })
})

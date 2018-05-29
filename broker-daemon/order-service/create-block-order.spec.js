const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const createBlockOrder = rewire(path.resolve(__dirname, 'create-block-order'))

describe.only('createBlockOrder', () => {
  let PublicError
  let CreateBlockOrderResponse
  let blockOrderWorker
  let TimeInForce

  beforeEach(() => {
    PublicError = createBlockOrder.__get__('PublicError')

    CreateBlockOrderResponse = sinon.stub()
    TimeInForce = {
      GTC: 1
    }
    blockOrderWorker = {
      createBlockOrder: sinon.stub().resolves('fakeId')
    }
  })

  it('throws if trying to create a market order', () => {
    return expect(createBlockOrder({ params: {}, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce })).to.be.rejectedWith(PublicError)
  })

  it('throws if trying to use a time in force other than GTC', () => {
    const params = {
      price: '100',
      timeInForce: 'FOK'
    }
    return expect(createBlockOrder({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce })).to.be.rejectedWith(PublicError)
  })

  it('creates a block order on the BlockOrderWorker', async () => {
    const params = {
      amount: '100',
      price: '1000',
      market: 'XYZ/ABC',
      side: 'BID',
      timeInForce: 'GTC'
    }
    const response = await createBlockOrder({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce })

    expect(blockOrderWorker.createBlockOrder).to.have.been.calledOnce()
    expect(blockOrderWorker.createBlockOrder).to.have.been.calledWith({ marketName: 'XYZ/ABC', side: 'BID', amount: '100', price: '1000', timeInForce: 'GTC' })
  })

  it('returns a block order response', async () => {
    const params = {
      amount: '100',
      price: '1000',
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
      price: '1000',
      market: 'XYZ/ABC',
      side: 'BID',
      timeInForce: 'GTC'
    }
    const response = await createBlockOrder({ params, blockOrderWorker }, { CreateBlockOrderResponse, TimeInForce })

    expect(CreateBlockOrderResponse).to.have.been.calledOnce()
    expect(CreateBlockOrderResponse).to.have.been.calledWith({ blockOrderId: fakeOrderId })
  })
})

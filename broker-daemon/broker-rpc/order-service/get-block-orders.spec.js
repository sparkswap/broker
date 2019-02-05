const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getBlockOrders = rewire(path.resolve(__dirname, 'get-block-orders'))

describe('getBlockOrders', () => {
  let GetBlockOrdersResponse
  let blockOrderWorker
  let blockOrder
  let anotherBlockOrder
  let params

  beforeEach(() => {
    params = { market: 'BTC/LTC' }
    GetBlockOrdersResponse = sinon.stub()

    blockOrder = {
      serializeSummary: sinon.stub()
    }
    anotherBlockOrder = {
      serializeSummary: sinon.stub()
    }
    blockOrderWorker = {
      getBlockOrders: sinon.stub().resolves([blockOrder, anotherBlockOrder])
    }
  })

  it('throws a non-public error if another error is encountered', () => {
    blockOrderWorker.getBlockOrders.rejects()

    return expect(getBlockOrders({ params, blockOrderWorker }, { GetBlockOrdersResponse })).to.eventually.be.rejectedWith(Error)
  })

  it('retrieves all block orders for the specified market', async () => {
    await getBlockOrders({ params, blockOrderWorker }, { GetBlockOrdersResponse })

    expect(blockOrderWorker.getBlockOrders).to.have.been.calledOnce()
    expect(blockOrderWorker.getBlockOrders).to.have.been.calledWith('BTC/LTC')
  })

  it('serializes the block orders and returns an object with the orders', async () => {
    const firstSerialized = { my: 'object' }
    const secondSerialized = { another: 'object' }
    blockOrder.serializeSummary.returns(firstSerialized)
    anotherBlockOrder.serializeSummary.returns(secondSerialized)
    const response = await getBlockOrders({ params, blockOrderWorker }, { GetBlockOrdersResponse })

    expect(blockOrder.serializeSummary).to.have.been.calledOnce()
    expect(anotherBlockOrder.serializeSummary).to.have.been.calledOnce()
    expect(response).to.eql({ blockOrders: [firstSerialized, secondSerialized] })
  })
})

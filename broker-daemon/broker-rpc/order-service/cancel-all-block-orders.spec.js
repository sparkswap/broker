const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const cancelAllBlockOrders = rewire(path.resolve(__dirname, 'cancel-all-block-orders'))

describe('cancelAllBlockOrders', () => {
  let blockOrderWorker
  let market
  let params

  beforeEach(() => {
    market = 'BTC/LTC'
    params = {
      market
    }
    blockOrderWorker = {
      cancelActiveOrders: sinon.stub().resolves({
        cancelledOrders: ['asdfasdf'],
        failedToCancelOrders: ['fdsbbbbb']
      })
    }
  })

  it('cancels block orders by market', async () => {
    await cancelAllBlockOrders({ params, blockOrderWorker })

    expect(blockOrderWorker.cancelActiveOrders).to.have.been.calledOnce()
    expect(blockOrderWorker.cancelActiveOrders).to.have.been.calledWith(market)
  })

  it('returns ids of successfully cancelled and unsuccessfully cancelled orders', async () => {
    const res = await cancelAllBlockOrders({ params, blockOrderWorker })

    expect(res.cancelledOrders).to.eql(['asdfasdf'])
    expect(res.failedToCancelOrders).to.eql(['fdsbbbbb'])
  })
})

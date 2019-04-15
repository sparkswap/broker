const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getTradeHistory = rewire(path.resolve(__dirname, 'get-trade-history'))

describe('getTradeHistory', () => {
  let GetTradeHistoryResponse
  let blockOrderWorker
  let orders
  let fills
  let completedOrder
  let executingOrder
  let rejectedOrder
  let acceptedFill
  let executedFill
  let rejectedFill

  beforeEach(() => {
    GetTradeHistoryResponse = sinon.stub()
    completedOrder = {
      orderId: 'orderId',
      state: 'completed'
    }
    executingOrder = {
      orderId: 'orderId2',
      state: 'executing'
    }
    rejectedOrder = {
      orderId: 'orderId3',
      state: 'rejected'
    }

    acceptedFill = {
      fillId: 'fillId',
      state: 'accepted'
    }
    executedFill = {
      fillId: 'fillId2',
      state: 'executed'
    }
    rejectedFill = {
      fillId: 'fillId3',
      state: 'rejected'
    }
    orders = [
      completedOrder,
      executingOrder,
      rejectedOrder
    ]
    fills = [
      acceptedFill,
      executedFill,
      rejectedFill
    ]

    blockOrderWorker = {
      getTrades: sinon.stub().resolves({
        orders,
        fills
      })
    }
  })

  it('throws an Error if retreiving trades fails', () => {
    blockOrderWorker.getTrades.rejects(new Error('error'))

    return expect(getTradeHistory({ blockOrderWorker }, { GetTradeHistoryResponse })).to.eventually.be.rejectedWith(Error, 'error')
  })

  it('retrieves the trades', async () => {
    await getTradeHistory({ blockOrderWorker }, { GetTradeHistoryResponse })

    expect(blockOrderWorker.getTrades).to.have.been.calledOnce()
  })

  it('returns filtered trades', async () => {
    const res = await getTradeHistory({ blockOrderWorker }, { GetTradeHistoryResponse })

    expect(GetTradeHistoryResponse).to.have.been.calledOnce()
    expect(GetTradeHistoryResponse).to.have.been.calledWithNew()
    expect(GetTradeHistoryResponse).to.have.been.calledWith({
      orders: [
        completedOrder,
        executingOrder
      ],
      fills: [
        acceptedFill,
        executedFill
      ]
    })
    expect(res).to.be.instanceOf(GetTradeHistoryResponse)
  })
})

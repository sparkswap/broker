const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const getPreimage = rewire(path.resolve(__dirname, 'get-preimage'))

describe('getPreimage', () => {
  let params
  let getRecords
  let Order
  let ordersByHash
  let send
  let fromStorageBound
  let order

  beforeEach(() => {
    order = {
      inboundSymbol: 'BTC',
      inboundAmount: '1000000',
      swapHash: 'as09fdjasdf09ja0dsf=='
    }

    getRecords = sinon.stub().resolves([ order ])
    fromStorageBound = 'fakebind'
    Order = {
      fromStorage: {
        bind: sinon.stub().returns(fromStorageBound)
      }
    }

    getPreimage.__set__('getRecords', getRecords)
    getPreimage.__set__('Order', Order)

    ordersByHash = {
      range: sinon.stub()
    }
    params = {
      paymentHash: 'as09fdjasdf09ja0dsf==',
      amount: '1000000',
      symbol: 'BTC',
      timeLock: '1000000',
      bestHeight: '900000'
    }
    send = sinon.stub()
  })

  it('gets the records for the hash', async () => {
    const fakeRange = 'myrange'
    ordersByHash.range.returns(fakeRange)
    await getPreimage({ params, send, ordersByHash })

    expect(ordersByHash.range).to.have.been.calledOnce()
    expect(ordersByHash.range).to.have.been.calledWith({
      gte: params.paymentHash,
      lte: params.paymentHash
    })
    expect(getRecords).to.have.been.calledOnce()
    expect(getRecords).to.have.been.calledWith(ordersByHash)
    expect(getRecords).to.have.been.calledWith(sinon.match.any, fromStorageBound)
    expect(getRecords).to.have.been.calledWith(sinon.match.any, sinon.match.any, fakeRange)
  })

  it('throws if too many orders match the hash', () => {
    getRecords.resolves([ order, order ])

    return expect(getPreimage({ params, send, ordersByHash })).to.eventually.be.rejectedWith('Too many routing entries')
  })

  it('throws if no orders match the hash', () => {
    getRecords.resolves([ ])

    return expect(getPreimage({ params, send, ordersByHash })).to.eventually.be.rejectedWith('No routing entry available')
  })

  it('returns the preimage for an already retrieved hash', async () => {
    order.swapPreimage = 'fakepreimage'

    await getPreimage({ params, send, ordersByHash })

    expect(send).to.have.been.calledOnce()
    expect(send).to.have.been.calledWith({ paymentPreimage: order.swapPreimage })
  })

  it('throws if the amount is not at least as much as on the order', () => {
    params.amount = '10'

    return expect(getPreimage({ params, send, ordersByHash })).to.eventually.be.rejectedWith('Insufficient currency')
  })

  it('throws if the symbol does not match the inbound symbol on the order', () => {
    order.inboundSymbol = 'LTC'

    return expect(getPreimage({ params, send, ordersByHash })).to.eventually.be.rejectedWith('Wrong currency')
  })

  it('throws if the current block height is too high for the time lock', () => {
    params.bestHeight = '1000000'

    return expect(getPreimage({ params, send, ordersByHash })).to.eventually.be.rejectedWith('too high')
  })
})

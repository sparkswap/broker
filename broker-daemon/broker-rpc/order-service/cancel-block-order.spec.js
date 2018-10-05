const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const { BlockOrderNotFoundError } = require('../../models/errors')

const cancelBlockOrder = rewire(path.resolve(__dirname, 'cancel-block-order'))

describe('cancelBlockOrder', () => {
  let PublicError
  let blockOrderWorker
  let blockOrder

  beforeEach(() => {
    PublicError = cancelBlockOrder.__get__('PublicError')

    blockOrder = {
      serialize: sinon.stub()
    }
    blockOrderWorker = {
      cancelBlockOrder: sinon.stub().resolves(blockOrder)
    }
  })

  it('throws a Public Error if the block order is not found', () => {
    blockOrderWorker.cancelBlockOrder.rejects(new BlockOrderNotFoundError('fakeID', new Error('fake error')))

    const params = {
      blockOrderId: 'fakeID'
    }

    return expect(cancelBlockOrder({ params, blockOrderWorker })).to.eventually.be.rejectedWith(PublicError)
  })

  it('throws a non-public error if another error is encountered', () => {
    blockOrderWorker.cancelBlockOrder.rejects()

    const params = {
      blockOrderId: 'fakeID'
    }

    return expect(cancelBlockOrder({ params, blockOrderWorker })).to.eventually.be.rejectedWith(Error)
  })

  it('cancels the block order by id', async () => {
    const params = {
      blockOrderId: 'fakeID'
    }
    await cancelBlockOrder({ params, blockOrderWorker })

    expect(blockOrderWorker.cancelBlockOrder).to.have.been.calledOnce()
    expect(blockOrderWorker.cancelBlockOrder).to.have.been.calledWith('fakeID')
  })
})

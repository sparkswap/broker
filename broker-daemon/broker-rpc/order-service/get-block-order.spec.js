const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const { BlockOrderNotFoundError } = require('../../models/errors')

const getBlockOrder = rewire(path.resolve(__dirname, 'get-block-order'))

describe('getBlockOrder', () => {
  let blockOrderWorker
  let blockOrder

  beforeEach(() => {
    blockOrder = {
      serialize: sinon.stub()
    }
    blockOrderWorker = {
      getBlockOrder: sinon.stub().resolves(blockOrder)
    }
  })

  it('throws an Error if the block order is not found', () => {
    blockOrderWorker.getBlockOrder.rejects(new BlockOrderNotFoundError('fakeID', new Error('fake error')))

    const params = {
      blockOrderId: 'fakeID'
    }

    return expect(getBlockOrder({ params, blockOrderWorker })).to.eventually.be.rejectedWith(Error, 'Block Order with ID fakeID was not found: Error: fake error')
  })

  it('retrieves the block order by id', async () => {
    const params = {
      blockOrderId: 'fakeID'
    }
    await getBlockOrder({ params, blockOrderWorker })

    expect(blockOrderWorker.getBlockOrder).to.have.been.calledOnce()
    expect(blockOrderWorker.getBlockOrder).to.have.been.calledWith('fakeID')
  })

  it('serializes the block order', async () => {
    const params = {
      blockOrderId: 'fakeID'
    }
    const serialized = { my: 'object' }
    blockOrder.serialize.returns(serialized)
    const res = await getBlockOrder({ params, blockOrderWorker })

    expect(blockOrder.serialize).to.have.been.calledOnce()
    expect(res).to.be.eql(serialized)
  })
})

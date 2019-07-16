const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const createOrder = rewire(path.resolve(__dirname, 'create-order'))

describe('createOrder', () => {
  let relayer
  let store
  let put
  const nanoNow = [ 1563311525, 110706095 ]
  const timestamp = '1563311525110706095'
  const orderId = 123

  beforeEach(() => {
    put = sinon.stub().callsArg(2)
    createOrder.__set__('nano.now', sinon.stub().withArgs().returns(nanoNow))

    relayer = {
      identity: {
        authorize: sinon.stub()
      },
      orderService: {
        createOrder: sinon.stub().resolves({ orderId })
      }
    }

    store = { sublevel: name => { return { put } } }
  })

  it('creates and stores an order', async () => {
    const params = {
      sourceAmount: {
        symbol: 'BTC',
        value: '0.01'
      },
      sourceAddress: '12345',
      destinationAmount: {
        symbol: 'LTC',
        value: '1.1'
      },
      destinationAddress: '67890',
      roleRestriction: 'NO_RESTRICTION'
    }
    const response = await createOrder({ params, relayer, store })
    expect(response).to.be.eql({ orderId })

    const order = Object.assign({}, params, { timestamp })
    expect(put).to.have.been.calledWith(orderId, order)
  })
})

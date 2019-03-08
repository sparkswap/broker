const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const register = rewire(path.resolve(__dirname, 'register'))

describe('register', () => {
  const url = 'my-url/'

  let relayer
  let logger
  let RegisterResponse
  let registerStub
  let publicKey
  let entityId
  let network

  beforeEach(() => {
    network = 'mainnet'
    publicKey = 'asdf'
    entityId = 'entityid'
    registerStub = sinon.stub().resolves({ entityId })
    relayer = {
      identity: {
        pubKeyBase64: publicKey
      },
      adminService: {
        register: registerStub
      }
    }
    logger = { info: sinon.stub() }
    RegisterResponse = sinon.stub()
    register.__set__('registerUrls', {
      [network]: url
    })
  })

  beforeEach(() => {
    global.sparkswap = {}
    global.sparkswap.network = network
  })

  afterEach(() => {
    delete global['sparkswap']
  })

  it('registers the publickey with the relayer', async () => {
    await register({ relayer, logger }, { RegisterResponse })

    expect(registerStub).to.have.been.calledOnce()
    expect(registerStub).to.have.been.calledWith({ publicKey })
  })

  it('returns the entityId created by the relayer', async () => {
    const res = await register({ relayer, logger }, { RegisterResponse })

    expect(res).to.be.an.instanceOf(RegisterResponse)
    expect(RegisterResponse).to.have.been.calledOnce()
    expect(RegisterResponse).to.have.been.calledWithNew()
    expect(RegisterResponse).to.have.been.calledWith({ entityId, url: `${url}${entityId}` })
  })

  it('throws an error if registration url could not be found', async () => {
    global.sparkswap.network = 'badnetwork'
    return expect(register({ relayer, logger }, { RegisterResponse })).to.eventually.be.rejectedWith('Could not find registration url')
  })

  it('throws an error if network could not be found', async () => {
    delete global.sparkswap['network']
    return expect(register({ relayer, logger }, { RegisterResponse })).to.eventually.be.rejectedWith('Configuration error: Could not find network')
  })
})

const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const register = rewire(path.resolve(__dirname, 'register'))

describe('register', () => {
  let relayer
  let logger
  let RegisterResponse
  let registerStub
  let publicKey
  let entityId
  let url

  beforeEach(() => {
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
    url = register.__get__('REGISTER_URL')
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
})

const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const register = rewire(path.resolve(__dirname, 'register'))

describe('register', () => {
  let params
  let relayer
  let logger
  let RegisterResponse
  let registerStub
  let publicKey
  let entityId

  beforeEach(() => {
    publicKey = 'asdf'
    entityId = 'entityid'
    params = { publicKey }
    registerStub = sinon.stub().resolves({ entityId })
    relayer = {
      adminService: {
        register: registerStub
      }
    }
    RegisterResponse = sinon.stub()
  })

  it('registers the publickey with the relayer', async () => {
    await register({ params, relayer, logger }, { RegisterResponse })

    expect(registerStub).to.have.been.calledOnce()
    expect(registerStub).to.have.been.calledWith({publicKey})
  })

  it('returns the entityId created by the relayer', async () => {
    const res = await register({ params, relayer, logger }, { RegisterResponse })

    expect(res).to.be.an.instanceOf(RegisterResponse)
    expect(RegisterResponse).to.have.been.calledOnce()
    expect(RegisterResponse).to.have.been.calledWithNew()
    expect(RegisterResponse).to.have.been.calledWith({entityId})
  })
})

const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const enableCors = rewire(path.resolve(__dirname, 'enable-cors'))

describe('enableCors', () => {
  let corsMiddleware
  let req
  let res
  let next

  beforeEach(() => {
    res = {
      header: sinon.stub()
    }
    next = sinon.stub()
    corsMiddleware = enableCors()
    corsMiddleware(req, res, next)
  })

  it('sets the access control allow origin header to any domain', () => {
    expect(res.header).to.have.been.calledWith('Access-Control-Allow-Origin', '*')
  })

  it('sets the access control allow credentials to true', () => {
    expect(res.header).to.have.been.calledWith('Access-Control-Allow-Credentials', true)
  })

  it('sets the access control allow headers header', () => {
    expect(res.header).to.have.been.calledWith('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  })

  it('moves to the next middleware', () => {
    expect(next).to.have.been.calledOnce()
    expect(next).to.have.been.calledAfter(res.header)
  })
})

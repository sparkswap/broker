const path = require('path')
const {
  rewire,
  expect,
  sinon
} = require('test/test-helper')

const grpcDeadlineInterceptor = rewire(path.resolve(__dirname, 'grpc-deadline-interceptor'))

describe('grpc-deadline-interceptor', () => {
  let options
  let nextCall
  let revert
  let InterceptingCall
  let nextCallRes

  beforeEach(() => {
    nextCallRes = sinon.stub()
    nextCall = sinon.stub().returns(nextCallRes)
    InterceptingCall = sinon.stub()

    options = {
      method_definition: {
        requestStream: false,
        responseStream: false
      }
    }
    revert = grpcDeadlineInterceptor.__set__('grpc', { InterceptingCall })
  })

  afterEach(() => {
    revert()
  })

  it('doesnt add a deadline for a request stream rpc call', () => {
    options.method_definition.requestStream = true
    grpcDeadlineInterceptor(options, nextCall)
    expect(nextCall.args[0][0]).to.not.have.property('deadline')
  })

  it('doesnt add a deadline for a response stream rpc call', () => {
    options.method_definition.responseStream = true
    grpcDeadlineInterceptor(options, nextCall)
    expect(nextCall.args[0][0]).to.not.have.property('deadline')
  })

  it('doesnt add a new deadline if a deadline already exists in options', () => {
    const deadline = Math.floor(Date.now() / 1000)
    options.deadline = deadline
    grpcDeadlineInterceptor(options, nextCall)
    expect(nextCall.args[0][0]).to.have.property('deadline', deadline)
  })

  it('sets a deadline on the options object for a non streaming call', () => {
    grpcDeadlineInterceptor(options, nextCall)
    expect(nextCall.args[0][0]).to.have.property('deadline')
  })

  it('returns an InterceptingCall', () => {
    const interceptingCallInstance = { name: 'InterceptingCall' }
    InterceptingCall.returns(interceptingCallInstance)
    const res = grpcDeadlineInterceptor(options, nextCall)
    expect(InterceptingCall).to.have.been.calledWith(nextCallRes)
    expect(res).to.be.eql(interceptingCallInstance)
  })
})

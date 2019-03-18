const { sinon, rewire, expect } = require('test/test-helper')
const path = require('path')

const retry = rewire(path.resolve(__dirname, 'retry'))

describe('retry', () => {
  let callFunction
  let message
  let attempts
  let delayTime
  let logger
  let delay
  let res

  beforeEach(() => {
    res = 'response'
    callFunction = sinon.stub().resolves(res)
    message = 'test message'
    attempts = 2
    delayTime = 100
    logger = { error: sinon.stub() }
    delay = sinon.stub().resolves()
    retry.__set__('logger', logger)
    retry.__set__('delay', delay)
  })

  it('calls the call function', async () => {
    await retry(callFunction, message, attempts, delayTime)

    expect(callFunction).to.be.to.have.been.calledOnce()
  })

  it('returns the response of the callFunction if there were no errors', async () => {
    const result = await retry(callFunction, message, attempts, delayTime)
    expect(result).to.eql(res)
    expect(callFunction).to.have.been.calledOnce()
  })

  it('retries the callFunction if there was an error and there are still retries left', async () => {
    callFunction = sinon.stub()
    callFunction.onCall(0).rejects('Error')
    callFunction.onCall(1).resolves()
    await retry(callFunction, message, attempts, delayTime)
    expect(logger.error).to.have.been.called()
    expect(delay).to.have.been.calledWith(delayTime)
    expect(callFunction).to.have.been.calledTwice()
  })

  it('logs the passed in error message if one is given', async () => {
    callFunction = sinon.stub()
    callFunction.onCall(0).rejects('Error')
    callFunction.onCall(1).resolves()
    await retry(callFunction, message, attempts, delayTime)
    expect(logger.error).to.have.been.called()
    expect(logger.error).to.have.been.calledWith(message)
  })

  it('calls the callFunction', async () => {
    callFunction = sinon.stub()
    callFunction.onCall(0).rejects('Error')
    callFunction.onCall(1).resolves()
    await retry(callFunction, attempts, delayTime)

    expect(delay.getCall(0).calledBefore(callFunction.getCall(1))).to.be.true()
  })

  it('callFunction only gets called after delay resolves', async () => {
    callFunction = sinon.stub()
    callFunction.onCall(0).rejects('Error')
    callFunction.onCall(1).resolves()

    let resolveDelay
    delay.callsFake((ms) => {
      return new Promise((resolve, reject) => {
        resolveDelay = resolve
      })
    })

    retry(callFunction, attempts, delayTime)

    setImmediate(() => {
      expect(callFunction).to.have.been.calledOnce()

      resolveDelay()

      setImmediate(() => expect(callFunction).to.have.been.calledTwice())
    })
  })
})

const { sinon, rewire, expect } = require('test/test-helper')
const path = require('path')

const exponentialBackoff = rewire(path.resolve(__dirname, 'exponential-backoff'))

describe('exponentialBackoff', () => {
  let callFunction
  let attempts
  let delayTime
  let delay
  let logger
  let res
  let logOptions

  beforeEach(() => {
    res = 'response'
    callFunction = sinon.stub().resolves(res)
    attempts = 2
    delayTime = 100
    logger = { error: sinon.stub() }
    delay = sinon.stub()
    logOptions = {info: 'info'}
    exponentialBackoff.__set__('logger', logger)
    exponentialBackoff.__set__('delay', delay)
  })

  it('calls the call function', async () => {
    await exponentialBackoff(callFunction, attempts, delayTime, logOptions)

    expect(callFunction).to.be.to.have.been.calledOnce()
  })

  it('returns the response of the callFunction if there were no errors', async () => {
    const result = await exponentialBackoff(callFunction, attempts, delayTime, logOptions)
    expect(result).to.eql(res)
  })

  it('retries the callFunction if there was an error and there are still retries left', async () => {
    callFunction = sinon.stub().rejects('Error')
    try {
      await exponentialBackoff(callFunction, attempts, delayTime, logOptions)
      expect(logger.error).to.have.been.called()
      expect(delay).to.have.been.calledWith(delayTime)
      expect(callFunction).to.have.been.calledThrice()
    } catch (error) {
      expect(error.message).to.eql('Error')
    }
  })
})

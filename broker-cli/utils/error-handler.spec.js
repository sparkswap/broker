const { expect, sinon } = require('test/test-helper')

const handleError = require('./error-handler')

describe('handleError', () => {
  const error = new Error('14 UNAVAILABLE: Connect Failed')
  const customError = 'Broker Daemon is unavailable, you may want to check if it\'s still up.'
  const loggerStub = { error: sinon.stub() }
  it('logs a specific error if the broken daemon is down', () => {
    handleError(error, loggerStub)
    expect(loggerStub.error).to.have.been.calledWith(customError)
  })

  const otherError = new Error('normal error')
  it('logs the error message of the original error if the broker daemon is not down', () => {
    handleError(otherError, loggerStub)
    expect(loggerStub.error).to.have.been.calledWith(otherError)
  })
})

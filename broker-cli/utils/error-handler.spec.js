const { expect } = require('test/test-helper')

const handleError = require('./error-handler')

describe('handleError', () => {
  let error
  let expectedMessage

  it('logs a specific error if the broker daemon is down', () => {
    error = new Error('14 UNAVAILABLE: Connect Failed')
    error.details = 'Connect Failed'
    error.code = 14
    expectedMessage = 'Broker Daemon is unavailable'

    expect(handleError(error)).to.include(expectedMessage)
  })

  it('logs a specific error if the broker daemon encountered an internal error', () => {
    error = new Error('13 INTERNAL: Call terminated before completion')
    error.details = 'Call terminated before completion'
    error.code = 13
    expectedMessage = 'Broker Daemon encountered an Internal Error: Call terminated before completion'

    expect(handleError(error)).to.include(expectedMessage)
  })

  it('logs a suggested action if broker daemon encountered an internal error from an unregistered entity', () => {
    error = new Error('13 INTERNAL: Call terminated before completion')
    error.details = 'not registered'
    error.code = 13
    expectedMessage = 'Please run `sparkswap register` to register your Broker Daemon with the Relayer.'

    expect(handleError(error)).to.include(expectedMessage)
  })

  it('logs the error message of the original error if the broker daemon is not down', () => {
    error = new Error('normal error')
    expectedMessage = 'normal error'

    expect(handleError(error).message).to.include(expectedMessage)
  })
})

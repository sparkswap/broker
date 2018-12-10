const { sinon, expect } = require('test/test-helper')
const transformLogger = require('./transform-logger')

describe('transformLogger', () => {
  let logger

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
      log: sinon.stub(),
      error: sinon.stub()
    }
  })

  it('creates a new object with all log properties of the old', () => {
    const transformed = transformLogger(logger)

    expect(transformed).to.be.an('object')
    expect(transformed).to.not.be.equal(logger)
    expect(transformed).to.have.property('info')
    expect(transformed).to.have.property('debug')
    expect(transformed).to.have.property('warn')
    expect(transformed).to.have.property('log')
    expect(transformed).to.have.property('error')
  })

  it('skips non-existent loggers', () => {
    delete logger.info
    const transformed = transformLogger(logger)

    expect(transformed).to.not.have.property('info')
  })

  it('calls log functions in context of the logger', () => {
    const transformed = transformLogger(logger)

    transformed.log('fake message')

    expect(logger.log).to.have.been.calledOnce()
    expect(logger.log).to.have.been.calledOn(logger)
  })

  it('by default passes through unmutated', () => {
    const transformed = transformLogger(logger)

    transformed.log('fake message', { param: 7 })

    expect(logger.log).to.have.been.calledOnce()
    expect(logger.log).to.have.been.calledWith('fake message', { param: 7 })
  })

  it('applies the transform function', () => {
    const transformed = transformLogger(logger, (logFn, msg, params) => {
      logFn(msg + ': howdy', { param: params.param + 3 })
    })

    transformed.log('fake message', { param: 7 })

    expect(logger.log).to.have.been.calledOnce()
    expect(logger.log).to.have.been.calledWith('fake message: howdy', { param: 10 })
  })
})

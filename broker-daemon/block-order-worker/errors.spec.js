const { expect } = require('test/test-helper')

const { BlockOrderError } = require('./errors')

describe('errors', () => {
  describe('BlockOrderError', () => {
    let blockOrderError
    let err
    let message

    beforeEach(() => {
      err = new Error('test error')
      message = 'Internal error'

      blockOrderError = new BlockOrderError(message, err)
    })

    it('inherits from Error', () => {
      expect(blockOrderError).to.be.an('error')
    })

    it('is a BlockOrderError', () => {
      expect(blockOrderError.name).to.be.eql('BlockOrderError')
    })

    it('throws an error if no message is provided', () => {
      expect(() => new BlockOrderError()).to.throw()
    })

    it('sets a stack on the public error referencing the error argument', () => {
      expect(blockOrderError.stack).to.eql(err.stack)
    })

    it('defaults to the caller stack if no error argument exists', () => {
      expect(new BlockOrderError(message).stack).to.not.eql(err.stack)
    })
  })
})

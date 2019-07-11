const { expect } = require('test/test-helper')
const BlockOrderNotFoundError = require('./block-order-not-found-error')

describe('BlockOrderNotFoundError', () => {
  let blockOrderError
  let err
  let id

  beforeEach(() => {
    err = new Error('test error')
    id = 'fakeID'

    blockOrderError = new BlockOrderNotFoundError(id, err)
  })

  it('inherits from BlockOrderError', () => {
    expect(blockOrderError).to.be.an('error')
  })

  it('is a BlockOrderNotFoundError', () => {
    expect(blockOrderError.name).to.be.eql('BlockOrderNotFoundError')
  })

  it('sets a stack on the public error referencing the error argument', () => {
    expect(blockOrderError.stack).to.eql(err.stack)
  })

  it('provides an error message using the ID', () => {
    expect(blockOrderError.message).to.be.eql('Block Order with ID fakeID was not found: Error: test error')
  })

  it('sets a notFound parameter for easy checking', () => {
    return expect(blockOrderError.notFound).to.be.true
  })
})

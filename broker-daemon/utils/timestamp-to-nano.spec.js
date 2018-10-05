const { expect } = require('test/test-helper')

const timestampToNano = require('./timestamp-to-nano')

describe('nanoToDatetime', () => {
  let nanoseconds

  beforeEach(() => {
    nanoseconds = '1538676318030164300'
  })

  it('returns the current timestamp in seconds', () => {
    const expectedNano = ['1538676318', '030164300']
    expect(timestampToNano(nanoseconds)).to.be.eql(expectedNano)
  })
})

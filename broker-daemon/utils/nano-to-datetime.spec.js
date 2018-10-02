const { expect } = require('test/test-helper')

const nanoToDatetime = require('./nano-to-datetime')

describe('nanoToDatetime', () => {
  let nanoseconds
  let expectedDatetime

  beforeEach(() => {
    nanoseconds = '1532045654571'
    expectedDatetime = '1970-01-01T00:25:32.045654571Z'
  })

  it('returns the current timestamp in seconds', () => {
    expect(nanoToDatetime(nanoseconds)).to.be.eql(expectedDatetime)
  })
})

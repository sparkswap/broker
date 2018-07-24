const { expect, timekeeper } = require('test/test-helper')

const nowInSeconds = require('./now-in-seconds')

describe('nowInSeconds', () => {
  let timestamp
  let timeInSeconds

  beforeEach(() => {
    timestamp = 1532045654571
    timeInSeconds = 1532045655
    timekeeper.freeze(new Date(timestamp))
  })

  afterEach(() => {
    timekeeper.reset()
  })

  it('returns the current timestamp in seconds', () => {
    expect(nowInSeconds()).to.be.eql(timeInSeconds)
  })
})

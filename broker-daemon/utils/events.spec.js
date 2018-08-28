const { expect } = require('test/test-helper')

const events = require('./events')

describe('convertBalance', () => {
  const { BlockOrderWorkerEvents } = events

  it('defines CREATED', () => expect(BlockOrderWorkerEvents.CREATED).to.not.be.undefined())
  it('defines CANCEL', () => expect(BlockOrderWorkerEvents.CANCEL).to.not.be.undefined())
  it('defines COMPLETE', () => expect(BlockOrderWorkerEvents.COMPLETE).to.not.be.undefined())
  it('defines COMPLETED', () => expect(BlockOrderWorkerEvents.COMPLETED).to.not.be.undefined())
  it('defines FAIL', () => expect(BlockOrderWorkerEvents.FAIL).to.not.be.undefined())
  it('defines REJECTED', () => expect(BlockOrderWorkerEvents.REJECTED).to.not.be.undefined())
})

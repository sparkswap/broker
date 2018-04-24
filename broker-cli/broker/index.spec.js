const { chai } = require('test/test-helper')
const { expect } = chai

const Broker = require('./index')

describe('broker index', () => {
  it('defines Broker', () => {
    expect(Broker).to.not.be.null()
    expect(Broker).to.not.be.undefined()
  })
})

const { chai } = require('test/test-helper')
const { expect } = chai

const {
  buyCommand,
  sellCommand,
  configCommand,
  orderbookCommand
} = require('./index')

describe('broker index', () => {
  it('defines buyCommnad', () => {
    expect(buyCommand).to.not.be.null()
    expect(buyCommand).to.not.be.undefined()
  })

  it('defines sellCommnad', () => {
    expect(sellCommand).to.not.be.null()
    expect(sellCommand).to.not.be.undefined()
  })

  it('defines configCommnad', () => {
    expect(configCommand).to.not.be.null()
    expect(configCommand).to.not.be.undefined()
  })

  it('defines orderbookCommnad', () => {
    expect(orderbookCommand).to.not.be.null()
    expect(orderbookCommand).to.not.be.undefined()
  })
})

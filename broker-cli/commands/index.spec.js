const { expect } = require('test/test-helper')

const {
  buyCommand,
  sellCommand,
  orderbookCommand,
  healthCheckCommand,
  walletCommand,
  orderCommand
} = require('./index')

describe('broker index', () => {
  it('defines buyCommand', () => {
    expect(buyCommand).to.not.be.null()
    expect(buyCommand).to.not.be.undefined()
  })

  it('defines sellCommand', () => {
    expect(sellCommand).to.not.be.null()
    expect(sellCommand).to.not.be.undefined()
  })

  it('defines orderbookCommnad', () => {
    expect(orderbookCommand).to.not.be.null()
    expect(orderbookCommand).to.not.be.undefined()
  })

  it('defines healthCheckCommand', () => {
    expect(healthCheckCommand).to.not.be.null()
    expect(healthCheckCommand).to.not.be.undefined()
  })

  it('defines walletCommand', () => {
    expect(walletCommand).to.not.be.null()
    expect(walletCommand).to.not.be.undefined()
  })

  it('defines orderCommand', () => {
    expect(orderCommand).to.not.be.null()
    expect(orderCommand).to.not.be.undefined()
  })
})

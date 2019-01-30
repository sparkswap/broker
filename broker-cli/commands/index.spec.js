const { expect } = require('test/test-helper')

const {
  buyCommand,
  sellCommand,
  orderbookCommand,
  healthCheckCommand,
  walletCommand,
  orderCommand,
  infoCommand,
  identityCommand,
  registerCommand
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

  it('defines infoCommand', () => {
    expect(infoCommand).to.not.be.null()
    expect(infoCommand).to.not.be.undefined()
  })

  it('defines identityCommand', () => {
    expect(identityCommand).to.not.be.null()
    expect(identityCommand).to.not.be.undefined()
  })

  it('defines registerCommand', () => {
    expect(registerCommand).to.not.be.null()
    expect(registerCommand).to.not.be.undefined()
  })
})

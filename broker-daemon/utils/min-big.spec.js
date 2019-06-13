const { expect } = require('test/test-helper')

const minBig = require('./min-big')

describe('minBig', () => {
  it('returns the min of two numbers', () => {
    expect(minBig(1, 3)).to.be.eql('1')
  })
  it('returns the min of a set of numbers', () => {
    expect(minBig(3, 1, 2)).to.be.eql('1')
  })

  it('returns the min of positive and negative numbers', () => {
    expect(minBig(-1, 0, 1)).to.be.eql('-1')
  })

  it('returns the only number in a one number set', () => {
    expect(minBig(1)).to.be.eql('1')
  })
})

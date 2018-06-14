const { expect } = require('test/test-helper')

const serializePrice = require('./serialize-price')

describe('serializePrice', () => {
  it('converts prices to objects', () => {
    const price = '1234.5678'

    const obj = serializePrice(price)
    expect(obj).to.have.property('integer', '1234')
    expect(obj).to.have.property('decimal', '5678')
  })

  it('converts integers to objects', () => {
    const price = '1234'

    const obj = serializePrice(price)
    expect(obj).to.have.property('integer', '1234')
    expect(obj).to.have.property('decimal', '0')
  })
})

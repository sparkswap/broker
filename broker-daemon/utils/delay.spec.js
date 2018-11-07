const { sinon, rewire, expect } = require('test/test-helper')
const path = require('path')
const delay = rewire(path.resolve(__dirname, 'delay'))

describe('delay', () => {
  let delayTime
  let setTimeout

  beforeEach(() => {
    setTimeout = sinon.stub().callsArg(0)
    delayTime = 100
    delay.__set__('setTimeout', setTimeout)
  })

  it('calls the call function', async () => {
    await delay(delayTime)
    expect(setTimeout).to.have.been.called()
  })
})

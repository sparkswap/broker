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

  it('calls setTimeout with the callFunction and delay time', async () => {
    await delay(delayTime)
    expect(setTimeout).to.have.been.calledWith(sinon.match.func, delayTime)
  })

  it('calls the callFunction after setTimeout resolves', async () => {
    let isResolved = false

    delay(delayTime).then(() => {
      isResolved = true
    })

    expect(isResolved).to.be.false()
    setTimeout.args[0][0]()
    setImmediate(() => expect(isResolved).to.be.true())
  })
})

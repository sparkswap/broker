const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const askQuestion = rewire(path.resolve(__dirname, 'ask-question'))

describe('ask-question', () => {
  describe('askQuestion', () => {
    const message = 'my message'

    let createInterfaceStub
    let rlStub
    let stdinStub
    let stdoutStub
    let suppressInputStub

    beforeEach(() => {
      rlStub = {
        close: sinon.stub(),
        question: sinon.stub(),
        history: []
      }
      stdinStub = {
        on: sinon.stub()
      }
      stdoutStub = {
        write: sinon.stub()
      }
      createInterfaceStub = sinon.stub().returns(rlStub)
      suppressInputStub = sinon.stub()

      askQuestion.__set__('suppressInput', suppressInputStub)
      askQuestion.__set__('readline', {
        createInterface: createInterfaceStub
      })
      askQuestion.__set__('process', {
        stdin: stdinStub,
        stdout: stdoutStub
      })
    })

    it('creates a readline interface', () => {
      askQuestion(message)
      expect(createInterfaceStub).to.have.been.calledWith(sinon.match({ input: stdinStub, output: stdoutStub }))
    })

    context('silent', () => {
      it('suppresses user input if silent is set to true', () => {
        askQuestion(message, { silent: true })
        const call = rlStub.question.args[0][1]
        call()
        expect(rlStub.silent).to.be.true()
      })
    })

    context('response', () => {
      it('prompts the user with a message', () => {
        askQuestion(message)
        expect(rlStub.question).to.have.been.calledWith(sinon.match(message), sinon.match.func)
      })

      it('closes a stream', () => {
        askQuestion(message)
        const call = rlStub.question.args[0][1]
        call()
        expect(rlStub.close).to.have.been.calledOnce()
      })

      it('closes a stream if an error occurred', () => {
        rlStub.question.throws()
        expect(askQuestion(message)).to.eventually.be.rejected()
        expect(rlStub.close).to.have.been.calledOnce()
      })
    })
  })
})

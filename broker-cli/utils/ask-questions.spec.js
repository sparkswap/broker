const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const askQuestion = rewire(path.resolve(__dirname, 'ask-question'))

describe('ask-question', () => {
  describe('suppressInput', () => {
    const message = 'my message'
    const reverts = []

    let processStub
    let stdinPauseStub
    let stdoutClearLineStub
    let stdoutWriteStub
    let suppressInput
    let cursorStub

    beforeEach(() => {
      cursorStub = sinon.stub()
      stdinPauseStub = sinon.stub()
      stdoutClearLineStub = sinon.stub()
      stdoutWriteStub = sinon.stub()
      processStub = {
        stdin: {
          pause: stdinPauseStub
        },
        stdout: {
          clearLine: stdoutClearLineStub,
          write: stdoutWriteStub
        }
      }

      reverts.push(askQuestion.__set__('process', processStub))
      reverts.push(askQuestion.__set__('readline', {
        cursorTo: cursorStub
      }))
    })

    beforeEach(() => {
      suppressInput = askQuestion.__get__('suppressInput')
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it('pauses a stdin stream when receiving a new line', () => {
      const newLine = askQuestion.__get__('NEW_LINE')
      suppressInput(message, newLine)
      expect(stdinPauseStub).to.have.been.calledOnce()
    })

    it('pauses a stdin stream when receiving a carriage return', () => {
      const carriageReturn = askQuestion.__get__('CARRIAGE_RETURN')
      suppressInput(message, carriageReturn)
      expect(stdinPauseStub).to.have.been.calledOnce()
    })

    it('pauses a stdin stream when receiving an end of transmission code', () => {
      const endOfTransmission = askQuestion.__get__('END_OF_TRANSMISSION')
      suppressInput(message, endOfTransmission)
      expect(stdinPauseStub).to.have.been.calledOnce()
    })

    context('user input', () => {
      const input = Buffer.from('t')

      it('clears stdout', () => {
        suppressInput(message, input)
        expect(stdoutClearLineStub).to.have.been.calledOnce()
      })

      it('returns the cursor to the beginning of the line', () => {
        suppressInput(message, input)
        expect(cursorStub).to.have.been.calledWith(sinon.match(processStub.stdout, 0))
      })

      it('rewrites the message to stdout', () => {
        suppressInput(message, input)
        expect(stdoutWriteStub).to.have.been.calledWith(sinon.match(message))
      })
    })
  })

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
      stdoutStub = sinon.stub()
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

    it('adds a stdin watcher if output needs to be private', () => {
      askQuestion(message, { silent: true })
      expect(stdinStub.on).to.have.been.calledWith('data', sinon.match.func)
    })

    it('it suppresses input if output needs to be private', () => {
      const input = 'l'
      askQuestion(message, { silent: true })
      const call = stdinStub.on.args[0][1]
      call(input)
      expect(suppressInputStub).to.have.been.calledWith(message, input)
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

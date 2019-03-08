const path = require('path')
const {
  expect,
  rewire,
  sinon
} = require('test/test-helper')

const askPassword = rewire(path.resolve(__dirname, 'ask-password'))

describe('ask-password', () => {
  describe('askPassword', () => {
    let readline
    let rl
    let inputPassword
    let inputConfirm
    let reverts = []

    beforeEach(() => {
      inputPassword = 'danny'
      inputConfirm = 'danny'
      rl = {
        question: sinon.stub(),
        close: sinon.stub()
      }
      readline = {
        createInterface: sinon.stub().returns(rl)
      }

      reverts.push(askPassword.__set__('readline', readline))
      reverts.push(askPassword.__set__('process', {
        stdin: sinon.stub(),
        stdout: {
          write: sinon.stub()
        }
      }))
    })

    afterEach(() => {
      reverts.forEach(r => r())
    })

    it('creates a readline interface', async () => {
      askPassword()
      expect(readline.createInterface).to.have.been.called()
    })

    it('asks the user to enter a password', async () => {
      askPassword()
      const askPass = rl.question.args[0][0]
      expect(askPass).to.be.eql('Please enter a password: ')
    })

    it('asks the user to confirm a password', async () => {
      askPassword()
      const askPass = rl.question.args[0][1]
      askPass(inputPassword)
      const askConf = rl.question.args[1][0]
      expect(askConf).to.be.eql('Please confirm password: ')
    })

    it('suppresses user input', () => {
      askPassword()
      const askPass = rl.question.args[0][1]
      expect(rl.silent).to.be.true()
      askPass(inputPassword)
      const askConf = rl.question.args[1][1]
      askConf(inputConfirm)
      expect(rl.silent).to.be.true()
    })

    it('returns password and confirmation', async () => {
      askPassword().then(res => {
        expect(res.password).to.eql(inputPassword)
        expect(res.confirm).to.eql(inputConfirm)
      })
      const askPass = rl.question.args[0][1]
      askPass(inputPassword)
      const askConf = rl.question.args[1][1]
      askConf(inputConfirm)
    })

    it('closes the readline stream', () => {
      askPassword().then(() => {
        expect(rl.close).to.have.been.calledOnce()
      })
      const askPass = rl.question.args[0][1]
      askPass(inputPassword)
      const askConf = rl.question.args[1][1]
      askConf(inputConfirm)
    })

    it('closes the readline stream on failure', () => {
      const error = new Error('failure')
      rl.question.throws(error)
      askPassword().catch((e) => {
        expect(e).to.be.eql(error)
        expect(rl.close).to.have.been.called()
      })
    })
  })
})

const { expect, sinon} = require('test/test-helper')

const StateMachineAbstractPlugin = require('./abstract')
const StateMachine = require('../state-machine')

describe.only('StateMachineAbstractPlugin', () => {
  describe('#hook', () => {
    let Plugin
    let plugin
    let fakeHook
    let hookedPlugin
    let Machine

    beforeEach(() => {
      Plugin = class Plugin extends StateMachineAbstractPlugin {
        get methods () {
          const plugin = this

          return {
            hello: function () {
              plugin.hook(this, 'fakeHook', ['fakeArgs'])
            }
          }
        }
      }
      plugin = new Plugin()

      fakeHook = sinon.stub()

      hookedPlugin = {
        fakeHook
      }

      Machine = StateMachine.factory({
        plugins: [
          hookedPlugin,
          plugin
        ]
      })
    })

    it('calls the hooked method', () => {
      const machine = new Machine()

      machine.hello()

      expect(fakeHook).to.have.been.calledOnce()
    })

    it('calls it in the context of the plugin', () => {
      const machine = new Machine()

      machine.hello()

      expect(fakeHook).to.have.been.calledOn(hookedPlugin)
    })

    it('calls with the instance as the first argument', () => {
      const machine = new Machine()

      machine.hello()

      expect(fakeHook).to.have.been.calledWith(machine)
    })

    it('calls it with the passed arguments', () => {
      const machine = new Machine()

      machine.hello()

      expect(fakeHook).to.have.been.calledWith(sinon.match.any, 'fakeArgs')
    })
  })
})

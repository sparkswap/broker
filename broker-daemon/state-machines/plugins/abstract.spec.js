const { expect, sinon } = require('test/test-helper')

const StateMachineAbstractPlugin = require('./abstract')
const StateMachine = require('../state-machine')

describe('StateMachineAbstractPlugin', () => {
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

  describe('.observers', () => {
    let Plugin
    let plugin
    let Machine
    let onEnterState

    beforeEach(() => {
      onEnterState = sinon.stub()

      Plugin = class Plugin extends StateMachineAbstractPlugin {
        get observers () {
          return {
            onEnterState
          }
        }
      }
      plugin = new Plugin()

      Machine = StateMachine.factory({
        plugins: [
          plugin
        ],
        transitions: [
          { name: 'step', from: 'none', to: 'first' }
        ]
      })
    })

    it('calls the plugged in lifecycle', () => {
      const machine = new Machine()

      machine.step()

      expect(onEnterState).to.have.been.calledOnce()
    })

    it('calls the lifecycle in context of the instance', () => {
      const machine = new Machine()

      machine.step()

      expect(onEnterState).to.have.been.calledOn(machine)
    })

    it('calls the lifecycle with the lifecycle object', () => {
      const machine = new Machine()

      machine.step()

      expect(onEnterState).to.have.been.calledWith(sinon.match({
        from: 'none',
        to: 'first',
        transition: 'step'
      }))
    })

    it('calls the lifecycle even if the instance defines its own', () => {
      Machine.prototype.onEnterState = sinon.stub()
      const machine = new Machine()

      machine.step()

      expect(onEnterState).to.have.been.calledOnce()
      expect(Machine.prototype.onEnterState).to.have.been.calledOnce()
      expect(onEnterState).to.not.be.equal(Machine.prototype.onEnterState)
    })
  })
})

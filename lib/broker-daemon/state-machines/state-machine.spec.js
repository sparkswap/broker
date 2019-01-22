const { expect, sinon } = require('test/test-helper');
const StateMachine = require('./state-machine');
describe('StateMachine static method plugins', () => {
    let plugin;
    let fakeStatic;
    let Machine;
    beforeEach(() => {
        fakeStatic = sinon.stub();
        plugin = {
            staticMethods: {
                fakeStatic
            }
        };
        Machine = StateMachine.factory({
            plugins: [
                plugin
            ]
        });
    });
    it('assigns static methods to factories', () => {
        expect(Machine).to.have.property('fakeStatic');
        expect(Machine.fakeStatic).to.be.a('function');
    });
    it('calls the underlying', () => {
        Machine.fakeStatic();
        expect(fakeStatic).to.have.been.calledOnce();
    });
    it('calls in the context of the factory', () => {
        Machine.fakeStatic();
        expect(fakeStatic).to.have.been.calledOn(Machine);
    });
    it('passes through arguments', () => {
        Machine.fakeStatic('hello', 'world');
        expect(fakeStatic).to.have.been.calledWith('hello', 'world');
    });
});
//# sourceMappingURL=state-machine.spec.js.map
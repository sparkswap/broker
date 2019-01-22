const { expect, sinon } = require('test/test-helper');
const StateMachineRejection = require('./rejection');
const StateMachine = require('../state-machine');
describe('StateMachineRejection', () => {
    describe('#tryTo', () => {
        let Machine;
        let machine;
        let reject;
        let step;
        beforeEach(() => {
            Machine = StateMachine.factory({
                plugins: [
                    new StateMachineRejection()
                ],
                transitions: [
                    { name: 'step', from: 'none', to: 'first' }
                ]
            });
            machine = new Machine();
            reject = sinon.stub();
            machine.reject = reject;
            step = sinon.stub();
            machine.step = step;
        });
        it('rejects if the transition does not exist', async () => {
            await machine.tryTo('fake');
            expect(reject).to.have.been.calledOnce();
        });
        it('calls the transition', async () => {
            await machine.tryTo('step');
            expect(step).to.have.been.calledOnce();
            return expect(reject).to.not.have.been.called;
        });
        it('applies additional arguments to the transition', async () => {
            await machine.tryTo('step', 'fake', 'args');
            expect(step).to.have.been.calledWith('fake', 'args');
        });
        it('rejects if the underlying transition throws', async () => {
            step.throws();
            await machine.tryTo('step');
            expect(reject).to.have.been.calledOnce();
        });
        it('rejects if the underyling transition rejects', async () => {
            step.rejects();
            await machine.tryTo('step');
            expect(reject).to.have.been.calledOnce();
        });
    });
    describe('reject transition', () => {
        let Machine;
        let machine;
        beforeEach(() => {
            Machine = StateMachine.factory({
                plugins: [
                    new StateMachineRejection()
                ]
            });
            machine = new Machine();
        });
        it('moves to a rejected state', async () => {
            await machine.reject();
            expect(machine.state).to.be.equal('rejected');
        });
        it('adds the error to the instance', async () => {
            const err = new Error('fake error');
            await machine.reject(err);
            expect(machine).to.have.property('error', err);
        });
    });
    describe('configuration', () => {
        let Machine;
        let machine;
        beforeEach(() => {
            Machine = StateMachine.factory({
                plugins: [
                    new StateMachineRejection({
                        errorName: 'failure',
                        rejectName: 'fail',
                        rejectedName: 'failed'
                    })
                ]
            });
            machine = new Machine();
        });
        describe('errorName', () => {
            it('adds the error to the custom error name', async () => {
                const err = new Error('fake error');
                await machine.fail(err);
                expect(machine).to.have.property('failure', err);
            });
        });
        describe('rejectName', () => {
            it('creates a custom reject transition', async () => {
                expect(machine).to.have.property('fail');
                expect(machine.fail).to.be.a('function');
            });
            it('calls the custom reject transition on failure', async () => {
                machine.fail = sinon.stub();
                await machine.tryTo('fake');
                expect(machine.fail).to.have.been.calledOnce();
            });
        });
        describe('rejectedName', () => {
            it('moves to a custom rejected state', async () => {
                await machine.fail();
                expect(machine.state).to.be.eql('failed');
            });
        });
    });
});
//# sourceMappingURL=rejection.spec.js.map
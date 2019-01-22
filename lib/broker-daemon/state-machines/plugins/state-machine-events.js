const EventEmitter = require('events');
const StateMachinePlugin = require('./abstract');
class StateMachineEvents extends StateMachinePlugin {
    init(instance) {
        super.init(instance);
        instance.eventHandler = new EventEmitter();
    }
    get observers() {
        return {
            onBeforeTransition: function (lifecycle) {
                const stateMachineInstance = this;
                stateMachineInstance.eventHandler.emit(`before:${lifecycle.transition}`);
            },
            onAfterTransition: function (lifecycle) {
                const stateMachineInstance = this;
                stateMachineInstance.eventHandler.emit(lifecycle.transition);
            }
        };
    }
    get methods() {
        return {
            once: function (type, cb) {
                const stateMachineInstance = this;
                stateMachineInstance.eventHandler.once(type, cb);
            },
            removeAllListeners: function () {
                const stateMachineInstance = this;
                stateMachineInstance.eventHandler.removeAllListeners();
            }
        };
    }
}
module.exports = StateMachineEvents;
//# sourceMappingURL=state-machine-events.js.map
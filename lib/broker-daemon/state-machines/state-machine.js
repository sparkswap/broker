const StateMachine = require('javascript-state-machine');
StateMachine._factory = StateMachine.factory;
StateMachine.factory = function () {
    const cstor = this._factory.apply(this, [].slice.apply(arguments));
    const config = cstor.prototype._fsm.config;
    config.plugins.forEach((plugin) => {
        Object.assign(cstor, plugin.staticMethods || {});
    });
    return cstor;
};
module.exports = StateMachine;
//# sourceMappingURL=state-machine.js.map
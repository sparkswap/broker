const StateMachinePlugin = require('./abstract');
class StateMachineLogging extends StateMachinePlugin {
    constructor({ loggerName = 'logger', skipTransitions = [] } = {}) {
        super();
        this.loggerName = loggerName;
        this.skipTransitions = skipTransitions;
    }
    get observers() {
        const plugin = this;
        return {
            onBeforeTransition: function (lifecycle) {
                if (!plugin.skipTransitions.includes(lifecycle.transition)) {
                    this[plugin.loggerName].info(`BEFORE: ${lifecycle.transition}`);
                }
            },
            onLeaveState: function (lifecycle) {
                if (!plugin.skipTransitions.includes(lifecycle.transition)) {
                    this[plugin.loggerName].info(`LEAVE: ${lifecycle.from}`);
                }
            },
            onEnterState: async function (lifecycle) {
                if (!plugin.skipTransitions.includes(lifecycle.transition)) {
                    this[plugin.loggerName].info(`ENTER: ${lifecycle.to}`);
                }
            },
            onAfterTransition: function (lifecycle) {
                if (!plugin.skipTransitions.includes(lifecycle.transition)) {
                    this[plugin.loggerName].info(`AFTER: ${lifecycle.transition}`);
                }
            },
            onTransition: function (lifecycle) {
                if (!plugin.skipTransitions.includes(lifecycle.transition)) {
                    this[plugin.loggerName].info(`DURING: ${lifecycle.transition} (from ${lifecycle.from} to ${lifecycle.to})`);
                }
            }
        };
    }
}
module.exports = StateMachineLogging;
//# sourceMappingURL=logging.js.map
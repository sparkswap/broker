class StateMachineAbstractPlugin {
    constructor() { }
    hook(instance, event, additionalArgs = []) {
        const fsm = instance._fsm;
        const { plugins } = fsm.config;
        const args = [fsm.context].concat(additionalArgs);
        plugins.forEach((plugin) => {
            if (plugin[event]) {
                plugin[event].apply(plugin, args);
            }
        });
    }
    configure(config) {
        this.transitions.forEach((transition) => {
            config.mapTransition(transition);
        });
    }
    init(instance) {
        Object.entries(this.observers).forEach(([name, func]) => {
            instance.observe(name, func.bind(instance));
        });
    }
    get transitions() {
        const plugin = this;
        return [];
    }
    get observers() {
        const plugin = this;
        return {};
    }
    get methods() {
        const plugin = this;
        return {};
    }
    get properties() {
        const plugin = this;
        return {};
    }
    get staticMethods() {
        const plugin = this;
        return {};
    }
}
module.exports = StateMachineAbstractPlugin;
//# sourceMappingURL=abstract.js.map
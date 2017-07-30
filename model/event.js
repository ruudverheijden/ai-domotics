class Event {
	constructor(variable, changedTo, environment) {
		this.id = null;
		this.variable = variable;
		this.value = changedTo;
		this.environment = environment;		
	}
};

module.exports = Event;
const CommonHelpers = require('./CommonHelpers.js');

class EventTarget extends CommonHelpers {
	constructor() {
		super();

		this.listeners = {};
	}

	// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget

	on(type, callback) {
		return this.addEventListener(type, callback);
	}

	addEventListener(type, callback) {
		if (!(type in this.listeners)) {
			this.listeners[type] = [];
		}
		let found = false;
		for (let listener of this.listeners[type]) {
			if (listener == callback) {
				found = true;
				break;
			}
		}

		if (!found) {
			this.listeners[type].push(callback);
		}
	}

	removeEventListener(type, callback) {
		if (!(type in this.listeners)) {
			return;
		}
		var stack = this.listeners[type];
		for (var i = 0, l = stack.length; i < l; i++) {
			if (stack[i] === callback){
				stack.splice(i, 1);
				return;
			}
		}
	}

	clearEventListeners() {
		this.listeners = {};
	}

	emit(event) {
        const args = Array.prototype.slice.call(arguments, 1);

		if (!(event in this.listeners)) {
			return true;
		}
		var stack = this.listeners[event].slice();

		for (var i = 0, l = stack.length; i < l; i++) {
			try {
	            stack[i].apply(this, args || []);
			} catch(e) {
				console.error(e);
			}
		}
		return true;
	}
}

module.exports = EventTarget;
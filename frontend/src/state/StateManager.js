const EventTarget = window.classes.EventTarget;

class StateManager extends EventTarget {
	constructor(params = {}) {
	    super();

		// this._app = params.app;
		// this._user = params.app._user;
		this._peerManager = params.peerManager;

		this._id = params.id;				// TG user id
		this._apiObject = params.apiObject; // object returned from TG api

		this._displayName = null;
		if (this._apiObject && this._apiObject.first_name) {
			this._displayName = this._apiObject.first_name+' '+this._apiObject.last_name;
		}
	}
}

console.log(PeerUser);
console.log(new PeerUser);

module.exports = PeerUser;
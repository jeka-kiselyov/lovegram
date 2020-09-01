const EventTarget = require('./EventTarget.js');

class Router extends EventTarget {
	constructor() {
		super();

		// Listen on hash change:
		window.addEventListener('hashchange', ()=>{this.hashChanged()});
		// @todo: add onload handler
		this._peerId = null;
	}

	hashChanged() {
		let url = window.location.hash.slice(1) || '';
		try {
			url = url.split('/');
			if (this._peerId != url[0]) {
				this._peerId = url[0];
				this.emit('peerId', url[0]);
			}
		} catch(e) {};
	}

	hashPeer(peer) {
		document.title = '' + peer.getDisplayName() + ' | LoveGram';
		this._peerId = ''+peer._id;
		window.location.hash = this._peerId;
	}
}

module.exports = Router;
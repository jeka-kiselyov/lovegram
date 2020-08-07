const AppUI = require('../../../../utils/AppUI.js');

class RightSidebarAbstract extends AppUI {
	constructor(params) {
		super(params);

		this._peerManager = this._app._peerManager;

		this._data = {
			active: params.active || false
		};
	}

	setPeer(peer) {
		this._data.peer = peer;
	}

	setActive(active = true) {
		this._data.active = active;
		this.$('.rightSidebarBlock').classList[active ? 'add' : 'remove']('active');
	}

	template() {
		// abstract
	}
};

module.exports = RightSidebarAbstract;
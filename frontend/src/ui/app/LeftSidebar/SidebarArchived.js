
const SidebarAbstract = require('./SidebarAbstract.js');
const SidebarDialogs = require('./SidebarDialogs.js');
// const AppIcon = require('../../icons/AppIcon.js');

class SidebarArchived extends SidebarAbstract {
	constructor(params) {
		super(params);

		this._components = {
			SidebarDialogs: this.newC(SidebarDialogs, {active: true, filter: (peer)=>{ return (peer && peer.isArchived()); } }),
		};
		this._title = 'Archived';

		this._components.SidebarDialogs.setActive(true);
	}

	setActivePeer(peer) {
		this._components.SidebarDialogs.setActivePeer(peer);
	}

	afterRender() {
	}

	async getBadgeCount() {
		return await this._peerManager._folders[1].getBadgeCount();
	}

	template() {
		return `
			<div class="sidebarArchived sidebarBlock {{if (options.active)}} active{{/if}}">
				{{component(options.components.SidebarDialogs)}}{{/component}}
			</div>
		`;
	}
};

module.exports = SidebarArchived;
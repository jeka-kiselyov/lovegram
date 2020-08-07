const AppUI = require('../../../utils/AppUI.js');
const TGS = window.classes.TGS;

class SidebarAbstract extends AppUI {
	constructor(params) {
		super(params);

		this._peerManager = this._app._peerManager;
		this.AppUI = AppUI;

		this._data = {
			active: params.active || false
		};
	}

	async loadTGS(f, notOnce) {
		if (await this.sureSingle('TGS')) return;

		if (!this._tgsjson) {
			this._tgsjson = await this.loadJSON('assets/data/'+f+'.json', true); // noparse
		}

		const tgs = new TGS(this.$('.tgs'));
		tgs.setJSON(this._tgsjson, true, true, null, true);
		this.fulfilSingle('TGS', true, notOnce);
	}

	afterRender() {
		this.nextTick(()=>{
			this.reinitScrollBar(true);
		});
	}

	reinitScrollBar(forceReInit) {
		let container = this.$('.sidebarScroll');
		this.initScrollBarOn(container, forceReInit);
	}

	setActive(active = true, params) {
		if (this._data.active && !active && this.afterUnActive) {
			this.afterUnActive();
		}
		this._data.active = active;

		if (active) {
			this.$('.sidebarBlock').classList.add('active');

			if (this.afterActive) {
				this.afterActive(params);
			}
		} else {
			this.$('.sidebarBlock').classList.remove('active');
		}
	}

	template() {
		// abstract
	}
};

module.exports = SidebarAbstract;
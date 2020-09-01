const UI = window.classes.UI;
const AppIcon = require('../../icons/AppIcon.js');

const RightSidebarTop = require('./RightSidebar/RightSidebarTop.js');
// const RightSidebarSearch = require('./RightSidebar/RightSidebarSearch.js');
const RightSidebarInfo = require('./RightSidebar/RightSidebarInfo.js');
const RightSidebarForward = require('./RightSidebar/RightSidebarForward.js');
const RightSidebarStickers = require('./RightSidebar/RightSidebarStickers.js');
const RightSidebarPoll = require('./RightSidebar/RightSidebarPoll.js');

class RightSidebar extends UI {
	constructor(params) {
		super(params);

		this._components.RightSidebarTop = this.newC(RightSidebarTop);
		// this._components.RightSidebarSearch = this.newC(RightSidebarSearch);
		this._components.RightSidebarInfo = this.newC(RightSidebarInfo);
		this._components.RightSidebarForward = this.newC(RightSidebarForward);
		this._components.RightSidebarStickers = this.newC(RightSidebarStickers);
		this._components.RightSidebarPoll = this.newC(RightSidebarPoll);

		this._data.isLoading = true;

		this._componentEvents = [
			['close', 'RightSidebarTop', 'onClose'],
			['search', 'RightSidebarTop', 'onSearch'],
		];

		this._data.defaultClosed = true;
		// if (this._app._config.getSetting('rightSidebarVisible')) {
		// 	alert('visible')
		// 	this._data.defaultClosed = false;
		// }

		// setTimeout(()=>{
		// 	this.showBlock('GIFs');
		// }, 1500);
	}

	onSwipe(dir) {
		if (dir == 'right' && !this.$('#rightSidebar').classList.contains('rightSidebarClosed')) {
			this.onClose();
			return true;
		}
	}

	onSearch(q) {
		// this.showBlock('Search');
		// this.show();
		// console.error(this._currentBlock);
		this._components['RightSidebar'+this._currentBlock].doSearch(q);
	}

	setPeer(peer) {
		if (this._data.peer && this._data.peer._id == peer._id) return;

		this._data.peer = peer;

		// this._components.RightSidebarSearch.setPeer(peer);
		this._components.RightSidebarInfo.setPeer(peer);

		this._data.isLoading = true;

		if (this._app._config.getSetting('rightSidebarVisible')) {
			this._data.defaultClosed = false;

			setTimeout(()=>{
				peer.getFullInfo()
					.then(()=>{
						this._data.isLoading = false;
						this.render();
						this.showBlock('Info');
					});
			}, 100);

			this._needsRender = false;
		} else {
			this._data.defaultClosed = true;

			this._needsRender = true;
		}


		// if (this._data.isLoading) {
		// 	this._data.isLoading = false;
		// }

		// this.render();

		// this.showBlock('Info');
	}

	showBlock(blockName, params) {
		if (this._needsRender) {
			this._data.isLoading = false;
			this.render();
			this._data.defaultClosed = false;
			this._needsRender = false;
		}

		if (this._components['RightSidebar'+blockName].setParams) {
			this._components['RightSidebar'+blockName].setParams(params);
		}

		if (blockName == this._currentBlock) {
			return;
		}

		this._currentBlock = blockName;

		for (let name in this._components) {
			if (name.indexOf('RightSidebar') === 0 && name != 'RightSidebarTop') {
				this._components[name].setActive(false);
			}
		}

		this._components['RightSidebar'+blockName].setActive();
		this._components['RightSidebarTop'].showForBlock(blockName);

		// this._needsRender = false;
		// this.show();
		// if (blockName == 'Search') {
		// 	this.burgerToBack(true);
		// } else {
		// 	this.burgerToBack(false);
		// }
	}

	show() {
		setTimeout(()=>{
			this.$('#rightSidebar').classList.remove('rightSidebarMobileClosed');
			this.$('#rightSidebar').classList.remove('rightSidebarClosed');
		}, 10);

		document.querySelectorAll('.panelPos').forEach((el)=>el.classList.remove('panelNoSidebar'));

		this._app._config.setSetting('rightSidebarVisible', true);

		if (this._components['RightSidebar'+this._currentBlock] && this._components['RightSidebar'+this._currentBlock].afterShow) {
			this._components['RightSidebar'+this._currentBlock].afterShow();
		}

		// if (this._needsRender) {
		// 	this._needsRender = false;
		// 	this._data.isLoading = false;
		// 	alert('yes'+this._data.defaultClosed)
		// 	this.render();
		// 	this._data.defaultClosed = false;
		// 	this.$('#rightSidebar').classList.remove('rightSidebarMobileClosed');
		// 	this.$('#rightSidebar').classList.remove('rightSidebarClosed');

		// 	this.showBlock('Info');
		// 	alert('show');
		// }
	}

	moveToTop() {
		this.$('#rightSidebar').style.zIndex = 3333333;
	}

	moveFromTop() {
		this.$('#rightSidebar').style.zIndex = 50000;
	}

	onClose() {
		this.$('#rightSidebar').classList.add('rightSidebarMobileClosed');
		this.$('#rightSidebar').classList.add('rightSidebarClosed');

		document.querySelectorAll('.panelPos').forEach((el)=>el.classList.add('panelNoSidebar'));
		// this.$('#rightSidebar').closest('.panel').classList.add('panelNoSidebar');
		// this.$('#rightSidebar').closest('.panelTopBar').classList.add('panelNoSidebar');

		setTimeout(()=>{
			this.moveFromTop();
		}, 500);

		this._app._config.setSetting('rightSidebarVisible', false);
	}

	template() {
		return `
			<div class="rightSidebar rightSidebarMobileClosed {{if (options.defaultClosed)}}rightSidebarClosed{{/if}}" id="rightSidebar">
				{{component(options.components.RightSidebarTop)}}{{/component}}
				{{if (options.isLoading)}}
				<div class="appLoading">
					<div class="cssload-zenith dark"></div>
				</div>
				{{#else}}
				<div class="rightSidebarContent" id="rightSidebarContent">
					{{component(options.components.RightSidebarInfo)}}{{/component}}
					{{component(options.components.RightSidebarForward)}}{{/component}}
					{{component(options.components.RightSidebarStickers)}}{{/component}}
					{{component(options.components.RightSidebarPoll)}}{{/component}}
				</div>
				{{/if}}
			</div>
		`;
	}
};
					// {{component(options.components.RightSidebarSearch)}}{{/component}}

module.exports = RightSidebar;

const UI = window.classes.UI;
const AppIcon = require('../../../icons/AppIcon.js');
const SearchBox = require('../../LeftSidebar/SearchBox.js');

class RightSidebarTop extends UI {
	constructor(params) {
		super(params);

		this._components.BackIcon = this.newC(AppIcon, {icon: 'back'});
		this._components.CloseIcon = this.newC(AppIcon, {icon: 'close'});
		this._components.SearchBox = this.newC(SearchBox);

		this._events = [
			['click', 'rsTopIcon', 'onClickIcon'],
		];

		this._componentEvents = [
			['search', 'SearchBox', 'onSearch'],
		];

		this._data.isBackable = false;
		this._data.acitveTopBlock = 'Header';
	}

	showForBlock(blockName) {
		this._blockName = blockName;

		if (blockName == 'Search' || blockName == 'Stickers') {
			this.$('#rsSearch').classList.add('active');
			this.$('#rsHeader').classList.remove('active');
			this._data.acitveTopBlock = 'Search';
			this._components.SearchBox.setPlaceholder((blockName == 'Stickers' ? 'Search Strickers' : 'Search'));
		} else if (blockName == 'Info' || blockName == 'Poll') {
			this.$('#rsHeader').classList.add('active');
			this.$('#rsSearch').classList.remove('active');
			this._data.acitveTopBlock = 'Header';
		} else if (blockName == 'Forward') {
			this.$('#rsHeader').classList.add('active');
			this.$('#rsSearch').classList.remove('active');
			this._data.acitveTopBlock = 'Forward';
		}

		this.render();
	}


	onSearch(q) {
		if (q || this._blockName == 'Stickers') {
			this.emit('search', q);
			this._components.SearchBox.setActive(true);
		} else {
			this._components.SearchBox.setActive(false);
		}
	}

	onClickIcon() {
		if (this._data.isBackable) {
			this.emit('back');
		} else {
			this.emit('close');
		}
	}

	closeToBack(isBackable) {
		if (isBackable) {
			this.$('#rsTopIconClose').classList.remove('active');
			this.$('#rsTopIconBack').classList.add('active');
			this._data.isBackable = true;
		} else {
			this.$('#rsTopIconClose').classList.add('active');
			this.$('#rsTopIconBack').classList.remove('active');
			this._data.isBackable = false;
		}
	}

	template() {
		return `
			<div class="rightSidebarTop">
				<div class="rsTopIcon" id="rsTopIcon">
					<div class="rsTopIconItem active" id="rsTopIconClose">{{component(options.components.CloseIcon)}}{{/component}}</div>
					<div class="rsTopIconItem " id="rsTopIconBack">{{component(options.components.BackIcon)}}{{/component}}</div>
				</div>
				<div id="rsSearch" class="rsTopBlock {{if (options.acitveTopBlock == 'Search')}}active{{/if}}">
					{{component(options.components.SearchBox)}}{{/component}}
				</div>
				<div id="rsHeader" class="rsTopBlock {{if (options.acitveTopBlock == 'Header')}}active{{/if}}">
					<h5>Info</h5>
				</div>
				<div id="rsHeader" class="rsTopBlock {{if (options.acitveTopBlock == 'Forward')}}active{{/if}}">
					<h5>Forward</h5>
				</div>
			</div>
		`;
	}
};

module.exports = RightSidebarTop;

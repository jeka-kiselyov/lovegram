const UI = window.classes.UI;
const AppIcon = require('../icons/AppIcon.js');
const Icon = window.classes.Icon;
const SearchBox = require('./LeftSidebar/SearchBox.js');
// const SCBlock = require('./LeftSidebar/SCBlock.js');

const SidebarSearch = require('./LeftSidebar/SidebarSearch.js');

const SidebarMain = require('./LeftSidebar/SidebarMain.js');
const SidebarArchived = require('./LeftSidebar/SidebarArchived.js');

const SidebarFolders = require('./LeftSidebar/SidebarFolders.js');

// const SidebarEditFolder = require('./LeftSidebar/SidebarEditFolder.js');
const SidebarManageFolder = require('./LeftSidebar/SidebarManageFolder.js');

const SidebarFolderPeers = require('./LeftSidebar/SidebarFolderPeers.js');

const Menu = require('./utils/Menu.js');

class LeftSidebar extends UI {
	constructor(params) {
		super(params);

		this._data.isLoading = true;

		this._components = {
			BurgerIcon: this.newC(AppIcon, {icon: 'menu'}),
			OkIcon: this.newC(Icon, {icon: 'check'}),
			BackIcon: this.newC(AppIcon, {icon: 'back'}),
			SearchBox: this.newC(SearchBox),
			SidebarMain: this.newC(SidebarMain, {}),
			SidebarArchived: this.newC(SidebarArchived),
			SidebarSearch: this.newC(SidebarSearch),
			SidebarFolders: this.newC(SidebarFolders),
			SidebarManageFolder: this.newC(SidebarManageFolder),
			SidebarFolderPeers: this.newC(SidebarFolderPeers),
			peers: []
		};

		this._componentEvents = [
			// ['peer', 'SidebarDialogs', 'onPeerSelected'],
			['peer', 'SidebarSearch', 'onPeerSelected'],
			['search', 'SearchBox', 'onSearch'],
			['archive', 'Menu', 'onArchive'],
			['folders', 'Menu', 'onFolders'],
			['logout', 'Menu', 'onLogOut'],
			['action', 'Menu', 'onMenuAction'],
		];
		this._events = [
			['click', 'burger', 'onBurger'],
			['click', 'rburger', 'onRBurger'],
			['click', 'stOk', 'onOk'],
			// ['click', 'cTop', 'onTest'],
		];

		this._components['Menu'] = this.newC(Menu, {items: []});

		this._burgerIsBack = false;

		this._app._peerManager.on('peers',()=>{
			if (!this._currentBlock) this.showBlock('Main');
		});

		// setTimeout(()=>{
		// 	this.showBlock('Folders');
		// },2000);
	}

	onLogOut() {
		this._app._peerManager._user.logOut();
	}

	onMenuAction(action) {
		if (this._rmenu) {
			this._components['Sidebar'+this._currentBlock].onMenu(action);
		}
	}

	onOk() {
		this._components['Sidebar'+this._currentBlock].onOk();
	}

	onArchive() {
		this.showBlock('Archived');
	}

	onFolders() {
		this.showBlock('Folders');
	}

	onSwipe(dir) {
		if (dir == 'left' && this._parent._components.Panel._data.peer && !this.$().classList.contains('invisible')) {
			this._parent.showPanel();
			return true;
		}
	}

	async onBurger(e) {
		if (this._burgerIsBack) {
			// this.showBlock('Main');
			this._components.SearchBox.setActive(false);
			this.showBlock(this._back || 'Main');
		} else {
			let bc = await this._components.SidebarArchived.getBadgeCount();
			this._components['Menu'].show(e, [['archive', 'archived', 'Archived', bc],['folders', 'document', 'Manage Folders'],['logout', 'contacts', 'Logout']]);
		}
	}

	onRBurger(e) {
		// this._rmenu = [['delete', 'delete', 'Delete Folder']];
		if (this._rmenu) {
			this._components['Menu'].show(e, this._rmenu, 'rburger');
		}
	}

	// startSearch(inPeer) {
	// 	this.showBlock('Search');
	// 	this._components.SearchBox.setActive(true);
	// 	this._components.SidebarSearch.setInPeer(inPeer);
	// }

	onSearch(q) {
		if (q) {
			this.showBlock('Search');
			this._components.SidebarSearch.doSearch(q);
			this._components.SearchBox.setActive(true);
		} else {
			this._components.SearchBox.setActive(false);
			this.showBlock('Main');
		}
	}

	setPeer(peer) {
		this._components.SidebarMain.setActivePeer(peer);
		this._components.SidebarArchived.setActivePeer(peer);
	}

	onPeerSelected(data) {
		this.emit('peer', data);
		// if (!data.messageId) {
		if (this._currentBlock == 'Search') {
			this.showBlock('Main');
			this._components.SearchBox.setActive(false);
		}

		this._components.SidebarMain.setActivePeer(data.peer);
		this._components.SidebarArchived.setActivePeer(data.peer);
		// } else {
		// 	this.emit('message', data);
		// }
	}

	burgerToBack(isBackable) {
		if (isBackable) {
			this.$('#burgerBurger').classList.remove('active');
			this.$('#burgerBack').classList.add('active');
			this._burgerIsBack = true;
		} else {
			this.$('#burgerBurger').classList.add('active');
			this.$('#burgerBack').classList.remove('active');
			this._burgerIsBack = false;
		}
	}

	setTitle(title, hasOk, menuItems) {
		this.$('.stSearch').style.display = (title ? 'none' : 'block');
		this.$('.stTitle').style.display = (title ? 'block' : 'none');
		(title && (this.$('.stTitle').innerHTML = title)); // we are not escaping html here. Note!!

		if (menuItems && menuItems.length) {
			this._rmenu = menuItems;
			this.$('#rburger').classList.add('visible');
			this.$('.stOk').style.display = 'none';
		} else {
			this._rmenu = null;
			this.$('.stOk').style.display = (hasOk ? 'block' : 'none');
			this.$('#rburger').classList.remove('visible');
		}
	}

	// onTest() {
	// 	if (this._currentBlock == 'Search')
	// 		this.showBlock('Dialogs');
	// 	else
	// 		this.showBlock('Search');

	// }

	showBlock(blockName, params) {
		if (this._data.isLoading) {
			this._data.isLoading = false;
			this.render();
		}

		this._currentBlock = blockName;

		for (let name in this._components) {
			if (name.indexOf('Sidebar') === 0) {
				this._components[name].setActive(false);
			}
		}

		if (blockName == 'Search' || this._components['Sidebar'+blockName]._title) {
			this.burgerToBack(true);
			this._back = this._components['Sidebar'+blockName]._back;
		} else {
			this.burgerToBack(false);
		}

		this.setTitle(this._components['Sidebar'+blockName]._title, this._components['Sidebar'+blockName]._hasOk);
		this._components['Sidebar'+blockName].setActive(true, params);
		// if (this._components['Sidebar'+blockName]._title) {

		// }

		// (this._parent.setTitle && this._parent.setTitle(this._title));
		// if (blockName == 'Archived') {
		// 	this.setTitle('Archived Chats');
		// } else {
		// 	this.setTitle();
		// }
	}

	template() {
		return `
			<div class="leftSidebar">
				{{if (options.isLoading)}}
				<div class="appLoading">
					<div class="cssload-zenith dark"></div>
				</div>
				{{#else}}
				<div class="sidebarTop" id="cTop">
					{{component(options.components.Menu)}}{{/component}}
					<div class="burger" id="burger">
						<div class="burgerItem active" id="burgerBurger">{{component(options.components.BurgerIcon)}}{{/component}}</div>
						<div class="burgerItem" id="burgerBack">{{component(options.components.BackIcon)}}{{/component}}</div>
					</div>
					<div class="stSearch">
						{{component(options.components.SearchBox)}}{{/component}}
					</div>
					<div class="stOk" id="stOk">
						{{component(options.components.OkIcon)}}{{/component}}
					</div>
					<div class="rburger" id="rburger">
						<div class="burgerItem active" id="burgerBurger">{{component(options.components.BurgerIcon)}}{{/component}}</div>
					</div>
					<div class="stTitle">
					</div>
				</div>

				<div class="sidebarContent" id="sidebarContent">
					{{component(options.components.SidebarMain)}}{{/component}}
					{{component(options.components.SidebarArchived)}}{{/component}}
					{{component(options.components.SidebarSearch)}}{{/component}}
					{{component(options.components.SidebarFolders)}}{{/component}}
					{{component(options.components.SidebarManageFolder)}}{{/component}}
					{{component(options.components.SidebarFolderPeers)}}{{/component}}
				</div>
				{{/if}}
			</div>
		`;
	}
};

					// {{component(options.components.SidebarArchived)}}{{/component}}
module.exports = LeftSidebar;

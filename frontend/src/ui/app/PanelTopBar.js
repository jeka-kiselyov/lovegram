const AppIcon = require('../icons/AppIcon.js');
const Button = window.classes.Button;
const AppUI = require('../../utils/AppUI.js');
const SearchBox = require('./LeftSidebar/SearchBox.js');
const Menu = require('./utils/Menu.js');
const Icon = window.classes.Icon;

class PanelTopBar extends AppUI {
	constructor(params) {
		super(params);

		this._peerManager = this._app._peerManager;

		this._events = [
			['click', 'panelBack', 'backToDialogs'],
			['click', 'panelSearch', 'onStartSearch'],
			['click', 'panelMute', 'onMute'],
			['click', 'panelUnMute', 'onMute'],
			['click', 'panelAvatar', 'onShowMore'],
			['click', 'panelMeta', 'onShowMore'],
			['click', 'ptpPause', 'onPause'],
			['click', 'ptpMeta', 'onAudioMessage'],
			['click', 'ptpClose', 'onAudioClose'],
			['click', 'panelMore', 'onBurger'],

			['click', 'sccPrev', 'prevSearch'],
			['click', 'sccNext', 'nextSearch'],
		];

		this._components['SubsButton'] = this.newC(Button, {title: 'Subscribe', loadingTitle: 'Subscribing...'});
		this._components['BackIcon'] = this.newC(AppIcon, {icon: 'back'});
		this._components['SearchIcon'] = this.newC(AppIcon, {icon: 'search'});
		this._components['MuteIcon'] = this.newC(AppIcon, {icon: 'muted'});
		this._components['UnMuteIcon'] = this.newC(AppIcon, {icon: 'unmute'});
		this._components['MoreIcon'] = this.newC(AppIcon, {icon: 'more'});
		this._components.SearchBox = this.newC(SearchBox);

		this._components.IconDown = this.newC(Icon, {flip: true});
		this._components.IconUp = this.newC(Icon);

		this._components['Menu'] = this.newC(Menu, {items: [['search', 'search', 'Search'], ['mute', 'muted', 'Mute']]});

		this._componentEvents = [
			['click', 'SubsButton', 'onSubs'],
			['search', 'Menu', 'onStartSearch'],
			['search', 'SearchBox', 'onSearch'],
		];

		this._data.peer = params.peer || null;
		this._data.isLoading = true;
		this._data.sidebarIsClosed = true;

		this._peerManager.on('subscribed', (params)=>{
			if (params.peer._id == this._data.peer._id) {
				const el = this.$('.panelSubs');
				if (this._data.peer.isSubscribed()) {
					el.classList.remove('visible');
				} else {
					el.classList.add('visible');
				}
			}
		});

		this._peerManager.on('updated', (params)=>{
			if (params.peer && params.peer._id == this._data.peer._id) {
				const m = params.peer.isMuted();
				this.$('#panelMute').classList[m ? 'remove' : 'add']('visible');
				this.$('#panelUnMute').classList[m ? 'add' : 'remove']('visible');

				this.$('.panelTitle').innerHTML = this.escapeHTML(this._data.peer.getDisplayName());
			}


		});

		this._app._mediaPlayer.on('pause', (params)=>{
			// alert('pause'+params.messageAudio.id);
			this.itemPlaying(params.messageAudio, false);
		});
		this._app._mediaPlayer.on('play', (params)=>{
			// alert('play'+params.messageAudio.id);
			this.itemPlaying(params.messageAudio, true);
		});

		// setTimeout(()=>{
		// 	this.onStartSearch();
		// }, 1000);

		this._searchCount = 0;
		this._searched = [];
		this._searchCache = {};

		this._avatarsMemory = {};
		// this._avatarsMemoryC = {};
	}

	/**
	 * Push avatar dom element to dom memory, so we can reuse it as soon as we want to update top bar
	 */
	avatarToMemory(peerId, el) {
		console.error(el);
		if (!el.dataset.loaded) return;
		const avm = document.querySelector('#avmemory');
		const av = el.cloneNode();
		if (!this._avatarsMemory[peerId]) {
			this._avatarsMemory[peerId] = av;
			// this._avatarsMemoryC[peerId] = 1;
			avm.appendChild(av);
		}
	}

	onBurger(e) {
		this._components.Menu.show(e);
	}

	onSwipe(dir) {
		if (['left', 'right'].indexOf(dir) == -1 || this.$().classList.contains('invisible')) {
			return;
		}
		if (dir == 'right') {
			this._parent.showDialogs();
			return true;
		}
		if (dir == 'left') {
			this.onShowMore();
			return true;
		}
	}

	onAudioClose() {
		this.$('.panelTopPlayer').classList.remove('visible');
	}

	onPause() {
		this._app._mediaPlayer.pausePlaying();
	}

	onAudioMessage() {
		try {
			let messageId = this._app._mediaPlayer._playingAudio._messageApiObject.id;
			this._parent._components.Panel.jumpToMessage(messageId);
		} catch(e) {}
	}

	itemPlaying(messageAudio, playing) {
		if (playing) {
			this.$('.panelTopPlayer').classList.add('visible');
			if (messageAudio.isVoice) {
				this.$('.ptpTrack').innerHTML = 'Voice Message';
			} else {
				this.$('.ptpTrack').innerHTML = messageAudio.getInfo('title');
			}
			this.$('.ptpArtist').innerHTML = messageAudio.getInfo('performer');
		} else {
			this.$('.panelTopPlayer').classList.remove('visible');
		}

	}


	onMute() {
		this._data.peer.toggleDialogMuted(!this._data.peer.isMuted());
	}

	onSubs() {
		let b = true;
		if (this._data.peer.isSubscribed()) {
			b = false;
		}
		this._data.peer.subscribe(b);
	}

	onShowMore() {
		this._parent._components.RightSidebar.showBlock('Info');
		this._parent._components.RightSidebar.show();
	}

	hideSearch() {
		try {
			this._searchCount = 0;
			this.$('.panelTopBar').classList.remove('inSearch');
			this.$('.searchControl').classList.remove('active');
			this._components.SearchBox.setActive(false);
		} catch(e) {}
	}

	backToDialogs() {
		if (this.$('.panelTopBar').classList.contains('inSearch')) {
			this.hideSearch();
		} else {
			this.emit('toDialogs');
		}
	}

	onStartSearch() {
		this.$('.panelTopBar').classList.add('inSearch');
		this.$('.searchControl').classList.add('active');
		this.$('.sccInfo').classList.remove('active');
		this._components.SearchBox.setActive(true);
		this._components.SearchBox.focus();
		this._searchCount = 0;
		// alert('start search')
		// this._parent._components.RightSidebar.onSearch();
	}

	prevSearch() {
		if (this._lastSearchN == this._searchCount - 1) return;
		this.jumpToSearch(this._lastSearchN+1);
	}

	nextSearch() {
		if (!this._lastSearchN) return;
		this.jumpToSearch(this._lastSearchN-1);
	}

	uc() {
		this.$('#sccNext').classList[((this._lastSearchN == 0 || !this._searchCount) ? 'add' : 'remove')]('inactive');
		this.$('#sccPrev').classList[((!this._searchCount || this._lastSearchN >= this._searchCount-1) ? 'add' : 'remove')]('inactive');
	}

	jumpToSearch(i) {
		this._lastSearchN = i;

		this.$('.sccInfo').classList[(this._searchCount ? 'add' : 'remove')]('visible');
		this.$('.sccInfo').innerHTML = ''+(i+1)+' of '+this._searchCount;

		this.uc();

		console.error(this._searched[i]);

		this._parent._components.Panel.jumpToMessage(this._searched[i].peerMessage._id, this._lastSearch);
	}

	doSearch(q) {
		if (this.__searchTimeout) {
			clearTimeout(this.__searchTimeout);
		}

		setTimeout(async()=>{
			let data = null;
			if (this._searchCache[q]) {
				data = this._searchCache[q];
			} else {
				data = await this._peerManager.search(q, this._data.peer);
				this._searchCache[q] = data;
			}

			this._lastSearch = q;
			// let data = await this._peerManager.search(q, this._data.peer);
			// console.error(data);
			// for (let item of data.messages) {
			//

			this._searchCount = data.totalMessages;
			this._searched = data.messages;

			this.jumpToSearch(0);
		}, 100);
	}

	onSearch(q) {
		if (q) {
			// this._components.SidebarSearch.doSearch(q);
			this._components.SearchBox.setActive(true);
			this.doSearch(q);
		} else {
			this.hideSearch();
			// this.showBlock('Main');
		}
	}

	updateInfo() {
		this.$('.panelInfo').innerHTML = this._data.peer.getInfoString();
	}

	setPeer(peer) {
		if (!peer || (this._data.peer && this._data.peer._id == peer._id)) {
			return true;
		}
		if (!peer) {
			return false;
		}



		this.hideSearch();
		this._searchCache = {};

		if (this._data.peer) {
			// update
			this.$('.panelTitle').innerHTML = this.escapeHTML(peer.getDisplayName());
			let infoString = peer.getInfoString();
			this.$('.panelInfo').innerHTML = this.escapeHTML(infoString);
			this.$('.panelInfo').classList[((infoString == 'online') ? 'add' : 'remove')]('panelInfoOnline');

			if (!this._avatarsMemory[peer._id]) {
				this.$('.panelAvatar').innerHTML = this.avHTML(peer, 'panelTopAvatar avatarMedium');
			} else {
				this.$('.panelAvatar').innerHTML = `<div class="panelTopAvatar avatarMedium wantmemory avatar" id="avatar_${this._domId}_${peer._id}" data-id="${peer._id}"></div>`;
				// this.nextTick(()=>{
					let node = this._avatarsMemory[peer._id];
					this.$('.wantmemory').appendChild(node);
					this._avatarsMemory[peer._id] = null;
				// });
			}

			const m = peer.isMuted();
			this.$('#panelMute').classList[m ? 'remove' : 'add']('visible');
			this.$('#panelUnMute').classList[m ? 'add' : 'remove']('visible');

			this.$('.panelSubs').classList[(!peer.isSubscribed() ? 'add' : 'remove')]('visible');
			//
			this._data.peer = peer;

		} else {
			if (this._app._config.getSetting('rightSidebarVisible')) {
				this._data.sidebarIsClosed = false;
			} else {
				this._data.sidebarIsClosed = true;
			}

			this._data.peer = peer;
			this.render();
		}

		peer.getFullInfo()
			.then(()=>{
				this.updateInfo();
				this.$('.panelTitle').innerHTML = this.escapeHTML(peer.getDisplayName());
			});
		// peer.on('info', ()=>{
		// 		this.updateInfo();
		// 	});


	}

	template() {
		return `
			{{if (!options.peer)}}
			{{#else}}
				<div class="panelTopBar panelPos {{if (options.sidebarIsClosed)}}panelNoSidebar{{/if}}">
					<div class="panelIcon panelBack" id="panelBack">
						{{component(options.components.BackIcon)}}{{/component}}
					</div>
					<div class="panelAvatar" id="panelAvatar">
						{{self.avHTML(options.peer, 'panelTopAvatar avatarMedium')|safe}}
					</div>
					<div class="panelMeta" id="panelMeta">
						<div class="panelTitle">{{peer.getDisplayName()}}</div>
						{{js(options.infoString = options.peer.getInfoString())/}}
						<div class="panelInfo {{if (options.infoString == 'online')}}panelInfoOnline{{/if}}">{{infoString}}</div>
					</div>

					<div class="panelActions">
						<div class="panelIcon panelMuted {{if (!options.peer.isMuted())}}visible{{/if}}" id="panelMute">
							{{component(options.components.MuteIcon)}}{{/component}}
						</div>
						<div class="panelIcon panelMuted {{if (options.peer.isMuted())}}visible{{/if}}" id="panelUnMute">
							{{component(options.components.UnMuteIcon)}}{{/component}}
						</div>
						<div class="panelIcon panelSearch" id="panelSearch">
							{{component(options.components.SearchIcon)}}{{/component}}
						</div>
						<div class="panelIcon panelMore" id="panelMore">
							{{component(options.components.MoreIcon)}}{{/component}}
						</div>
						<div class="panelMenu"></div>
					</div>

					<div id="panelSearchBox">
						{{component(options.components.SearchBox)}}{{/component}}
					</div>

					<div class="panelSubs {{if (!options.peer.isSubscribed())}}visible{{/if}}">{{component(options.components.SubsButton)}}{{/component}}</div>

					<div class="panelTopPlayer">
						<div class="panelIcon ptpPause" id="ptpPause">${AppUI.getIconHTML('pause')}</div>
						<div class="panelIcon ptpClose" id="ptpClose">${AppUI.getIconHTML('close')}</div>
						<div class="ptpMeta" id="ptpMeta">
							<div class="ptpArtist"></div>
							<div class="ptpTrack"></div>
						</div>
					</div>

					{{component(options.components.Menu)}}{{/component}}

				</div>
				<div class="searchControl">
				<div class="panelPos searchControlCont {{if (options.sidebarIsClosed)}}panelNoSidebar{{/if}}">
					<div class="sccInfo">

					</div>
					<div class="panelActions">
						<div class="panelIcon inactive" id="sccPrev">{{component(options.components.IconUp)}}{{/component}}</div>
						<div class="panelIcon inactive" id="sccNext">{{component(options.components.IconDown)}}{{/component}}</div>
					</div>
				</div>
				</div>
			{{/if}}
		`;
	}
};

module.exports = PanelTopBar;

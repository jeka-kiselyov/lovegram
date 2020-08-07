
const SidebarAbstract = require('./SidebarAbstract.js');
const SearchBlock = require('./SearchBlock.js');
// const AppIcon = require('../../icons/AppIcon.js');

class SidebarSearch extends SidebarAbstract {
	constructor(params) {
		super(params);

		this._components = {
			// CloseIcon: this.newC(AppIcon, {icon: 'close'}),
			messages: [],
			local: [],
			global: [],
		};

		this._events = [
			['click', 'sidebarSearch', 'onPeerClick'],
			['click', 'inPeerRemove', 'onPeerRemove'],
		];

		this._lastDataWithResults = null;
		this._lastSearch = null;

		this._avatarsMemory = {};
		this._avatarsMemoryC = {};
	}

	// setInPeer(inPeer) {
	// 	this._data.inPeer = inPeer;
	// 	this._lastDataWithResults = null;
	// 	this._components.messages = [];
	// 	this._components.local = [];

	// 	this.render();
	// }

	// onPeerRemove() {
	// 	this._data.inPeer = null;
	// 	this._lastDataWithResults = null;
	// 	this._components.messages = [];
	// 	this._components.local = [];

	// 	// this.render();
	// 	if (this._lastSearch) {
	// 		this.doSearch(this._lastSearch);
	// 	}
	// }

	onPeerClick(e) {
		const base = this.$();
		const closest = e.target.closest('.scBlock');

		if (closest && base.contains(closest)) {
			const peerId = closest.dataset.id;
			const messageId = closest.dataset.messageId;
			const peer = this._peerManager.peerById(peerId);

			this.emit('peer', {
				peer: peer,
				messageId: messageId
			});
		}
	}

	avatarsToMemory() {
		const avm = document.querySelector('#avmemory');
		this.$$('.scBlock').forEach((el)=>{
			let id = el.dataset.id;
			if (!this._avatarsMemory[id]) { this._avatarsMemory[id] = []; this._avatarsMemoryC[id] = 0; }
			let av = el.querySelector('.avatarBack');
			console.error(av.dataset.loaded);

			if (el.dataset.loaded || av.dataset.loaded) {
				this._avatarsMemory[id].push(av);
				this._avatarsMemoryC[id] = this._avatarsMemory[id].length;
				avm.appendChild(av);
			}
		});
	}

	async doSearch(q) {
		this._lastSearch = q;
		let data = await this._peerManager.search(q, this._data.inPeer);
		if (q != this._lastSearch) {
			// we are late
			return;
		}

		this._components.messages = [];
		this._components.local = [];
		this._components.global = [];

		let hasSomething = false;

		console.error(data);

		try {
			if (!data || (!data.messages.length && !data.local.length && !data.global.length)) {
				data = this._lastDataWithResults;
			}
		} catch(e) {
		}

		if (data) {
			if (data.messages) {
				for (let item of data.messages) {
					this._components.messages.push(this.newC(SearchBlock, {peer: item.peer, peerMessage: item.peerMessage, search: q}));
					hasSomething = true;
				}
			}
			if (data.local && !this._data.inPeer) {
				for (let peer of data.local) {
					if (peer.hasMessages()) {
						this._components.local.push(this.newC(SearchBlock, {peer: peer, search: q}));
						hasSomething = true;
					}
					// console.error(peer);
				}
			}
			for (let peer of data.global) {
				this._components.global.push(this.newC(SearchBlock, {peer: peer, search: q}));
			}
		}

		if (hasSomething) {
			this._lastDataWithResults = data;
		}

		this.avatarsToMemory();
		// setTimeout(()=>{
		this.render();
		this.$$('.wantmemory').forEach((el)=>{
			let id = el.dataset.id;
			if (this._avatarsMemory && this._avatarsMemory[id] && this._avatarsMemory[id].length) {
				let node = this._avatarsMemory[id].shift();
				node.dataset.loaded = 1;
				console.error('appended cloned', node);
				el.appendChild(node);
			}
		});
		// }, 100);
	}
				// {{if (options.inPeer)}}
				// <div class="sidebarSearchBlock">
				// 	<h3>Search messages in</h3>

				// 	<div class="scBlockLow">

				// 		<div class="avatar" id="avatar_{{inPeer._id}}">
				// 			<div class="avatarBack" style="background-image: url('{{ inPeer.getCachedAvatarURL() }}');"></div>
				// 			<div class="avatarInitials avatarC{{ inPeer.getAvatarColor() }}">{{ inPeer.getAvatarInitials() }}</div>
				// 		</div>

				// 		<div class="scBlockLowTitle">{{inPeer.getDisplayName()}}</div>

				// 		<div class="scBlockLowIcon" id="inPeerRemove">
				// 			{{component(options.components.CloseIcon)}}{{/component}}
				// 		</div>

				// 	</div>

				// </div>
				// {{/if}}
	template() {
		return `
			<div class="sidebarSearch sidebarBlock {{if (options.active)}} active{{/if}}" id="sidebarSearch">
				<div class="sidebarScroll">
					{{if (options.components.local.length)}}
					<div class="sidebarSearchBlock">
						<h3>Chats</h3>

						{{each(options.components.local)}}
							{{component(@this)}}{{/component}}
						{{/each}}
					</div>
					{{/if}}
					{{if (options.components.global.length)}}
					<div class="sidebarSearchBlock">
						<h3>Global Search</h3>

						{{each(options.components.global)}}
							{{component(@this)}}{{/component}}
						{{/each}}
					</div>
					{{/if}}
					{{if (options.components.messages.length)}}
					<div class="sidebarSearchBlock">
						<h3>Messages</h3>

						{{each(options.components.messages)}}
							{{component(@this)}}{{/component}}
						{{/each}}
					</div>
					{{/if}}
				</div>
			</div>
		`;
	}
};

module.exports = SidebarSearch;
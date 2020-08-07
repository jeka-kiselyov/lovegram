const SidebarAbstract = require('./SidebarAbstract.js');
const PeerBlock = require('./PeerBlock.js');
const AppIcon = require('../../icons/AppIcon.js');

class SidebarFolderPeers extends SidebarAbstract {
	constructor(params) {
		super(params);

		this._title = 'Peers';
		this._back = 'ManageFolder';
		this._hasOk = true;

		this._components = {
			CloseIcon: this.newC(AppIcon, {icon: 'close'}),
			peerBlocks: [],
		};
		// this._components.include = [];
		// this._components.exclude = [];

		this._events = [
			['keydown', 'forwardFilter'+this._domId, 'onFilter'],
			['click', 'sidebarForwardSelectedItem_1'+this._domId, 'removePeer1'],
			['click', 'sidebarForwardSelectedItem_2'+this._domId, 'removePeer2'],
			['click', 'sidebarForwardPeers'+this._domId, 'onPeerClick'],
			['click', 'sidebarForwardTypes'+this._domId, 'onTypeClick'],
			// ['scroll', 'sidebarForwardScroll', 'onScroll'],
		];

		this._selectedPeers = [];
		this._initializedPeersIds = [];
		this._filterQ = '';
		this._hasMePeer = false;

		this._apiPath = 'include_peers';
	}

	async init(params) {
		this._folder = params ? params.folder : null;

		this._data.active = true;

		this._cs = {
			include: {},
			exclude: {},
		};

		this._posa = ['bots', 'contacts', 'non_contacts','groups','broadcasts'];
		this._apiPath = 'include_peers';

		if (params.exclude) {
			this._posa = ['exclude_muted','exclude_read','exclude_archived'];
			this._apiPath = 'exclude_peers';
		}

		this._selectedPeers = [];


		await this.initPeers();
		this.render();
		this.appendPeers();
		this.peersChanged();
	}

	afterActive(params) {
		this._params = params;

		this.nextTick(()=>{
			this.init(params);
		});
		//

		this._parent.setTitle((params.exclude ? 'Ex' : 'In')+'cluded Chats', true);
	}

	isPeerSelected(peer) {
		for (let s of this._selectedPeers) {
			if (s._id && peer._id && (s._id == peer._id)) return true;
			if (!s._id && !peer._id && (s == peer)) return true;
		}
	}

	togglePeer(peer, on) {
		if (peer._id) {
			// peer
			if (on) {
				if (!this.isPeerSelected(peer)) {
					this._selectedPeers.push(peer);
					this._folder.appPeerAPI(peer, this._apiPath);
				}
			} else {
				this._selectedPeers = this._selectedPeers.filter(function(p){ return (!p._id || p._id != peer._id); });
				this._folder.removePeerAPI(peer, this._apiPath);
			}
		} else {
			// type
			let aptype = (this._params.exclude ? 'exclude_'+peer : peer);
			this._folder._apiObject[aptype] = on;
			this._folder._apiObject.pFlags[aptype] = on;
			if (on) {
				if (!this.isPeerSelected(peer)) {
					this._selectedPeers.push(aptype);
				}
			} else {
				this._selectedPeers = this._selectedPeers.filter(function(p){ return (p._id || p != peer); });
			}
		}
	}

	onTypeClick(e) {
		const type = e.target.closest('.scBlock').dataset.id;

		for (let k in this._cs.include) {
			const peerBlock = this._cs.include[k];
			if (peerBlock._data.type == type) {
				let isSelected = peerBlock.toggle();
				this.togglePeer(type, isSelected);

				// let aptype = (this._params.exclude ? 'exclude_'+type : type);

				// if (isSelected) {
				// 	this._selectedPeers.push(type);
				// 	this._folder._apiObject[aptype] = true;
				// 	this._folder._apiObject.pFlags[aptype] = true;
 			// 	} else {
				// 	this._selectedPeers = this._selectedPeers.filter(function(peer){ return peer != type; });
				// 	this._folder._apiObject[aptype] = false;
				// 	this._folder._apiObject.pFlags[aptype] = false;
				// }

				this.peersChanged();
			}
		}
	}

	onPeerClick(e) {
		const peerId = e.target.closest('.scBlock').dataset.id;
		const peer = this._peerManager.peerById(peerId);

		for (let peerBlock of this._components.peerBlocks) {
			if (peerBlock._data.peer._id == peerId) {
				let isSelected = peerBlock.toggle();
				this.togglePeer(peer, isSelected);

				// if (isSelected) {
				// 	this._selectedPeers.push(peer);
				// 	this._folder.appPeerAPI(peer, this._apiPath);
				// } else {
				// 	this._selectedPeers = this._selectedPeers.filter(function(peer){ return peer._id != peerId; });
				// 	this._folder.removePeerAPI(peer, this._apiPath);
				// }

				this.peersChanged();
			}
		}
	}

	onOk() {
		this._parent.onBurger();
	}


	setPeerViewItem(peer, el) {
		console.error(peer);

		let dName = '';
		if (peer.getDisplayName) {
			let dNames = peer.getDisplayName();
			dName = this.escapeHTML(dNames.split(' ')[0]);
		} else {
			dName = peer.split('exclude_').join('');
			dName = dName.charAt(0).toUpperCase() + dName.slice(1).split('_').join('&nbsp;');
		}

		el.querySelector('span').innerHTML = dName;

		if (peer.isMine && peer.isMine()) {
			el.querySelector('.avatarBack').style.backgroundImage = "";
			el.querySelector('.avatarBack').classList.add('avatarMine');
		} else {
			el.querySelector('.avatarBack').classList.remove('avatarMine');

			if (peer.hasAvatar) {
				// peer
				if (peer.hasAvatar()) {
					el.querySelector('.avatarBack').style.backgroundImage = "url('"+peer.getAvatarBlobURLSync()+"')";
				} else {
					el.querySelector('.avatarBack').style.backgroundImage = "none";
					el.querySelector('.avatarInitials').innerHTML = this.escapeHTML(peer.getAvatarInitials());
					el.querySelector('.avatarInitials').classList = 'avatarInitials avatarC'+peer.getAvatarColor();
				}
				el.querySelector('.avatarInitials').classList.remove('avatarType');
			} else {
				// type
				el.querySelector('.avatarInitials').classList.add('avatarType');
				el.querySelector('.avatarBack').style.backgroundImage = "none";
				el.querySelector('.avatarInitials').innerHTML = this.AppUI.getIconHTML(peer.split('exclude_').join(''));
			}

		}
	}

	peersChanged() {
		console.error(this._selectedPeers)
		if (this._selectedPeers.length) {
			// this.$('.sidebarForwardSend').classList.add('active');

			// 1st
			this.setPeerViewItem(this._selectedPeers[0], this.$('.sidebarForwardSelectedItem_1'));
			this.$('.sidebarForwardSelectedItem_1').style.display = 'block';

			if (this._selectedPeers.length == 2) {
				this.$('.sidebarForwardSelectedItem_more').style.display = 'none';
				this.$('.sidebarForwardSelectedItem_2').style.display = 'block';
				this.setPeerViewItem(this._selectedPeers[1], this.$('.sidebarForwardSelectedItem_2'));
			} else if (this._selectedPeers.length == 1) {
				// show
				this.$('.sidebarForwardSelectedItem_2').style.display = 'none';
				this.$('.sidebarForwardSelectedItem_more').style.display = 'none';
			} else {
				// > 2
				this.setPeerViewItem(this._selectedPeers[1], this.$('.sidebarForwardSelectedItem_2'));
				this.$('.sidebarForwardSelectedItem_2').style.display = 'block';
				this.$('.sidebarForwardSelectedItem_more').style.display = 'block';

				let moreCount = this._selectedPeers.length - 2;
				this.$('.sidebarForwardSelectedItem_more').querySelector('.avatarInitials').innerHTML = '+'+moreCount;
			}

		} else {
			this.$('.sidebarForwardSelectedItem_1').style.display = 'none';
			this.$('.sidebarForwardSelectedItem_2').style.display = 'none';
			this.$('.sidebarForwardSelectedItem_more').style.display = 'none';

			// this.$('.sidebarForwardSend').classList.remove('active');
		}

	}

	removePeer(i) {
		if (this._selectedPeers.length > i) {
			let remArr = this._selectedPeers.splice(i, 1);
			if (remArr.length) {
				this.togglePeer(remArr[0], false);
				for (let peerBlock of this._components.peerBlocks) {
					if (peerBlock._data.peer._id == remArr[0]._id) {
						peerBlock.off();
					}
				}
				for (let pa in this._cs.include) {
					if (pa == remArr[0]) {
						this._cs.include[pa].off();
					}
				}
			}
		}
		this.peersChanged();
	}

	removePeer1() {
		this.removePeer(0);
	}

	removePeer2() {
		this.removePeer(1);
	}

	filterDOM() {
		let peerEls = this.$$('.scBlock');
		for (let peerEl of peerEls) {
			if (!this._filterQ || (peerEl.dataset && (!peerEl.dataset.search || peerEl.dataset.search.indexOf(this._filterQ) != -1))) {
				peerEl.style.display = 'block';
			} else {
				peerEl.style.display = 'none';
			}
		}
	}

	onFilter() {
		this.nextTick(()=>{
			this._filterQ = (''+this.$('.forwardFilter').value).trim().toLowerCase();
			this.loadMorePeers();
			this.filterDOM();
		});
	}

	initPeers() {
		this._components.peerBlocks = [];
		this._initializedPeersIds = [];

		for (let peer of this._app._peerManager._sortedPeers) {
			if (peer._peerUser && peer._peerUser.isMe()) {
				this._hasMePeer = true;
				this._components.peerBlocks.unshift(this.newC(PeerBlock, {peer: peer, info: peer.getInfoType()}));
			} else {
				if (peer.readyToUse()) {
					this._components.peerBlocks.push(this.newC(PeerBlock, {peer: peer, info: peer.getInfoType()}));
				}
			}
			this._initializedPeersIds.push(peer._id);
		}

		return this._components.peerBlocks;
	}

	async fullfillPeers() {
		let maxTries = 3;
		let cTry = 0;
		const el = this.$('.sidebarScroll');
		const peers = this.$('.sidebarForwardPeers');

		try {

			if (!this._hasMePeer) {
				const mePeer = await this._peerManager.getMePeer();

				if (mePeer) {
					// this._components.peerBlocks.unshift(this.newC(PeerBlock, {peer: mePeer})); // should be first
					this._hasMePeer = true;
				}
			}
			// no need to sort after render
			// else {
			// 	// move me to the top
			// 	let index = null;
			// 	for (let i = 0; i < this._components.peerBlocks.length; i++) {
			// 		if (this._components.peerBlocks[i]._data.peer.isMine()) {
			// 			index = i;
			// 			break;
			// 		}
			// 	}

			// 	if (index !== null) {
			// 		let ra = this._components.peerBlocks.splice(index, 1);
			// 		this._components.peerBlocks.unshift(ra[0]);
			// 	}
			// }

		} catch(e) { console.error(e); }

		this.appendPeers();

		do {
			cTry++;

			if (el.clientHeight > peers.clientHeight && this._peerManager._thereReMorePeers) {
				await new Promise((res)=>{ setTimeout(res, 500); });
				await this.loadMorePeers();
			}
		} while(cTry < maxTries);

	}

	appendPeers() {
		const parentNode = this.$('.sidebarForwardPeers');

		for (let peer of this._app._peerManager._sortedPeers) {
			if (this._initializedPeersIds.indexOf(peer._id) === -1) {
					console.error(peer._id);

				if (peer.canSendMessageTo()) {
					let c = this.newC(PeerBlock, {peer: peer});
					let html = c.render();

					if (this._folder.isPeerIn(peer, this._apiPath)) {
						parentNode.insertAdjacentHTML('afterbegin', html);
					} else {
						parentNode.insertAdjacentHTML('beforeend', html);
					}

					this._components.peerBlocks.push(c);
				} else {
					console.error(peer);
				}
				this._initializedPeersIds.push(peer._id);
			}
		}

		this.rePeers();
	}

	rePeers() {
		for (let c of this._components.peerBlocks) {
			if (this._folder.isPeerIn(c._data.peer, this._apiPath)) {
				c.on();
				this._selectedPeers.push(c._data.peer);
			} else {
				c.off();
			}
		}

		this.peersChanged();
	}

	async loadMorePeers() {
		let q = this._filterQ;

		this.$('.loadingMore').classList.add('active');

		if (q) {
			let data = await this._peerManager.search(q);
		} else {
			await this._peerManager.loadPeers();
		}

		this.appendPeers();
		this.filterDOM();

		this.$('.loadingMore').classList.remove('active');
	}

	async rerender() {
		// const peers = await this._folder.getPeers();
		let cnt = 0;

		// const upMore = (ref, cont) => {
		// 	cont.style.display = (ref.length ? 'block' : 'none');
		// 	cont.querySelector('.scBlockTitle').innerHTML = 'Show '+ref.length+' more chat'+(ref.length > 1 ? 's' : '');
		// }

		const upd = (ref, cont) => {
			// let cnt = 0;
			for (let pa of this._posa) {
				if (!ref[pa]) {
					// add pa
					const c = this.newC(PeerBlock, {type: pa.split('exclude_').join('')});
					// this._components.include.push(c);
					ref[pa] = c;
					// cnt++;
					cont.insertAdjacentHTML('beforeend', c.render({withdiv: true, noDOM: true}));
				}

				// if (this._folder._apiObject.pFlags[pa]) {
				// ref[pa][(!!this._folder._apiObject.pFlags[pa] ? 'on' : 'off')]();
				if (this._folder._apiObject.pFlags[pa]) {
					ref[pa].on();
					this._selectedPeers.push(pa);
				} else {
					ref[pa].off();
				}
				// }

				// else if (ref[pa]) {
				// 	if (!this._folder._apiObject.pFlags[pa]) {
				// 		// remove pa
				// 		// this.$('#'+ref[pa]._domId).remove();
				// 		// for (let i = 0; i < this._components.include.length; i++) {
				// 		// 	if (this._components.include[i]._domId == this._cs.include[pa]._domId) {
				// 		// 		this._components.include.splice(i, 1); break;
				// 		// 	}
				// 		// }
				// 		// delete ref[pa];
				// 	} else {
				// 		cnt++;
				// 	}
				// }
			}

			this.peersChanged();

			return cnt;
		}

		cnt = upd(this._cs.include, this.$('.sfpFoldersList_include'));
		// upMore(this._folder._apiObject.include_peers, this.$('.scBlockMore_include'));

		// console.error(this._folder._apiObject);
		// for (let pa of posa) {
		// 	if (!this._cs.include[pa] && this._folder._apiObject.pFlags[pa]) {
		// 		// add pa
		// 		const c = this.newC(PeerBlock, {type: pa});
		// 		// this._components.include.push(c);
		// 		this._cs.include[pa] = c;
		// 		this.$('#sfpFoldersList_include').insertAdjacentHTML('beforeend', c.render({withdiv: true, noDOM: true}));
		// 	} else if (this._cs.include[pa] && !this._folder._apiObject[pa]) {
		// 		// remove pa
		// 		this.$('#'+this._cs.include[pa]._domId).remove();
		// 		// for (let i = 0; i < this._components.include.length; i++) {
		// 		// 	if (this._components.include[i]._domId == this._cs.include[pa]._domId) {
		// 		// 		this._components.include.splice(i, 1); break;
		// 		// 	}
		// 		// }
		// 		delete this._cs.include[pa];
		// 	}
		// }

		// posa = ['exclude_muted','exclude_read','exclude_archived'];

		// upd(this._cs.exclude, this.$('.sfpFoldersList_exclude'));
		// upMore(this._folder._apiObject.exclude_peers, this.$('.scBlockMore_exclude'));

		this.reinitScrollBar(true);
		// add peers if < 5
	}

	afterRender() {
		if (!this._data.active) return;
		this.rerender();
	}


	template() {
		return `
			<div class="manageFolder sidebarBlock {{if (options.active)}} active{{/if}}" id="manageFolder_{{domId}}">
			{{if (!options.active)}}
				<div class="appLoading">
					<div class="cssload-zenith dark"></div>
				</div>
			{{#else}}
				<div class="sidebarScroll">

				<div class="sidebarForwardSelector">
					<div class="sidebarForwardSelectedItem sfsiRemovable sidebarForwardSelectedItem_1" id="sidebarForwardSelectedItem_1{{domId}}">

						<div class="avatar avatarSmall visible">
							<div class="avatarBack"></div>
							<div class="avatarInitials avatarC3">K</div>
						</div>

						<div class="peerClose">{{component(options.components.CloseIcon)}}{{/component}}</div>

						<span>n</span>

					</div>
					<div class="sidebarForwardSelectedItem sfsiRemovable sidebarForwardSelectedItem_2" id="sidebarForwardSelectedItem_2{{domId}}">

						<div class="avatar avatarSmall visible">
							<div class="avatarBack"></div>
							<div class="avatarInitials avatarC2">J</div>
						</div>

						<div class="peerClose">{{component(options.components.CloseIcon)}}{{/component}}</div>

						<span>n</span>

					</div>
					<div class="sidebarForwardSelectedItem sidebarForwardSelectedItem_more">

						<div class="avatar avatarSmall visible">
							<div class="avatarBack"></div>
							<div class="avatarInitials avatarC4">+3</div>
						</div>

						<span>more</span>

					</div>
					<div class="sidebarForwardSelectorInput"><input type="text" placeholder="Select chat" class="forwardFilter" id="forwardFilter{{domId}}"></div>
				</div>


					<div class="sfpFolders sfpFoldersManage sfpFoldersEdit" id="sidebarForwardTypes{{domId}}">
						<h4>Chat types</h4>

						<div class="sfpFoldersList">
							<div class="sfpFoldersList_include">

							</div>
						</div>

					</div>

					<div class="sfpFolders sfpFoldersManage sfpFoldersEdit">
						<h4>Chats</h4>

						<div class="sfpFoldersList">
							<div class="sfpFoldersList_exclude sidebarForwardPeers" id="sidebarForwardPeers{{domId}}">
								{{each(options.components.peerBlocks)}}
									{{component(@this)}}{{/component}}
								{{/each}}
							</div>
						</div>

						<div class="loadingMore">
							<div class="cssload-zenith dark"></div>
						</div>
					</div>


				</div>

			{{/if}}
			</div>
		`;
	}
};

module.exports = SidebarFolderPeers;
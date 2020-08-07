const SCBlock = require('./SCBlock.js');
const SidebarAbstract = require('./SidebarAbstract.js');

const Menu = require('../utils/Menu.js');

class SidebarDialogs extends SidebarAbstract {
	constructor(params) {
		super(params);

		this._components = {
			pinned: [],
			peers: [],
		};

		this._filter = params.filter;
		this._folder = params.folder;

		if (this._folder) {
			this._filter = this._folder.getFilterFunc();
		}
		if (!this._filter) {
			this._filter = ()=>{return true;};
		}
	}

	updateBadge() {
		if (this._parent.updateBadge && this._folder) {
			this._parent.updateBadge(this._folder);
		}
	}

	setActive(active = true) {
		this._data.active = active;
		if (!this._wasActivated) {
			this._wasActivated = true;

			this._components['DialogsMenu'] = this.newC(Menu, {items: [
						['pin', 'pin', 'Pin Dialog'],
					]});

			this._cIds = {};

			this._events = [
				['click', 'sidebarDialogs'+this._domId, 'onPeerClick'],
				['mouseover', 'sidebarDialogs'+this._domId, 'onMouseOver'],
				['touchstart', 'sidebarDialogs'+this._domId, 'onMouseDown'],
				['mousedown', 'sidebarDialogs'+this._domId, 'onMouseDown'],
				['scroll', 'sidebarDialogsScroll'+this._domId, 'onScroll'],
				['contextmenu', 'sidebarPeers'+this._domId, 'onDialogContext'],
			];
			this._componentEvents = [
				['pin', 'DialogsMenu', 'onPinDialog'],
				['archive', 'DialogsMenu', 'onArchiveDialog'],
			];

			if (this._folder) {
				this._peerManager.on('folder',(params)=>{
					if (params.folderId == this._folder._id) {
						this.updateFolderPeers();
						this.sortPeers();
					}
				});
			}

			this._peerManager.on('peers',()=>{
			// console.error('event');
				this.peers();
				this.updateBadge();
			});
			this._peerManager.on('peer', (params)=>{
				renderPeer(params);
			});

			this._peerManager.on('subscribed',(params)=>{
				if (this._peerManager._loadingMorePeers) return;

				if (params.peer.readyToUse()) {
					this.movePeerToTop(params.peer);
					renderPeer(params);
					this.setActivePeer(params.peer);
				} else {
					this.removePeer(params.peer);
				}
			});

			this._renderPeerTimeouts = {};

			const renderPeer = (params)=>{
				if (this._peerManager._loadingMorePeers) return;
				if (this._ignoreMessageEvents) {
					return true;
				}
				let peer = this.peerByParams(params);
				if (peer) {
					clearTimeout(this._renderPeerTimeouts[peer._id]);
					this._renderPeerTimeouts[peer._id] = setTimeout(()=>{
						// console.error('render peer', peer._id);

						if (!this._filter(peer)) {
							if (this._cIds[peer._id]) {
								// console.error('removing peer', peer);
								this.removePeer(peer);
							}
						} else {
							if (this._cIds[peer._id]) {
								this._cIds[peer._id].rerender();
								this.sortPeers();
							} else if (peer.readyToUse()) {
								// console.error('adding peer', peer);
								this.movePeerToTop(peer);

								this.sortPeers();
							}

							this.updateBadge();
						}
					}, 200);
				}
				//  && !this._filter(peer)) {
				// 	console.error('removing peer', params.peer);
				// 	this.removePeer(peer);
				// }

				// if (this._cIds[peer._id]) {
				// 	this._cIds[peer._id].rerender();
				// }
			};

			this._mostRecentPeerDate = null;
			this._ignoreMessageEvents = true;

			this._peerManager.on('unreadCount', renderPeer);
			this._peerManager.on('updated', renderPeer);
			this._peerManager.on('online', renderPeer);

			this._peerManager.on('message',(params)=>{
				if (this._ignoreMessageEvents) {
					return true;
				}

				this.movePeerToTop(params.peer);
				renderPeer(params);
			});




			// console.error('initial');
			this.peers();
			this.loadUntilFilled();
		}
	}

	updateFolderPeers() {
		for (let id in this._cIds) {
			if (!this._filter(this._cIds[id]._data.peer)) {
				this.removePeer(this._cIds[id]._data.peer);
			}
		}
		for (let peer of this._peerManager._sortedPeers) {
			if (!this._cIds[peer._id]) {
				this.movePeerToTop(peer);
			}
		}
	}


	async loadUntilFilled() {
		const max = 5;
		let i = 0;
		const loader = this.$('.loadingMore');
		const cont = this.$('.sidebarScroll');
		if (!cont) return;
		const fillUpTo = cont.offsetHeight || 500;

		let loaderOffset = 0;
		do {
			loader.classList.add('active');
			loaderOffset = loader.offsetTop;

			if (loaderOffset < fillUpTo) {
				// console.error('loading more', loader.offsetTop);
				this._ignoreMessageEvents = true;
				await this._peerManager.loadPeers();
				loader.classList.add('active');
				await new Promise((res)=>{setTimeout(res,500);});
			}

		} while(i++ < max);
		this._ignoreMessageEvents = false;
	}

	onArchiveDialog() {
		const peer = this._components['DialogsMenu']._peer;
		if (peer) {
			if (peer.isArchived()) {
				this._peerManager.toggleDialogArchived(peer, false);
			} else {
				this._peerManager.toggleDialogArchived(peer, true);
			}
		}
	}

	isPinned(peer) {
		// console.error('isPinned', peer._id);

		if (this._folder) {
			return this._folder.isPinned(peer);
		}

		return  peer.isPinned();

		// console.error('isPinned', peer._id, isPinned);
		// return isPinned;
	}

	onPinDialog() {
		const peer = this._components['DialogsMenu']._peer;
		if (peer) {
			if (this._folder) {
				this._folder.toggleDialogPin(peer, !this.isPinned(peer));
			} else {
				this._peerManager.toggleDialogPin(peer, !this.isPinned(peer));
			}
		}
	}

	onDialogContext(e) {
		e.preventDefault();

		const base = this.$();
		let closest = event.target.closest('.scBlock');
		if (closest && base.contains(closest)) {
			const peerId = closest.dataset.id;
			const peer = this._peerManager.peerById(peerId);

			const menuItems = [];
			if (this.isPinned(peer)) {
				menuItems.push(['pin', 'unpin', 'Unpin Dialog']);
			} else {
				menuItems.push(['pin', 'pin', 'Pin Dialog']);
			}

			if (!this._folder) {
				if (peer.isArchived()) {
					menuItems.push(['archive', 'archived', 'Unarchive Dialog']);
				} else {
					menuItems.push(['archive', 'archived', 'Archive Dialog']);
				}
			}

			this._components['DialogsMenu'].show(e, menuItems);
			this._components['DialogsMenu']._peer = peer;
		}

	    return false;
	}

	setActivePeer(peer) {
		const curActive = this.$('#sidebarPeers'+this._domId).querySelector('.active');
		if (curActive) {
			curActive.classList.remove('active');
		}
		if (this._filter(peer) && this.$('.scblock_'+peer._id)) {
			this.$('.scblock_'+peer._id).classList.add('active');
		}
	}

	peerByParams(params) {
		let peer = params.peer ? params.peer : null;
		if (!peer && params.peerUser) {
			if (this._peerManager._peers['dialog_'+params.peerUser._id]) {
				peer = this._peerManager._peers['dialog_'+params.peerUser._id];
			}
		}
		return peer;
	}

	// cByPeerOrUser(params) {
	// 	let peer = params.peer ? params.peer : null;
	// 	if (!peer && params.peerUser) {
	// 		if (this._peerManager._peers['dialog_'+params.peerUser._id]) {
	// 			peer = this._peerManager._peers['dialog_'+params.peerUser._id];
	// 		}
	// 	}

	// 	if (!peer || !this._cIds[peer._id]) {
	// 		return null;
	// 	}
	// 	return this._cIds[peer._id];
	// }

	onScroll(e) {
		const el = this.$('#sidebarDialogsScroll'+this._domId);
		const peers = this.$('#sidebarPeers'+this._domId);
		// console.log('scroll');

		if ((el.scrollTop + el.clientHeight) > peers.clientHeight * 0.75) {
			if (this._peerManager._thereReMorePeers) {
				this.$('.loadingMore').classList.add('active');

				this._ignoreMessageEvents = true;
				this._peerManager.loadPeers();
			}
		}
	}

	onMouseDown(e) {
		this._MouseDown = true;
		try {
			console.error(e, 'onMouseDown', e.target.closest('.scBlock'));
			const peer = this._peerManager.peerById(e.target.closest('.scBlock').dataset.id);
			if (peer) {
				clearTimeout(this._mouseOverTimeout);
				this._ignoreMessageEvents = true;
				app._interface._components.PanelTopBar.avatarToMemory(peer._id, e.target.closest('.scBlock').querySelector('.avatarBack'));
				peer.makeReady()
					.then(()=>{
						this._ignoreMessageEvents = false;
					});
			}
		} catch(er) { console.error(er); }
	}

	onMouseOver(e) {
		try {
			const peer = this._peerManager.peerById(e.target.closest('.scBlock').dataset.id);
			if (peer) {
				clearTimeout(this._mouseOverTimeout);
				this._mouseOverTimeout = setTimeout(()=>{
					this._ignoreMessageEvents = true;
					peer.makeReady()
						.then(()=>{
							this._ignoreMessageEvents = false;
						});
				}, 100);
			}
		} catch(e) {}
	}

	onPeerClick(e) {
		this._MouseDown = false;

		console.error(e, 'clickinpeer', e.target.closest('.scBlock'));
		const base = this.$();
		let closest = e.target.closest('.scBlock');
		if (closest && base.contains(closest)) {
			const peer = this._peerManager.peerById(closest.dataset.id);
			// console.error('peerclick', peer._id);
			if (peer) {
				// peer.markAsRead();
				this._app._interface.onPeerSelected({peer: peer});
			}
		}
	}

	removePeer(peer) {
		if (!this._cIds[peer._id]) {
			return;
		}

		const moveEl = this.$('.scblock_'+peer._id);
		if (moveEl) {
			moveEl.remove();
		}
		if (!this._cIds[peer._id]) {
			return;
		}
		let c = this._cIds[peer._id];
		let rem = (rComponents, c)=>{
			let r = null;
			for (let i = 0; i < rComponents.length; i++) {
				if (rComponents[i]._domId == c._domId) {
					r = i;
				}
			}
			if (r !== null) {
				rComponents.splice(r, 1);
			}
		};


		rem(this._components.pinned, c);
		rem(this._components.peers, c);
		delete this._cIds[peer._id];
	}

	movePeerToTop(peer) {
		if (this._data.isLoading || !this._filter(peer)) {
			return true;
		}

		// if (peer._mostRecentMessageDate < this._mostRecentPeerDate) {
		// 	return false;
		// }

		let cont = '#sidebarPeersNotPinned'+this._domId;
		if (this.isPinned(peer)) {
			cont = '#sidebarPeersPinned'+this._domId;
		}

		const parentNode = this.$(cont);
		const firstEl = this.$(cont).querySelector('div');
		const moveEl = this.$('.scblock_'+peer._id);

		if (moveEl) {
			parentNode.insertBefore(moveEl, firstEl);
		} else {
			// console.error(peer._id);

			const c = this.newC(SCBlock, {peer: peer, folder: this._folder});
			const html = c.render({withDiv: true});

			parentNode.insertAdjacentHTML('afterbegin', html);
			if (this.isPinned(peer)) {
				this._components.pinned.push(c);
			} else {
				this._components.peers.push(c);
			}
			this._cIds[peer._id] = c;
		}
	}

	sortPeers() {
		if (this._MouseDown) return;

		// console.time('sortPeers');
		const parentNodePinned = this.$('#sidebarPeersPinned'+this._domId);
		const parentNodeNotPinned = this.$('#sidebarPeersNotPinned'+this._domId);

		let movePeers = (rComponents, ePin, rComponentsToMove, rParentNodeMove)=>{
			const cSToMove = [];
			for (let c of rComponents) {
				if (this.isPinned(c._data.peer) != ePin) {
					cSToMove.push(c);
				}
			}

			if (cSToMove.length) {
				for (let c of cSToMove) {
					const moveNode = c.$();
					if (moveNode) {
						rParentNodeMove.appendChild(moveNode);
					}
					rComponentsToMove.push(c);
					for (let i = 0; i < rComponents.length; i++) {
						if (rComponents[i]._domId == c._domId) {
							rComponents.splice(i,1);
							break;
						}
					}
					c.rerender();
				}
			}
		};

		movePeers(this._components.peers, false, this._components.pinned, parentNodePinned);
		movePeers(this._components.pinned, true, this._components.peers, parentNodeNotPinned);

		let sortNodes = (rComponents, rParentNode) => {
			// sort nodes
			const peersNodes = [];
			for (let c of rComponents) {
				peersNodes.push(c.$());
			}
			peersNodes.sort((a,b) => {
				if (a.dataset.date < b.dataset.date) {
					return 1;
				} else if (a.dataset.date > b.dataset.date) {
					return -1;
				}
				return 0;
			});
			for (let node of peersNodes) {
				rParentNode.appendChild(node);
			}
		}

		sortNodes(this._components.peers, parentNodeNotPinned);
		sortNodes(this._components.pinned, parentNodePinned);

		// console.timeEnd('sortPeers');
	}

	peers() {
			// console.error('rendering dialogs', this._domId, this._components.peers.length, this._components.pinned.length)
			// try {

   //              console.error('channel_1254106591', this._peerManager._peers['channel_1254106591']._apiObject.pFlags.pinned);
			// } catch(e) {}
		// if (this._parent._data.isLoading) {
		// 	this._parent.showBlock('Dialogs');
		// }
		// console.clear();
		this._ignoreMessageEvents = false;
		if (this._components.peers.length || this._components.pinned.length) {
			// already have elements, need to work with DOM
			const parentNodePinned = this.$('#sidebarPeersPinned'+this._domId);
			const parentNodeNotPinned = this.$('#sidebarPeersNotPinned'+this._domId);
			// const beforeNode = this.$('.loadingMore');

			if (parentNodeNotPinned) {
				for (let peer of this._peerManager._sortedPeers) {
					if (this._filter(peer) && peer && peer.readyToUse()) {
						if (!this._cIds[peer._id]) {
							if (this._mostRecentPeerDate < peer._mostRecentMessageDate) {
								this._mostRecentPeerDate = peer._mostRecentMessageDate;
							}
							// new peer
							const c = this.newC(SCBlock, {peer: peer, folder: this._folder});
							const html = c.render({withDiv: true});

							if (this.isPinned(peer)) {
								this._components.pinned.push(c);
								parentNodePinned.insertAdjacentHTML('beforeend', html);
							} else {
								this._components.peers.push(c);
								parentNodeNotPinned.insertAdjacentHTML('beforeend', html);
							}

							this._cIds[peer._id] = c;
						}
					}
				}
			}

			this.sortPeers();
			this.reinitScrollBar(true);
		} else {
			this._components.peers = [];
			// console.error(this._peerManager._sortedPeers);
			for (let peer of this._peerManager._sortedPeers) {

				if (this._filter(peer) && peer.readyToUse()) {
			// console.error('rendering dialog', this._domId);
					if (this._mostRecentPeerDate < peer._mostRecentMessageDate) {
						this._mostRecentPeerDate = peer._mostRecentMessageDate;
					}
					const c = this.newC(SCBlock, {peer: peer, folder: this._folder});

					// console.error(peer._id, );

					if (this.isPinned(peer)) {
						this._components.pinned.push(c);
					} else {
						this._components.peers.push(c);
					}

					this._cIds[peer._id] = c;
			// console.error('rendering dialog', c, this._domId);
				}
			}
			this._data.isLoading = false;

			// console.time('renderingdialogs');
			this.render();
			// console.timeEnd('renderingdialogs')

			// console.error('rendering dialogs')
		}

		if (this.$('.loadingMore')) {
			this.$('.loadingMore').classList.remove('active');
		}
	}

	// afterRender() {
	// 	setTimeout(()=>{

	// 		this.reinitScrollBar(true);
	// 	}, 1000);
	// }

	template() {
		return `
			<div class="sidebarDialogs" id="sidebarDialogs{{domId}}">
				<div class="sidebarScroll" id="sidebarDialogsScroll{{domId}}">
					<div id="sidebarPeers{{domId}}">
						<div id="sidebarPeersPinned{{domId}}" class="sidebarPeersPinned">{{each(options.components.pinned)}}{{component(@this)}}{{/component}}{{/each}}</div>
						<div id="sidebarPeersNotPinned{{domId}}">
							{{each(options.components.peers)}}
								{{component(@this)}}{{/component}}
							{{/each}}
						</div>

						<div class="loadingMore">
							<div class="cssload-zenith dark"></div>
						</div>

						{{component(options.components.DialogsMenu)}}{{/component}}
					</div>
				</div>
			</div>
		`;
	}
};

module.exports = SidebarDialogs;
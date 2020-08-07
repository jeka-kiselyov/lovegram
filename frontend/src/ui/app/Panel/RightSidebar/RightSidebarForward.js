
const RightSidebarAbstract = require('./RightSidebarAbstract.js');

const AppIcon = require('../../../icons/AppIcon.js');
const PeerBlock = require('../../LeftSidebar/PeerBlock.js');

class RightSidebarForward extends RightSidebarAbstract {
	constructor(params) {
		super(params);

		this._components = {
			IconSend: this.newC(AppIcon, {icon: 'send'}),
			CloseIcon: this.newC(AppIcon, {icon: 'close'}),
			peerBlocks: [],
		};
		this._data = {
		};
		this._events = [
			['keydown', 'forwardFilter', 'onFilter'],
			['click', 'rightSidebarForward', 'onPeerClick'],
			['click', 'sidebarForwardSelectedItem_1', 'removePeer1'],
			['click', 'sidebarForwardSelectedItem_2', 'removePeer2'],
			['scroll', 'sidebarForwardScroll', 'onScroll'],
			['click', 'sidebarForwardSend', 'onForward'],
		];

		this._selectedPeers = [];
		this._initializedPeersIds = [];
		this._filterQ = '';
		this._hasMePeer = false;

		this._peerMessage = null;
	}

	setParams(params) {
		console.error(params);
		this._peerMessage = params.peerMessage;
		this._messageMedia = params.messageMedia;
		this._botResults = params.botResults;
	}

	onForward() {
		app._interface._components.Panel.onForward({
			peers: this._selectedPeers,
			peerMessage: this._peerMessage,
			messageMedia: this._messageMedia,
			botResults: this._botResults,
		});
		this._parent.onClose();
	}

	removePeer(i) {
		if (this._selectedPeers.length > i) {
			let remArr = this._selectedPeers.splice(i, 1);
			if (remArr.length) {
				for (let peerBlock of this._components.peerBlocks) {
					if (peerBlock._data.peer._id == remArr[0]._id) {
						peerBlock.off();
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
			if (!this._filterQ || (peerEl.dataset && peerEl.dataset.search.indexOf(this._filterQ) != -1)) {
				peerEl.style.display = 'block';
			} else {
				peerEl.style.display = 'none';
			}
		}
	}

	onFilter() {
		this.nextTick(()=>{
			this._filterQ = (''+this.$('#forwardFilter').value).trim().toLowerCase();
			this.loadMorePeers();
			this.filterDOM();
		});
	}

	onScroll(e) {
		const el = this.$('#sidebarForwardScroll');
		const peers = this.$('#sidebarForwardPeers');

		if ((el.scrollTop + el.clientHeight) > peers.clientHeight * 0.95) {
			this.loadMorePeers();
		}
	}

	setPeerViewItem(peer, el) {
		let dNames = peer.getDisplayName();
		let dName = dNames.split(' ')[0];

		el.querySelector('span').innerHTML = this.escapeHTML(dName);

		if (peer.isMine()) {
			el.querySelector('.avatarBack').style.backgroundImage = "";
			el.querySelector('.avatarBack').classList.add('avatarMine');
		} else {
			el.querySelector('.avatarBack').classList.remove('avatarMine');

			if (peer.hasAvatar()) {
				el.querySelector('.avatarBack').style.backgroundImage = "url('"+peer.getAvatarBlobURLSync()+"')";
			} else {
				el.querySelector('.avatarBack').style.backgroundImage = "none";
				el.querySelector('.avatarInitials').innerHTML = this.escapeHTML(peer.getAvatarInitials());
				el.querySelector('.avatarInitials').classList = 'avatarInitials avatarC'+peer.getAvatarColor();
			}
		}
	}

	peersChanged() {
		if (this._selectedPeers.length) {
			this.$('.sidebarForwardSend').classList.add('active');

			// 1st
			this.setPeerViewItem(this._selectedPeers[0], this.$('#sidebarForwardSelectedItem_1'));
			this.$('#sidebarForwardSelectedItem_1').style.display = 'block';

			if (this._selectedPeers.length == 2) {
				this.$('#sidebarForwardSelectedItem_more').style.display = 'none';
				this.$('#sidebarForwardSelectedItem_2').style.display = 'block';
				this.setPeerViewItem(this._selectedPeers[1], this.$('#sidebarForwardSelectedItem_2'));
			} else if (this._selectedPeers.length == 1) {
				// show
				this.$('#sidebarForwardSelectedItem_2').style.display = 'none';
				this.$('#sidebarForwardSelectedItem_more').style.display = 'none';
			} else {
				// > 2
				this.$('#sidebarForwardSelectedItem_2').style.display = 'block';
				this.$('#sidebarForwardSelectedItem_more').style.display = 'block';

				let moreCount = this._selectedPeers.length - 2;
				this.$('#sidebarForwardSelectedItem_more').querySelector('.avatarInitials').innerHTML = '+'+moreCount;
			}

		} else {
			this.$('#sidebarForwardSelectedItem_1').style.display = 'none';
			this.$('#sidebarForwardSelectedItem_2').style.display = 'none';
			this.$('#sidebarForwardSelectedItem_more').style.display = 'none';

			this.$('.sidebarForwardSend').classList.remove('active');
		}

	}

	onPeerClick(e) {
		const base = this.$();
		const closest = e.target.closest('.scBlock');

		if (closest && base.contains(closest)) {
			const peerId = closest.dataset.id;
			const peer = this._peerManager.peerById(peerId);

			for (let peerBlock of this._components.peerBlocks) {
				if (peerBlock._data.peer._id == peerId) {
					let isSelected = peerBlock.toggle();

					if (isSelected) {
						this._selectedPeers.push(peer);
					} else {
						this._selectedPeers = this._selectedPeers.filter(function(peer){ return peer._id != peerId; });
					}

					this.peersChanged();
				}
			}
		}
	}

	initPeers() {
		this._components.peerBlocks = [];
		this._initializedPeersIds = [];

		for (let peer of this._app._peerManager._sortedPeers) {
			if (peer._peerUser && peer._peerUser.isMe()) {
				this._hasMePeer = true;
				this._components.peerBlocks.unshift(this.newC(PeerBlock, {peer: peer}));
			} else {
				if (peer.canSendMessageTo()) {
					this._components.peerBlocks.push(this.newC(PeerBlock, {peer: peer}));
				}
			}
			this._initializedPeersIds.push(peer._id);
		}

		return this._components.peerBlocks;
	}

	async fullfillPeers() {
		let maxTries = 3;
		let cTry = 0;
		const el = this.$('#sidebarForwardScroll');
		const peers = this.$('#sidebarForwardPeers');

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
		const parentNode = this.$('#sidebarForwardPeers');

		for (let peer of this._app._peerManager._sortedPeers) {
			if (this._initializedPeersIds.indexOf(peer._id) === -1) {
					console.error(peer._id);

				if (peer.canSendMessageTo()) {
					let c = this.newC(PeerBlock, {peer: peer});
					let html = c.render();

					if (peer.isMine()) {
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

	reinitScrollBar(forceReInit) {
		let container = this.$('.sidebarForwardScroll');
		let topContainer = this.$('#rightSidebarForward');

		if (container && topContainer) {
			container.style.height = '' +(topContainer.offsetHeight - container.offsetTop) + 'px';
			this.initScrollBarOn(container, forceReInit);
		}
	}

	afterShow() {
		this._selectedPeers = [];
		this.nextTick(()=>{
			this.reinitScrollBar(true);

			this.fullfillPeers();
		});
	}

	afterRender() {
	}

	template() {
		return `
			<div class="rightSidebarForward rightSidebarBlock {{if (options.active)}} active{{/if}}" id="rightSidebarForward">

				{{js(options.self.initPeers())/}}

				<div class="sidebarForwardSelector">
					<div class="sidebarForwardSelectedItem sfsiRemovable" id="sidebarForwardSelectedItem_1">

						<div class="avatar avatarSmall visible">
							<div class="avatarBack"></div>
							<div class="avatarInitials avatarC3">K</div>
						</div>

						<div class="peerClose">{{component(options.components.CloseIcon)}}{{/component}}</div>

						<span>n</span>

					</div>
					<div class="sidebarForwardSelectedItem sfsiRemovable" id="sidebarForwardSelectedItem_2">

						<div class="avatar avatarSmall visible">
							<div class="avatarBack"></div>
							<div class="avatarInitials avatarC2">J</div>
						</div>

						<div class="peerClose">{{component(options.components.CloseIcon)}}{{/component}}</div>

						<span>n</span>

					</div>
					<div class="sidebarForwardSelectedItem" id="sidebarForwardSelectedItem_more">

						<div class="avatar avatarSmall visible">
							<div class="avatarBack"></div>
							<div class="avatarInitials avatarC4">+3</div>
						</div>

						<span>more</span>

					</div>
					<div class="sidebarForwardSelectorInput"><input type="text" placeholder="Select chat" id="forwardFilter"></div>
				</div>

				<div class="sidebarForwardScroll" id="sidebarForwardScroll">

					<div id="sidebarForwardPeers">
						{{each(options.components.peerBlocks)}}
							{{component(@this)}}{{/component}}
						{{/each}}
					</div>

					<div class="loadingMore">
						<div class="cssload-zenith dark"></div>
					</div>

				</div>

				<div class="sidebarForwardSend" id="sidebarForwardSend">
					{{component(options.components.IconSend)}}{{/component}}
				</div>

			</div>
		`;
	}
};

module.exports = RightSidebarForward;
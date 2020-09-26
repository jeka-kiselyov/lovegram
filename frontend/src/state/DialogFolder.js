

class DialogFolder {
	constructor(params = {}) {
		this._peerManager = params.peerManager;
		this._apiObject = params.apiObject; // object returned from TG api

		if (!this._apiObject) {
			this._apiObject = {
				_: 'dialogFilter',
				include_peers: [],
				exclude_peers: [],
				pinned_peers: [],
				pFlags: {
					bots: false,
					contacts: true,
					non_contacts: false,
					groups: false,
					broadcasts: false,
					exclude_muted: false,
					exclude_read: false,
					exclude_archived: false,
				},
				title: '',
				flags: true,
			};
			for (let k in this._apiObject.pFlags) {
				this._apiObject[k] = this._apiObject.pFlags[k];
			}
		}

		this._id = this._apiObject.id;
	}

	// static async fromSuggested(params) {
	// 	let df = new DialogFolder(params);
	// 	await df.persist();
	// }

	async remove() {
		if (await this._peerManager._user.invoke('messages.updateDialogFilter', {id: this._id})) {
			this._removed = true;
			delete this._peerManager._folders[this._id];

			this._peerManager.emit('folders');

			return true;
		}
	}

	/**
	 * Save dialog filter in api
	 * @return {[type]} [description]
	 */
	async persist() {
		if (this._removed) {
			return;
		}

		if (!this._id) {
			if (!this.title) {
				return;
			}
			let mid = 1;
			for (let fid in this._peerManager._folders) {
				fid = Number(fid);
				if (fid > mid) mid = fid;
			}

			this._id = mid+1;
			this._apiObject.id = mid+1;
			// this._apiObject.id = '';
			// this._apiObject.id = -1;
		}

		// // this._peerManager._user.invoke('messages.updateDialogFilter', {flags: true, id: this._id, filter: this._apiObject});

		if (await this._peerManager._user.invoke('messages.updateDialogFilter', {flags: true, id: this._id, filter: this._apiObject})) {
			this._peerManager._folders[this._id] = this;
			this._peerManager.emit('folders');
		}
	}

	async getPeers() {
		const ret = {include: [], exclude: []};
		return ret;
	}

	toggleDialogPin(peer, pinned) {
		if (pinned) {
			this._apiObject.pinned_peers.push(peer.getInputPeerObject());
		} else {
			for (let i = 0; i < this._apiObject.pinned_peers.length; i++) {
				let ip = this._apiObject.pinned_peers[i];
				let id = '';
				if (ip.chat_id) id = 'chat_'+ip.chat_id;
				if (ip.user_id) id = 'dialog_'+ip.user_id;
				if (ip.channel_id) id = 'channel_'+ip.channel_id;

				if (id == peer._id) {
					this._apiObject.pinned_peers.splice(i,1);
					break;
				}
			}
		}

		this._peerManager._user.invoke('messages.updateDialogFilter', {flags: true, id: this._id, filter: this._apiObject});
		this._peerManager.emit('folder', {folderId: this._id});
	}

	/**
	 * Add peer to apiObject, but does not save to api
	 * @param  {[type]} peer [description]
	 * @param  {[type]} api  [description]
	 * @return {[type]}      [description]
	 */
	appPeerAPI(peer, api) {
		this._apiObject[api].push(peer.getInputPeerObject());
	}

	removePeerAPI(peer, api) {
		console.error('remove ', peer, 'from '+api);

		for (let i=0; i<this._apiObject[api].length; i++) {
			let ip = this._apiObject[api][i];
			let id = '';
			if (ip.chat_id) id = 'chat_'+ip.chat_id;
			if (ip.user_id) id = 'dialog_'+ip.user_id;
			if (ip.channel_id) id = 'channel_'+ip.channel_id;

			if (peer._id == id) {
				this._apiObject[api].splice(i,1);
				break;
			}
		}
	}

	/**
	 * is peer in api object
	 * @param  {[type]}  peer [description]
	 * @param  {[type]}  api  [description]
	 * @return {Boolean}      [description]
	 */
	isPeerIn(peer, api) {
		try {
		for (let ip of this._apiObject[api]) {
			let id = '';
			if (ip.chat_id) id = 'chat_'+ip.chat_id;
			if (ip.user_id) id = 'dialog_'+ip.user_id;
			if (ip.channel_id) id = 'channel_'+ip.channel_id;

			if (peer._id == id) return true;
		}
		} catch(e) {}

		return false;
	}

	isPinned(peer) {
		// console.error('isPinned', peer._id);
		if (this._id == 1) {
			// archived share common pinned logic
			return peer.isPinned();
		}
		// const is = this.isPeerIn(peer, 'pinned_peers');
		// console.error('isPinned', peer._id, is);

		return this.isPeerIn(peer, 'pinned_peers');
	}

	getFilterFunc() {
		return (peer)=>{
			let ok = false;

			if (this._apiObject.pFlags.bots && peer._peerUser && peer._peerUser._apiObject.pFlags &&  peer._peerUser._apiObject.pFlags.bot) {
				ok = true;
			} else
			if (this._apiObject.pFlags.contacts && peer._peerUser && peer._peerUser._apiObject.pFlags &&  peer._peerUser._apiObject.pFlags.contact) {
				ok = true;
			} else
			if (this._apiObject.pFlags.non_contacts && peer._peerUser && (!peer._peerUser._apiObject.pFlags || !peer._peerUser._apiObject.pFlags.contact)) {
				ok = true;
			} else
			if (this._apiObject.pFlags.groups && (!peer._peerUser && peer.canSendMessageTo())) {
				ok = true;
			} else
			if (this._apiObject.pFlags.broadcasts && (peer._type == 'channel' && (!peer._apiObject.pFlags || !peer._apiObject.pFlags.megagroup))) {
				ok = true;
			} else
			if (this.isPeerIn(peer, 'include_peers')) {
				ok = true;
			} else
			if (this.isPeerIn(peer, 'pinned_peers')) {
				ok = true;
			}

			if (!ok) {
				return false;
			}

			if (this._apiObject.pFlags.exclude_muted && peer.isMuted()) {
				ok = false;
			} else
			if (this._apiObject.pFlags.exclude_read && !peer._unreadCount) {
				ok = false;
			} else
			if (this._apiObject.pFlags.exclude_archived && !peer.isArchived()) {
				ok = false;
			} else
			if (this.isPeerIn(peer, 'exclude_peers')) {
				ok = false;
			}

			return (!!peer);
			// if (peer.getDisplayName().indexOf('sa') != -1) {
			// 	return true;
			// }
		};
	}

	fillUpdatesFromAPIResult(apiObject) {
		this._apiObject = apiObject;
	}

	get title() {
		return this._apiObject.title;
	}

	get info() {
		let str = [];

		if (this._apiObject.pFlags.bots) {
			str.push('All Bots');
		}
		if (this._apiObject.pFlags.contacts) {
			str.push('All Contacts');
		}
		if (this._apiObject.pFlags.non_contacts) {
			str.push('All Non Contacts');
		}
		if (this._apiObject.pFlags.groups) {
			str.push('All Groups');
		}
		if (this._apiObject.pFlags.broadcasts) {
			str.push('All Channels');
		}

		let cs = {chat: 0, user: 0, channel: 0};
		for (let ip of this._apiObject.include_peers) {
			if (ip.chat_id) cs.chat++;
			if (ip.user_id) cs.user++;
			if (ip.channel_id) cs.channel++;
		}

		for (let i in cs) {
			if (cs[i]) {
				str.push(''+cs[i]+' '+i+(i > 1 ? 's' : '')); // 1 chat, 5 channels, 9000 chats
			}
		}

		return str.slice(0,3).join(', ');
	}

	async getBadgeCount() {
		let c = 0;

		if (this._id == 1) {
			// archived
			for (let ap of this._peerManager._sortedPeers) {
				if (ap._folderId == this._id) {
					c+=ap._unreadCount;
				}
			}
		} else {
			let f = this.getFilterFunc();
			for (let ap of this._peerManager._sortedPeers) {
				if (f(ap)) {
					c+=ap._unreadCount;
				}
			}

		}
		return c;
	}

	async addPeer(peer) {
		let folder_peers = [];
		for (let ap of this._peerManager._sortedPeers) {
			if (ap._folderId == this._id || peer._id == ap._id) {
				folder_peers.push({
					_: 'inputFolderPeer',
					folder_id: this._id,
					peer: ap.getInputPeerObject(),
				});
			}
		}

		app._peerManager.processApiUpdates(await this._peerManager._user.invoke('folders.editPeerFolders', {folder_peers: folder_peers}));
	}

	async removePeer(peer) {
		// get peers in this folder
		let folder_peers = [];
		for (let ap of this._peerManager._sortedPeers) {
			if (peer._id == ap._id) {
				folder_peers.push({
					_: 'inputFolderPeer',
					folder_id: 0,
					peer: ap.getInputPeerObject(),
				});
			}
		}

		// console.error(folder_peers);

		let resp = null;
		if (folder_peers.length) {
			resp = await this._peerManager._user.invoke('folders.editPeerFolders', {folder_peers: folder_peers});
		} else {
			resp = await this._peerManager._user.invoke('folders.deleteFolder', {folder_id: this._id});
		}

		app._peerManager.processApiUpdates(resp);
	}
}

module.exports = DialogFolder;
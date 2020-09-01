const EventTarget = window.classes.EventTarget;
const Storage = window.classes.Storage;

const Peer = require('./Peer.js');
const DialogFolder = require('./DialogFolder.js');
const PeerUser = require('./PeerUser.js');
const MediaManager = require('./MediaManager.js');
const DownloadManager = require('./DownloadManager.js');
const Stickers = require('./Stickers.js');
const GIFs = require('./GIFs.js');

class PeerManager extends EventTarget {
	constructor(params = {}) {
	    super();

		this._app = params.app;
		this._user = params.app._user;
		this._storage = new Storage;

		this._media = new MediaManager({
			app: params.app,
			user: this._user,
			storage: this._storage
		});
		this._stickers = new Stickers({
			app: params.app,
			user: this._user,
			media: this._media,
			storage: this._storage,
			peerManager: this,
		});
		this._download = new DownloadManager({
			app: params.app,
		});
		this._gifs = new GIFs({
			user: this._user,
			peerManager: this,
		});

		this._peers = {};
		this._sortedPeers = [];
		this._peerUsers = {};
		this._mePeerUser = null;

		this._folders = {};

		this._folders[1] = new DialogFolder({peerManager: this, apiObject: {id: 1}});

		// this._state = {};

		this._throttleTimeouts = {};
		this._channels = {};

		this._doNotSendMessageEvents = false;

		this.initState();

		this._thereReMorePeers = true;
		this._loadingMorePeers = false;
		this._oldestDialogDate = false;

		this._loadedPinned = false;

		this._activePeer = null;

		this._poll = true; // poll for changes

		this.on('subscribed', ()=>{
			this.sortPeers();
			this.persist();
		});
	}

	async toggleDialogArchived(peer, archived) {
		const success = await peer.toggleDialogArchived(archived);
		if (success) {
			// this.emit('peers');
			this.emit('updated', {peer: peer});
		}
	}

	async toggleDialogPin(peer, pinned) {
		const success = await peer.toggleDialogPin(pinned);
		if (success) {
			// this.emit('peers');
			this.emit('updated', {peer: peer});
		}
	}

	async initState() {
		// await new Promise((res)=>setTimeout(res, 60000));

		setTimeout(()=>{
			console.error('initState load');

			this.restore();
			this.loadPeers(); /// no await
		}, 1);

		const resp = await this._user.invoke('updates.getState');
		if (resp && resp.data) {
			this._state = resp.data;
		}
		this._user._protocol.on('update', (update)=>{
			this.processApiUpdates(update);
		});


		// this.startNextStateLoop();
	}

	async processApiUpdates(update) {
		// console.error('processApiUpdates')
		if (update.data) return await this.processApiUpdates(update.data);

		if (update) {
			if (update.users) {
				for (let obj of update.users) {
					let peerUser = this.peerUserByAPIResult(obj);
					let userStatusChanged = peerUser.checkOnlineChanged();
					if (userStatusChanged) {
						this.emit('online', {peerUser: peerUser});
					}
				}
			}
			if (update.chats) {
				for (let chat of update.chats) {
					let peer = this.peerByAPIResult(chat);
				}
			}
			if (update.update) {
				if (update.update.updates) {
					for (let updateData of update.update.updates) {
						await this.processApiUpdate(updateData);
					}
				} else {
					await this.processApiUpdate(update.update);
				}
			} else if (update.updates) {
				for (let updateData of update.updates) {
					await this.processApiUpdate(updateData);
				}
			} else if (update._) {
				await this.processApiUpdate(update);
			}
		}

		this.persist();
	}

	shortObjectToId(apiObject) {
		if (apiObject.chat_id) {
			return 'chat_'+apiObject.chat_id;
		} else if (apiObject.channel_id) {
			return 'channel_'+apiObject.channel_id;
		} else if (apiObject.user_id) {
			return 'dialog_'+apiObject.user_id;
		}
	}

	async updatePinnedData(order, isArchived) {
		let pinnedIds = [];
		for (let o of order) {
			pinnedIds.push(this.shortObjectToId(o.peer));
		}
		// console.error(pinnedIds);
		for (let peer of this._sortedPeers) {
			if (peer.isArchived() == isArchived) {
				// console.error('checking peer was: '+(peer.isPinned() ? 'pinned' : 'not pinned'), peer._id);
				let now = null;
				if (peer.isPinned() && pinnedIds.indexOf(peer._id) == -1) {
					now = false;
				} else if (!peer.isPinned() && pinnedIds.indexOf(peer._id) != -1) {
					now = true;
				}

				if (now !== null) {
					peer._apiObject.pFlags.pinned = now;

					// alert('peer pinned changed '+peer._id+' now: '+(now ? 'pinned' : 'not pinned'));
					this.emit('peers'); // reflow
				}
			}
		}
	}

// flags: 1
// order: Array(5)
// 0:
// peer: {_: "peerUser", user_id: 617826063}
// _: "dialogPeer"
// __proto__: Object
// 1:
// peer: {_: "peerChannel", channel_id: 1322215945}
// _: "dialogPeer"
// __proto__: Object
// 2:
// peer: {_: "peerChannel", channel_id: 1144755728}
// _: "dialogPeer"
// __proto__: Object
// 3:
// peer: {_: "peerUser", user_id: 214013086}
// _: "dialogPeer"
// __proto__: Object
// 4: {_: "dialogPeer", peer: {…}}
// length: 5
// __proto__: Array(0)
// pFlags: {}
// _: "updatePinnedDialogs"
// __proto__: Object

	async processApiUpdate(updateObject) {
		// console.error('processApiUpdate')
		console.error('API Update', updateObject);
		if (updateObject.folder_peers) {
			for (let o of updateObject.folder_peers) {
				this.processApiUpdate(o);
			}
			return;
		}
		if (updateObject._ == 'updatePinnedDialogs') {
			// alert('updatePinnedDialogs');
			setTimeout(()=>{
				this.updatePinnedData(updateObject.order, updateObject.folder_id);
			}, 500);
			// if (!updateObject.folder_id) {
			// 	// update pinned in main
			// } else if (updateObject.folder_id == 1) {
			// 	// update pinned in archive
			// }
		}
		// "updateFolderPeers"
		if (updateObject._ == 'updateDialogFilter') {
			if (updateObject.filter) {
				this.workFoldersData([updateObject.filter]);
			} else {
				this._folders[updateObject.id]._isRemoved = true;
			}
			this.emit('folder', {folderId: updateObject.id});
		}
		if (updateObject._ == 'updateMessagePoll') {
			let id = updateObject.poll_id;
			for (let peer of this._sortedPeers) {
				if (peer._pollsIds[id]) {
					peer._pollsIds[id].fillUpdatesFromAPIResult(updateObject);
				}
			}
		}

		/// try to get objects to proccess
		let peerUser = null;
		if (updateObject.user_id) {
			peerUser = this.peerUser(updateObject.user_id);
		}

		if (peerUser) {
			let isUpdated = peerUser.processApiUpdate(updateObject);
			if (isUpdated) {
				this.emit('updated', {peerUser: peerUser});
			}
		}

		let peer = await this.peerByApiShortObject(updateObject);
		if (!peer && !peerUser) {
			await this.nextState();
			peer = await this.peerByApiShortObject(updateObject, true);
		}
		if (peer) {
			let opp = peer.isPinned();
			let od = peer.getDisplayTime();

			let peerMessage = null;
			let isUpdated = false;
			if (updateObject._ == 'updateNewChannelMessage' || updateObject._ == 'updateNewMessage' || updateObject._ == 'updateEditMessage') {
				peerMessage = this.messageToPeer(peer, updateObject.message);
				isUpdated = await peer.processApiUpdate(updateObject);
			} else if (updateObject._ == 'updateShortChatMessage' || updateObject._ == 'updateShortMessage') {
				peerMessage = this.messageToPeer(peer, updateObject);
			} else {
				isUpdated = await peer.processApiUpdate(updateObject);
			}

			if (isUpdated) {
				this.emit('updated', {peer: peer});

				if (isUpdated && (opp != peer.isPinned() || od != peer.getDisplayTime())) {
					// need to rebuild the whole peer list
					//
					this.emit('peers'); // reflow
				}
			}

		}
	}


	async peerByApiShortObject(apiObject, searchByMessages) {
		// console.error('peerByApiShortObject', apiObject);

		if (apiObject.peer) {
			return await this.peerByApiShortObject(apiObject.peer);
		}

		let id = null;
		let apiId = null;
		let type = null;
		if (apiObject.chat_id) {
			id = 'chat_'+apiObject.chat_id;
			apiId = apiObject.chat_id;
			type = 'chat';
		} else if (apiObject.channel_id) {
			id = 'channel_'+apiObject.channel_id;
			apiId = apiObject.channel_id;
			type = 'channel';
		} else if (apiObject.from_id) {
			if (apiObject.to_id && ((apiObject.pFlags && apiObject.pFlags.out) || apiObject.out)) {
				let peer = await this.peerByApiShortObject(apiObject.to_id);
				if (peer) {
					return peer;
				}
			}
			id = 'dialog_'+apiObject.from_id;
			apiId = apiObject.from_id;
			type = 'dialog';
		} else if (apiObject.user_id) {
			id = 'dialog_'+apiObject.user_id;
			apiId = apiObject.user_id;
			type = 'dialog';
		}

		if (!id) {
			if (apiObject.message && apiObject.message._) {
				return await this.peerByApiShortObject(apiObject.message);
			} else if (apiObject.to_id) {
				return await this.peerByApiShortObject(apiObject.to_id);
			}
		}
		if (!id && apiObject.messages && searchByMessages) {
			// like updateDeleteMessages etc
			console.error('look for peer by message id')
			// try to find peer by messages ids
			for (let peer of this._sortedPeers) {
				for (let messageId of apiObject.messages) {
					if (peer.hasMessageId(messageId)) {
						return peer;
					}
				}
			}
		}
		if (this._peers[id]) {
			return this._peers[id];
		}

		return null;
	}

	setActivePeer(peer) {
		this._activePeer = peer;

		this.persist();
	}

	persist() {
		const data = {peers: [], activePeerId: null};
		if (this._activePeer) {
			data.activePeerId = this._activePeer._id;
		}
		let stored = 0;
		for (let peer of this._sortedPeers) {
			if (peer._id == data.activePeerId) {
				data.peers.push(peer.serialize(true));
			} else {
				if (stored < 20) {
					data.peers.push(peer.serialize());
				}
			}
			stored++;
		}

		this._storage.set('dialogs', JSON.stringify(data));
	}

	async restore() {
		let data = await this._storage.get('dialogs');
		try {
			data = JSON.parse(data);
		} catch(e) {};

		if (data && data.peers) {
			for (let peerData of data.peers) {
				try {
					if (peerData.peerUser) {
						let peerUser = this.peerUserByAPIResult(peerData.peerUser);
					}
					if (peerData.users) {
						for (let userdata of peerData.users) {
							this.peerUserByAPIResult(userdata);
						}
					}
					let peer = this.peerByAPIResult(peerData.apiObject);
					peer.deserialize(peerData);
				} catch(e) {}
			}

			await this.loadAvatarsFromCache();
			this.sortPeers();

			this.emit('peers');

			if (data.activePeerId) {
				this._activePeer = this.peerById(data.activePeerId);
				if (this._activePeer) {
					this.emit('initialPeer', {peer: this._activePeer});
				}
			}
		}
	}

	async getMePeer() {
		if (this._mePeerUser) {
			if (this._mePeerUser._peer) {
				return this._mePeerUser._peer;
			} else {
				let peer = this.peerByAPIResult({
					peer: {
						"_": "peerUser",
						user_id: this._mePeerUser._id,
					}
				});

				return this._mePeerUser._peer;
			}
		}
	}

	async loadAvatarsFromCache() {
		let items = [];
		for (let peer of this._sortedPeers) {
			let item = {
				url: peer.getAvatarCacheURL(),
			};

			if (peer._peerUser) {
				item.object = peer._peerUser;
				if (peer._peerUser._hasAvatar === null) {
					items.push(item);
				}
			} else {
				item.object = peer;
				if (peer._hasAvatar === null) {
					items.push(item);
				}
			}
		}

		await this._user._protocol.getCachedResources(items);

		for (let item of items) {
			if (item.cached) {
				item.object._avatarBlobURL = item.blobURL;
				item.object._hasAvatar = true;
			} else {
				// do not set hasAvatar to false, as we may load it after this
			}
		}
	}


	async loadPeers() {
		if (!this._thereReMorePeers || this._loadingMorePeers) {
			return false;
		}

		this._loadingMorePeers = true;

		let resp = null;
		const options = {offset_peer: { "_": "inputPeerEmpty" }, exclude_pinned: true }; // exclude_pinned works for getDialogs only


		if (!this._loadedPinned) {
			const resps = await Promise.all([
									this._user.invoke('messages.getDialogs', options),
									this._user.invoke('messages.getPinnedDialogs', options),
									this._user.invoke('messages.getDialogFilters'),
									this._user.invoke('messages.getPinnedDialogs', {offset_peer: { "_": "inputPeerEmpty" }, folder_id: 1}),
									]);

			resp = resps[0];

			// merge pinned to common
			const mergeResp = (respdata)=>{
				try {
					for (let key in respdata) {
						if (resp.data[key] && key != '_') {
							for (let item of respdata[key]) {
								if (!item.pFlags) {
									item.pFlags = {};
								}
								if (item.pFlags) {
									// console.error('loaded pinned', item);
									// console.error('loaded as pinned', item.id);

									for (let it of resp.data.chats) {
										if (it.id == item.id && it.pFlags) {
											// console.error('setting ', it, 'to pinned');
											// it.pFlags.pinned = true;
											// it.pFlags.loadedPinned = true;
											// it.pFlags = item.pFlags;
											it.pFlags.loadedPinned = true;
											it.pFlags.pinned = true;
										}
									}
									for (let it of resp.data.dialogs) {
										if (it.peer && item.peer && it.peer.user_id && item.peer.user_id && it.peer.user_id == item.peer.user_id && it.pFlags) {
											// console.error('setting ', it, 'to pinned');
											// it.pFlags.pinned = true;
											// it.pFlags.loadedPinned = true;
											// it.pFlags = item.pFlags;
											it.pFlags.loadedPinned = true;
											it.pFlags.pinned = true;
										}
									}
									// for (let it of resp.data.dialogs) {
									// 	if (it.id == item.id) {
									// 		console.error('setting ', it, 'to pinned');
									// 		it.pFlags = {pinned: true, loadedPinned: true};
									// 	}
									// }
									// item.pFlags.pinned = true;
									// item.pFlags.loadedPinned = true;
								}
								// resp.data[key].push(item);
							}
						}
					}
				} catch(e) { console.error(e); };
			};
			if (resps[1] && resps[1].data) { mergeResp(resps[1].data);	}
			if (resps[3] && resps[3].data) { mergeResp(resps[3].data);	} // archived

			if (resps[2]) {
				await this.workFoldersData(resps[2].data);
			}
		} else {
			if (this._oldestDialogDate !== false) {
				options.offset_date = this._oldestDialogDate;
			}
			resp = await this._user.invoke('messages.getDialogs', options);
		}

		console.error(resp.data);

		// const options = {offset_peer: { "_": "inputPeerEmpty" }};
		// if (this._oldestDialogDate !== false) {
		// 	options.offset_date = this._oldestDialogDate;
		// }
		// const resp = await this._user.invoke('messages.getDialogs', options);
		if (resp.data) {
			if (resp.data._ == 'dialogs') {
				// got everything
				this._thereReMorePeers = false;
			}

			this._doNotSendMessageEvents = true;
			let minDate = await this.workApiData(resp, true);
			this._doNotSendMessageEvents = false;
			if (this._oldestDialogDate === false || minDate < this._oldestDialogDate) {
				this._oldestDialogDate = minDate;
			}
			if (minDate == null) {
				/// no results
				this._thereReMorePeers = false;
			}

			if (!this._loadedPinned) {
				// we can set as not pinned for every peer that was not loaded as pinned in this call (was pinned in cache)
				for (let peer of this._sortedPeers) {
							// console.error('checking for loaded pinned ', peer._id);
					if (peer._apiObject.pFlags && peer._apiObject.pFlags.pinned) {
						if (!peer._apiObject.pFlags.loadedPinned) {
							// console.error('setting ', peer._id, 'to not pinned');

							peer._apiObject.pFlags.pinned = false;
						}

						// console.error('setting ', peer._id, 'to not loaded pinned');
						peer._apiObject.pFlags.loadedPinned = false;
					}
				}

				this._loadedPinned = true;
			}

			await this.loadAvatarsFromCache(); // @todo: optimize!
		}


		this._loadingMorePeers = false;
		// console.error('loadPeers ready');
		this.emit('peers');
	}

	peerById(id) {
		return this._peers[id];
	}

	// stopNextStateLoop() {
	// 	this._poll = false;
	// }

	// startNextStateLoop() {
	// 	if (!this._app.config.get('poll') || !this._poll) {
	// 		return false;
	// 	}

	// 	//return false;
	// 	const nextLoopInterval = this._app.config.get('pollInterval', 2000);
	// 	this.nextState()
	// 		.then(()=>{
	// 			setTimeout(()=>{
	// 				this.startNextStateLoop();
	// 			}, nextLoopInterval);
	// 		})
	// 		.catch((e)=>{
	// 			console.log(e);
	// 			setTimeout(()=>{
	// 				this.startNextStateLoop();
	// 			}, nextLoopInterval);
	// 		});
	// }

	messageToPeer(peer, apiMessagObject, doNotAddToPeer) {
		if (!peer) {
			return false;
		}
		const peerMessage = peer.messageByAPIResult(apiMessagObject, doNotAddToPeer);
		if (!doNotAddToPeer && !this._doNotSendMessageEvents) {
			this.emit('message', {peer: peer});
		}

		return peerMessage;
	}

	peerUser(id) {
		id = ''+id;
		return this._peerUsers[id] ? this._peerUsers[id] : null;
	}


	/**
	 * Return Peer object by TG API result item
	 * @param  {[type]} apiObject [description]
	 * @return Peer        [description]
	 */
	peerByAPIResult(apiObject, doNotCreate, doNotUpdate) {
		let id = null;
		let type = null;
		let folder_id = null;

		if (apiObject.peer) {
			if (apiObject.peer.user_id) {
				id = 'dialog_'+apiObject.peer.user_id;
				type = 'dialog';
			}
			if (apiObject.peer._ == 'peerChannel') {
				id = 'channel_'+apiObject.peer.channel_id;
				type = 'channel';
			}
			if (apiObject.peer._ == 'peerChat') {
				id = 'chat_'+apiObject.peer.chat_id;
				type = 'chat';
			}
		} else {
			if (apiObject._ == 'channel') {
				id = 'channel_'+apiObject.id;
				type = 'channel';
			}
			if (apiObject._ == 'chat' || apiObject._ == 'chatForbidden') {
				id = 'chat_'+apiObject.id;
				type = 'chat';
			}
		}

		// console.error('peerByAPIResult', apiObject._, apiObject.id, apiObject);

		if (apiObject.folder_id) {
			folder_id = apiObject.folder_id;
		}

		if (!id) {
			return null;
		}

		if (this._peers[id]) {
			// if (apiObject._ == 'dialog' && this._peers[id]._folderId && !apiObject.folder_id)
			if (!doNotUpdate) {
				this._peers[id].fillUpdatesFromAPIResult(apiObject);
			}
			return this._peers[id];
		}

		if (doNotCreate) {
			return null;
		}

		const params = {};
		params.id = id;
		params.type = type;
		params.apiObject = apiObject;
		params.peerManager = this;

		const peer = new Peer(params);

		if (type != 'dialog' && apiObject.id) {
			this._channels[apiObject.id] = peer;
		}
		if (folder_id) {
			peer.folder_id = folder_id;
		}

		this._peers[id] = peer;
		this._sortedPeers.push(peer);

		return peer;
	}

	apiMessageToPeer(message) {
		if (!message.to_id && message.chat_id) {
			if (this._peers['chat_'+message.chat_id]) {
				message.to_id = {
					'_': 'peerChat',
					chat_id: message.chat_id,
				};
			}
		}
		if (!message.to_id && message.user_id) {
			if (this._peers['dialog_'+message.user_id]) {
				message.to_id = {
					'_': 'peerUser',
					user_id: message.user_id,
				};
				if (message.pFlags && message.pFlags.out && this._mePeerUser) {
					message.from_id = this._mePeerUser._id;
				} else {
					message.from_id = message.user_id;
				}
			}
		}
		if (!message.to_id) {
			return null;		}

		if (message.to_id._ == 'peerChat') {
			return this._peers['chat_'+message.to_id.chat_id] ? this._peers['chat_'+message.to_id.chat_id] : null;
		} else if (message.to_id._ == 'peerChannel') {
			return this._peers['channel_'+message.to_id.channel_id] ? this._peers['channel_'+message.to_id.channel_id] : null;
		} else if (message.to_id._ == 'peerUser') {
			let foundPeer = null;
			let toCreatePeerId = null;
			if (message.to_id.user_id == message.from_id) {
				// saved messages
				foundPeer = this._peers['dialog_'+message.from_id] ? this._peers['dialog_'+message.from_id] : null;
				toCreatePeerId = message.from_id;
			} else {
				if (message.pFlags.out) {
					// sent
					foundPeer = this._peers['dialog_'+message.to_id.user_id] ? this._peers['dialog_'+message.to_id.user_id] : null;
					toCreatePeerId = message.to_id.user_id;
				} else {
					// received
					foundPeer = this._peers['dialog_'+message.from_id] ? this._peers['dialog_'+message.from_id] : null;
					toCreatePeerId = message.from_id;
				}
			}

			if (foundPeer) {
				return foundPeer;
			} else {
				/// create peer based on message  data
				const params = {};
				params.id = 'dialog_'+toCreatePeerId;
				params.type = 'dialog';
				params.apiObject = {
						peer: {
							user_id: toCreatePeerId,
						}
					};
				params.peerManager = this;

				const peer = new Peer(params);

				this._peers[params.id] = peer;
				this._sortedPeers.push(peer);

				return peer;
			}
		}
	}

	/**
	 * Return PeerUser object by TG API result item
	 * @param  {[type]} apiObject [description]
	 * @return Peer        [description]
	 */
	peerUserByAPIResult(apiObject) {
		let id = null;
		if (apiObject.id) {
			id = ''+apiObject.id;
		}

		if (!id) {
			return null;
		}

		// @todo: update data if there's more in api res?
		if (this._peerUsers[id]) {
			if (apiObject.status) {
				this._peerUsers[id]._apiObject.status = apiObject.status;
			}

			return this._peerUsers[id];
		}

		const peerUser = new PeerUser({
			id: id,
			apiObject: apiObject,
			peerManager: this
		});

		this._peerUsers[id] = peerUser;
		if (peerUser.isMe()) {
			this._mePeerUser = peerUser;
		}

		return peerUser;
	}

	getEmptyFolder() {
		return new DialogFolder({peerManager: this});
	}

	async getSuggestedFolders() {
		const resp = await this._user.invoke('messages.getSuggestedDialogFilters');
		return resp.data;
	}

	async createSuggestedFolder(apiObject) {
		let df = new DialogFolder({peerManager: this, apiObject: apiObject});
		return await df.persist();
	}

	async workFoldersData(data) {
		// console.error(data)
		for (let ao of data) {
			if (ao._ == 'dialogFilter') {
				if (!this._folders[ao.id]) {
					this._folders[ao.id] = new DialogFolder({
						apiObject: ao,
						peerManager: this,
					});
				} else {
					this._folders[ao.id].fillUpdatesFromAPIResult(ao);
				}
			}
		}

		this.emit('folders');
	}

	async updateHashes() {
		const resp = await this._user.invoke('messages.getDialogs', {offset_peer: { "_": "inputPeerEmpty" }});
		for (let chat of resp.data.chats) {
			if (chat.access_hash) {
				let peer = this.peerByAPIResult(chat);
				(peer && (peer._apiObject.access_hash = chat.access_hash));
			}
		}
		for (let obj of resp.data.users) {
			if (obj.access_hash) {
				let peerUser = this.peerUserByAPIResult(obj);
				(peerUser && (peerUser._apiObject.access_hash = obj.access_hash));
			}
		}
		return true;
	}

	async workApiData(resp) {
		// console.error('workApiData')
		let minMessageDate = null;
		if (resp && resp.success && resp.data) {
			// load users first, as we use them on other parts
			if (resp.data.users) {
				for (let obj of resp.data.users) {
					// this.peerUserByAPIResult(obj);
					let peerUser = this.peerUserByAPIResult(obj);
					peerUser.checkOnlineChanged();
				}
			}
			if (resp.data.chats) {
				for (let chat of resp.data.chats) {
					let peer = this.peerByAPIResult(chat);
				}
			}
			if (resp.data.dialogs) {
				for (let dialog of resp.data.dialogs) {
					if (dialog._ == 'dialog') {
						let peer = this.peerByAPIResult(dialog);
						// console.error(peer._id, dialog.pFlags, peer._apiObject.pFlags.pinned, peer._apiObject.pFlags.loadedPinned);
						if (peer) {
							if (dialog._pts) {
								peer._pts = dialog.pts;
							}
							if (dialog.notify_settings) {
								peer._notify_settings = dialog.notify_settings;
							}
							if (dialog.pFlags) {
								for (let key in dialog.pFlags) {
									peer._apiObject.pFlags[key] = dialog.pFlags[key];
								}
							}
						} else {
							console.error('no peer found for ', dialog);
						}
					} else {
						// dialogFolder
						if (!this._folders[dialog.folder.id]) {
							this._folders[dialog.folder.id] = new DialogFolder({
								apiObject: dialog.folder,
								peerManager: this,
							});
						}
					}
				}
			}

			if (resp.data.messages) {
				for (let message of resp.data.messages) {
					let peer = this.apiMessageToPeer(message);
					this.messageToPeer(peer, message);

					if (!peer.isPinned()) {
						if (!minMessageDate || minMessageDate > message.date) {
							minMessageDate = message.date;
						}
					}
				}
			}

			this.sortPeers();
		}

		return minMessageDate;
	}

	sortPeers() {
		this._sortedPeers.sort((a,b) => {
			// if (a.isPinned() == b.isPinned()) {
				return (a._mostRecentMessageDate < b._mostRecentMessageDate) ? 1 : ((b._mostRecentMessageDate < a._mostRecentMessageDate) ? -1 : 0);
			// }
			// if (a.isPinned()) {
			// 	return -1;
			// }
			// return 1;
		});
	}

	async workState(resp) {
		if (resp && resp.success && resp.data) {
			// load users first, as we use them on other parts
			if (resp.data.users) {
				for (let obj of resp.data.users) {
					let peerUser = this.peerUserByAPIResult(obj);
					let userStatusChanged = peerUser.checkOnlineChanged();
					if (userStatusChanged) {
						console.error('ONLINE ', peerUser);
						this.emit('online', {peerUser: peerUser});
					}
				}
			}
			if (resp.data.chats) {
				for (let chat of resp.data.chats) {
					let peer = this.peerByAPIResult(chat);
				}
			}
			if (resp.data.new_messages) {
				for (let message of resp.data.new_messages) {
					let peer = this.apiMessageToPeer(message);
					this.messageToPeer(peer, message);
				}
			}
			if (resp.data.other_updates) {
				for (let otherUpdate of resp.data.other_updates) {
					if (otherUpdate._ == 'updateNewChannelMessage') {
						let peer = this.apiMessageToPeer(otherUpdate.message);
						this.messageToPeer(peer, otherUpdate.message);
					} else if (otherUpdate._ == 'updateChannelTooLong') {
						this.nextChannelState(otherUpdate.channel_id); // no await
					} else if (otherUpdate.peer) {
						// updateDialogPinned and others
						console.error(otherUpdate, 'update');
					}
				}
			}
		}
	}


	async nextChannelState(channel_id) {
		const options = {
			pts: this._channels[channel_id]._pts,
			date: this._state.date,
			channel: { "_": "inputChannel", "channel_id": channel_id, "access_hash": this._channels[channel_id]._apiObject.access_hash },
			filter: { "_": "channelMessagesFilterEmpty" }
		};
		const resp = await this._user.invoke('updates.getChannelDifference', options);

		console.error('todo this');
		console.log(resp);
	}

	async nextState() {
		if (!this._user.signedIn()) {
			return false;
		}

		const resp = await this._user.invoke('updates.getDifference', {pts: this._state.pts, date: this._state.date});
		if (resp && resp.data) {
			if (resp.data.state) {
				await this.workState(resp);
				this._state = resp.data.state;
			}
		}
	}

	async search(q, inPeer) {
		q = (''+q).toLowerCase();

		if (!this._user.signedIn()) {
			return false;
		}

		const ret = {
			global: [],   // contacts.search
			messages: [], // messages.searchGlobal
			local: [],
			totalMessages: 0,
		};

		// 1st step. Search in local stored peers
		for (let peer of this._sortedPeers) {
			if (peer.isSearchMatch(q)) {
				ret.local.push(peer);
			}
		}

		// 2nd step, messages.searchGlobal
		let resp = null;

		if (!inPeer) {
			resp = await this._user.invoke('messages.searchGlobal', {q: q, offset_peer: { "_": "inputPeerEmpty" }});
		} else {
			resp = await this._user.invoke('messages.search', {q: q, limit: 50, peer: inPeer.getInputPeerObject(), filter: {"_":"inputMessagesFilterEmpty"}});
		}

		// console.log(resp);

		console.error(resp);

		if (resp && resp.success && resp.data) {
			// load users first, as we use them on other parts
			if (resp.data.users) {
				for (let obj of resp.data.users) {
					// this.peerUserByAPIResult(obj);
					let peerUser = this.peerUserByAPIResult(obj);
					peerUser.checkOnlineChanged();
				}
			}
			if (resp.data.chats) {
				for (let chat of resp.data.chats) {
					let peer = this.peerByAPIResult(chat);
				}
			}
			if (resp.data.messages) {
				for (let message of resp.data.messages) {
					let peer = this.apiMessageToPeer(message);
					let peerMessage = this.messageToPeer(peer, message, true);

					if (peer && peerMessage) {
						ret.messages.push({peer: peer, peerMessage: peerMessage});
					} else {
						console.error('Cant find peer and peerMessage for', message);
					}

				}
			}
			if (resp.data.count) {
				ret.totalMessages = resp.data.count;
			} else {
				ret.totalMessages = resp.data.messages.length;
			}
		}

		// 3rd step.
		if (!inPeer) {
			resp = await this._user.invoke('contacts.search', {q: q});
			if (resp.data && resp.data.chats && resp.data.chats.length) {
				for (let chat of resp.data.chats) {
					console.error(chat);
					let peer = this.peerByAPIResult(chat);
					console.error(peer);
					if (peer) {
						ret.global.push(peer);
					}
				}
			}
		}

		return ret;
	}

}

module.exports = PeerManager;
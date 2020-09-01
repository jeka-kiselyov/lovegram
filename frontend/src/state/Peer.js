const EventTarget = window.classes.EventTarget;
const Storage = window.classes.Storage;

const PeerMessage = require('./PeerMessage.js');
const MessageMedia = require('./MessageMedia.js');
const MessageDoc = require('./MessageDoc.js');
const MessageAudio = require('./MessageAudio.js');
const MessageWebpage = require('./MessageWebpage.js');

const Format = require('../utils/Format.js');
const Mime = require('../utils/Mime.js');

const PeerScroller = require('./PeerScroller.js');

class Peer extends PeerScroller {
	constructor(params = {}) {
	    super(params);

		this._id = params.id;			// our app's unique peer id
		// this._app = params.app;
		// this._user = params.app._user;
		this._peerManager = params.peerManager;

		this._displayMessage = '';

		this._type = params.type;			// 'dialog'
		this._apiObject = params.apiObject; // object returned from TG api

		if (this._type == 'dialog') {
			// get peer user
			this._peerUser = this._peerManager.peerUser(this._apiObject.peer.user_id);
			this._peerUser._peer = this;
		}

		this._messages = [];
		this._messageIds = {};
		this._mostRecentMessageDate = 0;
		this._mostRecentMessage = null;

		this._messageGroups = {};

		this._pts = null;
		this._notify_settings = null;

		this._unreadCount = 0;
		this._readByPeer = null;

		this._read_inbox_max_id = null;
		this._read_outbox_max_id = null;


		this.fillUpdatesFromAPIResult(this._apiObject);

		// this._avatarDisplayed = false;

		this._oldestMessageId = Infinity;
		this._thereReMoreMessages = true;
		this._loadingMoreMessages = false;

		this._messagesWereLoaded = false;
		this._messagesWereRestored = false;

		this._media = [];
		this._mediaIds = {};

		this._docs = [];
		this._docsIds = {};

		this._stickers = [];
		this._stickersIds = {};

		this._webpages = [];
		this._webpagesIds = {};

		this._polls = [];
		this._pollsIds = {};

		this._audios = [];
		this._audiosIds = {};

		this._folder = null;
		this._folderId = null;

		this._fullInfoLoaded = false;

		this._fullInfoPromiseResolver = null;
		this._fullInfoPromise = new Promise((res)=>{ this._fullInfoPromiseResolver = res; });
		this._fullInfo = {};

		this._makeReadyPromiseResolver = null;
		this._isReady = false;

		this._hasAvatar = null;
		this._avatarBlobURL = null;
	}

	async makeReady() {
		if (this._makeReadyPromiseResolver) {
			await this._makeReadyPromise;
			return;
		}
		this._makeReadyPromise = new Promise((res)=>{ this._makeReadyPromiseResolver = res; });
		// this._ignore = true;

		await this.loadInitial();
		// await this.getFullInfo();

		// this._ignore = false;

		this._makeReadyPromiseResolver();
		this._isReady = true;
	}

	async subscribe(subs) {
		const params = {
			channel: {
				"_": "inputChannel",
				"channel_id": this._apiObject.id,
				"access_hash": this._apiObject.access_hash
			}
		};
		let method = 'channels.joinChannel';
		if (!subs) {
			method = 'channels.leaveChannel';
		}

		const resp = await this._peerManager._user.invoke(method, params);
		// console.error(resp);
	}

	isSubscribed() {
		try {
			if (this._type == 'channel' && this._apiObject.pFlags.left) {
				return false;
			}
		} catch(e) {}
		return true;
	}

	isArchived() {
		return (this._folderId == 1);
	}

	async toggleDialogArchived(archived) {
		if (!this._apiObject.pFlags) {
			this._apiObject.pFlags = {};
		}
		this._apiObject.pFlags.pinned = false;
		if (this.isArchived()) {
			this._peerManager._folders[1].removePeer(this);
		} else {
			this._peerManager._folders[1].addPeer(this);

		}
		// const params = {
		// 	pinned: pinned,
		// 	flags: pinned,
		// 	peer: {
		// 		_: 'inputDialogPeer',
		// 		peer: this.getInputPeerObject(),
		// 	},
		// };
		// const success = await this._peerManager._user.invoke('messages.toggleDialogPin', params);
		// if (success) {
		// 	if (!this._apiObject.pFlags) {
		// 		this._apiObject.pFlags = {};
		// 	}
		// 	this._apiObject.pFlags.pinned = pinned;
		// }
		return true;
	}

	async toggleDialogMuted(muted) {
		let mute_until = (muted ? (Math.ceil((new Date()).getTime() / 1000) + 24*365*60*60) : 0);
		const params = {
			peer: {
				_: 'inputNotifyPeer',
				peer: this.getInputPeerObject(),
			},
			settings: {
				_: 'inputPeerNotifySettings',
				mute_until: mute_until,
				flags: 4,
			},
		};
		const success = await this._peerManager._user.invoke('account.updateNotifySettings', params);
		if (success) {
			this._notify_settings = { mute_until: mute_until };
			this._peerManager.emit('updated', {peer: this});
		}
	}

	async toggleDialogPin(pinned) {
		const params = {
			pinned: pinned,
			flags: pinned,
			peer: {
				_: 'inputDialogPeer',
				peer: this.getInputPeerObject(),
			},
		};
		const success = await this._peerManager._user.invoke('messages.toggleDialogPin', params);
		if (success) {
			if (!this._apiObject.pFlags) {
				this._apiObject.pFlags = {};
			}
			this._apiObject.pFlags.pinned = pinned;
		}
		return success;
	}

	hasMessageId(id) {
		return (id in this._messageIds);
	}

	async processApiUpdate(updateObject) {
		// console.error('processApiUpdate', this, updateObject);

		let isUpdated = false;
		if (updateObject._ == 'folderPeer') {
			console.error('updaing folder 2');
			this._folderId = updateObject.folder_id;
			isUpdated = true;
		}
		if (updateObject._ == 'updateReadHistoryOutbox') {
			this._read_outbox_max_id = updateObject.max_id;
			isUpdated = true;

			this._peerManager.emit('readybypeer', {peer: this});
		}
		// if (updateObject._ == 'updateUserPhoto') {
		// 	if (this._peerUser) {
		// 		this._peerUser._apiObject.photo = updateObject.photo;
		// 	}
		// 	this._peerManager.emit('avatar', {peer: this});
		// 	isUpdated = true;
		// }
		// if (updateObject._ == 'updateUserName') {
		// 	if (this._peerUser) {
		// 		this._peerUser._apiObject.first_name = updateObject.first_name;
		// 		this._peerUser._apiObject.last_name = updateObject.last_name;
		// 	}
		// 	isUpdated = true;
		// }
		if (updateObject._ == 'updateReadHistoryInbox' || updateObject._ == 'updateReadChannelInbox') {
			this._read_inbox_max_id = updateObject.max_id;
			if (updateObject.still_unread_count) {
				this._unreadCount = updateObject.still_unread_count;
			} else {
				this._unreadCount = 0;
			}
			isUpdated = true;
		}
		if (updateObject._ == 'updateDeleteMessages') {
			for (let messageId of updateObject.messages) {
				await this.deleteMessage(messageId);
				if (!this._messages.length) {
					// need to load at least something
					await this.loadInitial();
				}
				this._displayMessage = this._messages[this._messages.length - 1].getDisplayMessage(true);
			}
			isUpdated = true;
		}
		if (updateObject._ == 'updateEditMessage') {
			this._displayMessage = this._messages[this._messages.length - 1].getDisplayMessage(true);
			isUpdated = true;
		}
		if (updateObject._ == 'updateDialogPinned') {
			this._apiObject.pFlags.pinned = updateObject.pFlags.pinned;
			isUpdated = true;
		}
		if (updateObject._ == 'updateNotifySettings') {
			this._notify_settings = updateObject.notify_settings;
			isUpdated = true;
		}

		return isUpdated;
	}

	/**
	 * Serialize peer data
	 * @param  {Boolean} withHistory with most recent 20 messages (true), or only the last one (false)
	 * @return {Object}             Object to store in json
	 */
	serialize(withHistory) {
		const data = {
			apiObject: this._apiObject,
			id: this._id,
			type: this._type,
			messages: [],
			users: [],
			peerUser: null,
			// avatarBlobURL: this._avatarBlobURL,
		};

		let keys = ['fullInfo', 'pts', 'unreadCount', 'read_outbox_max_id', 'read_inbox_max_id', 'readByPeer', 'notify_settings', 'folderId'];
		for (let key of keys) {
			data[key] = this['_'+key];
		}

		if (this._peerUser) {
			data.peerUser = this._peerUser.serialize();
		}

		this.sortMessages();

		let peerUsersIds = [];
		for (let i = this._messages.length - 1; (i >= 0 && (!data.messages.length || withHistory) && data.messages.length < 20); i--) {
			let message = this._messages[i];
			data.messages.push(message.serialize());
			if (message._peerUser && peerUsersIds.indexOf(message._peerUser._id) == -1) {
				data.users.push(message._peerUser.serialize());
				peerUsersIds.push(message._peerUser._id);
			}
		}

		return data;
	}

	// normalizeUint8(bytes) {
	//     if (bytes && bytes.name != 'Uint8Array' && bytes[0] !== undefined) {
	//     	// from JSON
	//     	let a = [];
	//     	let i = 0;
	//     	while (bytes[i] || bytes[i] === 0) {
	//     		a.push(bytes[i]);
	//     		i++;
	//     	}
	//     	bytes = new Uint8Array(a);
	//     }

	//     return bytes;
	// }

	// normalizeApiObject(apiObject) {
	// 	if (apiObject.file_reference) {
	// 		apiObject.file_reference = this.normalizeUint8(apiObject.file_reference);
	// 	}
	// 	if (apiObject.attributes && apiObject.attributes[0] && apiObject.attributes[0].waveform) {
	// 		apiObject.attributes[0].waveform = this.normalizeUint8(apiObject.attributes[0].waveform);
	// 	}
	// 	if (apiObject.sizes && apiObject.sizes[0] && apiObject.sizes[0].bytes) {
	// 		apiObject.sizes[0].bytes = this.normalizeUint8(apiObject.sizes[0].bytes);
	// 	}
	// 	if (apiObject.thumbs && apiObject.thumbs[0] && apiObject.thumbs[0].bytes) {
	// 		apiObject.thumbs[0].bytes = this.normalizeUint8(apiObject.thumbs[0].bytes);
	// 	}
	// 	let keys = ['media', 'photo','document','webpage'];
	// 	for (let key of keys) {
	// 		if (apiObject[key]) {
	// 			this.normalizeApiObject(apiObject[key]);
	// 			// break ?
	// 		}
	// 	}
	// }

	deserialize(data) {
		let keys = ['fullInfo', 'pts', 'unreadCount', 'read_outbox_max_id', 'read_inbox_max_id', 'readByPeer', 'notify_settings', 'folderId'];
		for (let key of keys) {
			this['_'+key] = data[key];
		}

		// console.error('deserialize', this._id);

		if (data.messages) {
			for (let mApiObject of data.messages) {
				// normalize uint8array
				// this.normalizeApiObject(mApiObject);
				if (mApiObject.id && typeof mApiObject.id != 'string') {
					// it may be the string if we sent the message but got no confirmation back
					this.messageByAPIResult(mApiObject, false, true);
				}
			}

			this.sortMessages();
			/// we need to unset the oldest message id, so loading new messages can work ok
			this._oldestMessageId = Infinity;

			if (this._messages.length > 1) {
				// this.recalcVisible();
				this._messagesWereRestored = true;
			}
		}
	}

	hasReadBadge() {
		// last message is mine
		if (this._mostRecentMessage && this._mostRecentMessage.isFromMe()) {
			return this._mostRecentMessage.seenByPeer();
		}
		return null;
	}

	isMuted() {
		return (this._notify_settings && this._notify_settings.mute_until && this._notify_settings.mute_until > Peer.cTime);
	}

	isPinned() {
		return (this._apiObject.pFlags && this._apiObject.pFlags.pinned);
	}

	isMine() {
		if (this._peerUser && this._peerUser.isMe()) {
			return true;
		}
		return false;
	}

	getInfoType() {
		return this.getDisplayType();
	}

	getInfoString() {
		let displayType = this.getDisplayType();

		let sc = this._apiObject.participants_count || this._fullInfo.participants || 0;
		if (displayType == 'channel') {
			return Format.numberToString(sc)+' subscriber'+(sc != 1 ? 's' : '');
		} else if (displayType == 'dialog') {
			if (this._peerUser.isMe()) {
				return 'chat with yourself';
			} else {
				return this._peerUser.lastSeenString();
			}
		} else if (displayType == 'chat') {
			let r = 'chat';
			if (sc) {
				r = Format.numberToString(sc)+' member'+(sc != 1 ? 's' : '');
			} else {
				return r;
			}
			if (this._fullInfoLoaded) {
				// has info about online count
				let oc = this._fullInfo.participantsOnline;
				if (oc) {
					r += ', '+Format.numberToString(oc)+' online';
				}
				return r;
			}
			return r;
		}
	}

	trimMessagesToRecent() {
		this._messages = this._messages.slice(-40);
		this._messageIds = {};
		this._oldestMessageId = Infinity;
		for (let peerMessage of this._messages) {
			this._messageIds[peerMessage._id] = peerMessage;
			if (peerMessage._id < this._oldestMessageId) {
				this._oldestMessageId = peerMessage._id;
			}
		}
	}

	async flushAvatar() {
		if (this._peerUser) {
			return this._peerUser.flushAvatar();
		}
		this._hasAvatar = null;
		this._avatarBlobURL = null;

		await this._peerManager._media.flushPeerAvatar(this);
		await this.getAvatarBlobURL();
	}

	hasAvatar() {
		if (this._peerUser) {
			return this._peerUser.hasAvatar();
		}
		return this._hasAvatar;
	}

	getAvatarCacheURL() {
		if (this._peerUser) {
			return this._peerUser.getAvatarCacheURL();
		}
		return './tg/avatar_peer_'+this._id+'.png';
	}

	getAvatarBlobURLSync() {
		if (this._peerUser) {
			return this._peerUser.getAvatarBlobURLSync();
		}
		return this._avatarBlobURL;
	}

	async getAvatarBlobURL() {
		if (this._peerUser) {
			return this._peerUser.getAvatarBlobURL();
		}

		if (this._avatarBlobURL) {
			return this._avatarBlobURL;
		}
		if (this._hasAvatar === false) {
			return null;
		}

		let avatarBlobURL = await this._peerManager._media.getPeerAvatarAndReturnBlobURL(this);
		if (avatarBlobURL === null) {
			this._hasAvatar = false;

			return null;
		} else {
			this._hasAvatar = true;
			this._avatarBlobURL = avatarBlobURL;

			return this._avatarBlobURL;
		}
	}

	// getCachedAvatarURL() {
	// 	if (this._peerUser) {
	// 		return this._peerUser.getCachedAvatarURL();
	// 	}

	// 	this._peerManager._media.getPeerAvatar(this); // not waiting async
	// 	return './tg/avatar_peer_'+this._id+'.png';
	// }

	getAvatarInitials() {
		if (this._peerUser) {
			return this._peerUser.getAvatarInitials();
		} else {
			return this._apiObject.title ? this._apiObject.title.substring(0, 1) : '';
		}
	}

	getAvatarColor() {
		return ((''+this._id).substr(-1) % 8) + 1;
	}

	// async getAvatar() {
	// 	this._avatarDisplayed = true;
	// 	return this._peerManager._media.getPeerAvatar(this);
	// }

	async loadPreviewsFromCache() {
		// console.time('loadPreviewsFromCache');
		// console.time('loadAvatarsFromCache');
		// console.error((new Date).getTime(), 'Peer | loadPreviewsFromCache');

		// first step - get messages avatars

		const users = [];
		for (let m of this._messagesVisible) {
			m.authorPeer(); // double check the author peer
			if (!m.isService() && m._authorPeer && m._authorPeer._hasAvatar === null) {
				// console.log('m av cache', m);
				users.push(m._authorPeer._peerUser ? m._authorPeer._peerUser : m._authorPeer);
			}
		}

		// console.error('loading avatars for', users);

		if (users.length) {
			let items = [];
			for (let user of users) {
				items.push({url: './tg/avatar_peer_dialog_'+user._id+'.png', user: user}); // see MediaManager -> getPeerAvatarAndReturnBlobURL()
			}
			await this._peerManager._user._protocol.getCachedResources(items);
			for (let item of items) {
				if (item.blobURL) {
					item.user._avatarBlobURL = item.blobURL;
					item.user._hasAvatar = true;
				}
			}

		}
		// console.log('cache avatars: '+users.length, users);
		// console.timeEnd('loadAvatarsFromCache');


		// @todo: group to one call
		// console.error((new Date).getTime(), 'Peer | loadPreviewsFromCache Media');
		await this._peerManager._user._protocol.getCachedResources(this._media.concat(this._stickers, this._webpages));
		// console.error((new Date).getTime(), 'Peer | loadPreviewsFromCache Stickers');
		// await this._peerManager._user._protocol.getCachedResources(this._stickers);
		// console.error((new Date).getTime(), 'Peer | loadPreviewsFromCache _webpages');
		// await this._peerManager._user._protocol.getCachedResources(this._webpages);

		/// load cached user avatars

		// for (let w of this._stickers) {
		// 	console.error(w.cached);
		// }
		// console.timeEnd('loadPreviewsFromCache');
	}

	async getFullInfo() {
		if (this._fullInfoLoaded) {
			await this._fullInfoPromise;
			return this._fullInfo;
		}

		this._fullInfoLoaded = true;

		const options = {
		};
		let method = null;

		if (this._type == 'dialog') {
			options.id = {
				"_": "inputUser",
				"user_id": this._peerUser._apiObject.id,
				"access_hash": this._peerUser._apiObject.access_hash,
			};
			method = 'users.getFullUser';
		} else if (this._type == 'channel') {
			options.channel = {
				"_": "inputChannel",
				"channel_id": this._apiObject.id,
				"access_hash": this._apiObject.access_hash
			};
			method = 'channels.getFullChannel';
		} else if (this._type == 'chat') {
			options.chat_id = this._apiObject.id;
			method = 'messages.getFullChat';
		}

		const resp = await this._peerManager._user.invoke(method, options);
		if (resp && resp.data) {
			this._fullInfo = resp.data;

			// prepare some
			this._fullInfo.about = this._fullInfo.about || '';
			this._fullInfo.participants = '';
			this._fullInfo.participantsOnline = '';
			this._fullInfo.username = '';
			this._fullInfo.phone = '';

			if (resp.data.full_chat) {
				this._fullInfo.about = resp.data.full_chat.about;
				this._fullInfo.participants = resp.data.full_chat.participants_count;
				this._fullInfo.participantsOnline = resp.data.full_chat.online_count;
			}
			if (resp.data.chats && resp.data.chats[0]) {
				this._fullInfo.participants = this._fullInfo.participants || resp.data.chats[0].participants_count;
				this._fullInfo.username = (resp.data.chats[0].username) ? ('t.me/'+resp.data.chats[0].username) : '';
			}
			if (resp.data.user) {
				this._fullInfo.username = resp.data.user.username;
				this._fullInfo.phone = resp.data.user.phone;
			}


			this._fullInfoPromiseResolver();
			this.emit('info');

			return this._fullInfo;
		}
	}

	canSendMessageTo() {
		if (this._type == 'channel') {
			if (this._apiObject.pFlags) {
				if (this._apiObject.pFlags.creator || this._apiObject.pFlags.megagroup) {
					return true;
				} else {
					return false;
				}
			}
		} else if (this._type == 'chat') {
			if (this._apiObject.title && !this._apiObject.migrated_to && this._apiObject._ != 'chatForbidden') {
				return true;
			} else {
				return false;
			}
		} else if (this._type == 'dialog') {
			if (this._peerUser && this._peerUser.isRemoved()) {
				return false;
			}
		}

		return true;
	}


	getDisplayType() {
		if (this._type != 'channel') {
			return this._type;
		}

		if (this._apiObject.pFlags && this._apiObject.pFlags.megagroup) {
			return 'chat';
		}

		return 'channel';
	}

	async sendRecordedVoice() {
		let data = this._peerManager._app._mediaPlayer._recorded;
		await this.sendFiles([{
				filename: 'voice.ogg',
				bytes: data,
				type: 'voice',
			}]);
	}

	async sendGif(messageMedia) {
		const generatedRandomId = 'c'+this._id+'_'+(''+Math.random()).split('.').join('');
		const params = {
			peer: this.getInputPeerObject(),
			random_id: generatedRandomId,
			media: {
				_: 'inputMediaDocument',
				id: {
					_: 'inputDocument',
					id: messageMedia._id,
					access_hash: messageMedia._apiObject.access_hash,
					file_reference: messageMedia._apiObject.file_reference,
				}
			},
			flags: true    /// this little piece drove me crazy
		};

		let resp = await this._peerManager._user.invoke('messages.sendMedia', params);
		if (resp && resp.data) {
			this._peerManager.processApiUpdates(resp.data);
		}
	}

	async sendFiles(filesData, caption = '') {
		const inputMedias = [];
		// console.error('uploading filesData', filesData);

		let hasDocs = false;
		for (let file of filesData) {
			let bytes = file.bytes;
			if (file.ab) {
				bytes = new Uint8Array(file.ab);
			}

			const generatedRandomId = 'c'+this._id+'_'+(''+Math.random()).split('.').join('');
			const params = {
				peer: this.getInputPeerObject(),
				random_id: generatedRandomId,
				flags: true    /// this little piece drove me crazy
			};

			const inputFile = await this._peerManager._media.uploadPhoto(bytes, file.filename);
			if (file.type == 'photo') {
				inputMedias.push({"_": "inputMediaUploadedPhoto", "file":inputFile});
				// this._peerManager._user.invoke('messages.sendMedia', params);
			} else if (file.type == 'video') {
				let attributes = [{
					"_": "documentAttributeVideo",
					"flags": true,
					"w": 200,
					"h": 200,
				},{
					"_": "documentAttributeFilename",
					"file_name": file.filename
				}];
				inputMedias.push({"_": "inputMediaUploadedDocument", "file":inputFile, "mime_type":'video/mp4', "attributes": attributes});
			} else if (file.type == 'doc' || file.type == 'voice') {
				// let attributes = [];
				let attributes = [{
					"_": "documentAttributeFilename",
					"file_name": file.filename
				}];
				inputMedias.push({"_": "inputMediaUploadedDocument", "file":inputFile, "mime_type": Mime.filenameToMime(file.filename), "attributes": attributes});
				hasDocs = true;
			}
		}

		const params = {
			peer: this.getInputPeerObject(),
		};
		const random_id = (''+Math.random()).split('0.').join('');
		let i = 0;

		if (inputMedias.length > 1 && !hasDocs) {
			const multi_media = [];

			for (let im of inputMedias) {
				params.media = im;
				let resp = await this._peerManager._user.invoke('messages.uploadMedia', params);
				let sm = null;
				if (resp && resp.data) {
					let ins = 'inputMediaPhoto';
					const obj = {
						'_': 'inputPhoto',
					};
					let t = resp.data.photo;
					if (resp.data.document) {
						t = resp.data.document;
						obj._ = 'inputDocument';
						ins = 'inputMediaDocument';
						// obj.media._ = 'inputMediaDocument';
					}

					obj.id = t.id;
					obj.access_hash = t.access_hash;
					obj.file_reference = t.file_reference;

					const ism = {
						'_': 'inputSingleMedia',
						'random_id':  random_id + (i++),
						'media': {
							'_': ins,
							'id': obj,
						}
					};
					if (!multi_media.length && caption) {
						ism.message = caption;
					}

					multi_media.push(ism);
				}
			}

			params.multi_media = multi_media;
			let resp = await this._peerManager._user.invoke('messages.sendMultiMedia', params);
			if (resp && resp.data) {
				this._peerManager.processApiUpdates(resp.data);
			}
		} else {
			params.random_id = random_id;
			for (let media of inputMedias) {
				params.media = media;
				params.message = '';
				if (!i && caption) {
					params.message = caption;
				}
				params.random_id = random_id + (i++);
				let resp = await this._peerManager._user.invoke('messages.sendMedia', params);
				if (resp && resp.data) {
					this._peerManager.processApiUpdates(resp.data);
				}
			}
		}
	}

	// checkMessageUpdateIdApiResp(apiResp, generatedPeerMessage) {
	// 	let data = apiResp.data || apiResp;
	// 	if (!data) {
	// 		return;
	// 	}

	// 	let from = generatedPeerMessage._apiObject.id;
	// 	let to = null;
	// 	if (data && data.id) {
	// 		to = data.id;
	// 	} else {
	// 		if (data.updates) {
	// 			for (let update of data.updates) {
	// 				if (update._ == 'updateMessageID' && update.random_id == from) {
	// 					to = update.id;
	// 				}
	// 			}
	// 		}
	// 	}


	// 	if (to) {
	// 		generatedPeerMessage._id = to;
	// 		generatedPeerMessage._apiObject.id = to;

	// 		this._messageIds[to]  = generatedPeerMessage;
	// 		this.emit('messageIdChange', {
	// 			from: from,
	// 			to: to
	// 		});
	// 	}
	// }


	sendSticker(messageSticker) {
		const generatedRandomId = '1'+(''+Math.random()).split('.').join('');
		const params = {
			peer: this.getInputPeerObject(),
			random_id: generatedRandomId,
			flags: true    /// this little piece drove me crazy
		};

		params.media = {"_": "inputMediaDocument", "id":
			{"_":"inputDocument", "id": messageSticker.id, "access_hash": messageSticker._apiObject.access_hash, "file_reference":messageSticker._apiObject.file_reference}
		};

		this._peerManager._user.invoke('messages.sendMedia', params)
			.then((resp)=>{
				if (resp.data) {
					this._peerManager.processApiUpdates(resp.data);
				}
				// this.checkMessageUpdateIdApiResp(resp, peerMessage);
			});
	}

	forwardBotResult(botResults) {
		const generatedRandomId = '1'+(''+Math.random()).split('.').join('');

		if (botResults._ == 'messages.botResults') {
			for (let result of botResults.results) {
				const params = {
					peer: this.getInputPeerObject(),
					random_id: generatedRandomId,
					query_id: botResults.query_id,
					id: result.id,
					flags: true    /// this little piece drove me crazy
				};

				this._peerManager._user.invoke('messages.sendInlineBotResult', params)
					.then((resp)=>{
						if (resp.data) {
							this._peerManager.processApiUpdates(resp.data);
						}
						// this.checkMessageUpdateIdApiResp(resp, peerMessage);
					});
			}
		} else {
			// start in group
			this._peerManager._user.invoke('messages.startBot', {random_id: generatedRandomId, bot: botResults.iu,  peer: this.getInputPeerObject(), start_param: botResults.start_param})
					.then((resp)=>{
						if (resp.data) {
							this._peerManager.processApiUpdates(resp.data);
						}
						// this.checkMessageUpdateIdApiResp(resp, peerMessage);
					});
		}

	}

	forwardMessage(peerMessage) {
		const generatedRandomId = '1'+(''+Math.random()).split('.').join('');
		const params = {
			from_peer: peerMessage._peer.getInputPeerObject(),
			to_peer: this.getInputPeerObject(),
			id: [peerMessage._id],
			random_id: [generatedRandomId],
			flags: true    /// this little piece drove me crazy
		};

		this._peerManager._user.invoke('messages.forwardMessages', params)
			.then((resp)=>{
				if (resp.data) {
					this._peerManager.processApiUpdates(resp.data);
				}
				// this.checkMessageUpdateIdApiResp(resp, peerMessage);
			});
	}


	forwardMessageMedia(messageMedia) {

		const generatedRandomId = '1'+(''+Math.random()).split('.').join('');
		const params = {
			from_peer: messageMedia._peer.getInputPeerObject(),
			to_peer: this.getInputPeerObject(),
			id: [messageMedia._messageApiObject.id],
			random_id: [generatedRandomId],
			flags: true    /// this little piece drove me crazy
		};

		this._peerManager._user.invoke('messages.forwardMessages', params)
			.then((resp)=>{
				if (resp.data) {
					this._peerManager.processApiUpdates(resp.data);
				}
				// this.checkMessageUpdateIdApiResp(resp, peerMessage);
			});
	}

	sendMessage(message) {
		const generatedRandomId = '1'+(''+Math.random()).split('.').join('');
		const params = {
			peer: this.getInputPeerObject(),
			message: message.message,
			random_id: generatedRandomId,
			flags: true    /// this little piece drove me crazy
		};

		// const dateNow = Math.round(new Date().getTime()/1000);

		// const apiObject = {
		// 		"_": "message",
		// 		"id": generatedRandomId,
		// 		"message": message.message,
		// 		"from_id": this._peerManager._mePeerUser._id,
		// 		"date": dateNow
		// 	};

		if (message.replyTo) {
			params.reply_to_msg_id = message.replyTo._id;
			// apiObject.reply_to_msg_id = message.replyTo._id;
		}

		// if (message.webpage) {
		// 	apiObject.media = {
		// 		webpage: message.webpage,
		// 	};
		// }

		// if (message.entities) {
		// 	apiObject.entities = message.entities;
		// }

		// const peerMessage = new PeerMessage({
		// 	apiObject: apiObject,
		// 	peer: this,
		// 	peerUser: this._peerUser,
		// 	peerManager: this._peerManager
		// });

		// this._messages.push(peerMessage);
		// this.sortMessages();

		this._peerManager._user.invoke('messages.sendMessage', params)
			.then((resp)=>{
				if (resp.data) {
					this._peerManager.processApiUpdates(resp.data);
				}
				// this.checkMessageUpdateIdApiResp(resp, peerMessage);
			});

		// this._mostRecentMessageDate = dateNow;
		// this._displayMessage = peerMessage.getDisplayMessage(true);
		// this.emit('update');

		// return peerMessage;
	}

	sortMessages() {
		this._messages.sort((a,b) => (a._id > b._id) ? 1 : ((b._id > a._id) ? -1 : 0));
	}

	async getDaysMessages(month, year, cb) {
		let daysInMonth = 32 - new Date(year, month, 32).getDate();
		let days = [];
		let curTime = new Date() / 1000;

		const doSplit = async (fromI, toI, rec)=>{
			let from = days[fromI].from;
			let fromD = from.getTime() / 1000;
			let to = days[toI].to;

			// console.error('checking ', fromI, toI, from, to);
			const options = {
				peer: this.getInputPeerObject(),
				// min_date: (from.getTime() / 1000),
				offset_date: (to.getTime() / 1000),
				limit: 15,
			};

			let resp = await this._peerManager._user._protocol.invokeAndCache('messages.getHistory', options,{max: 999990});
			let lastDayI = null;
			if (resp.messages) {
				for (let m of resp.messages) {
					let d = new Date(m.date * 1000);
					console.log(d);
					if (d.getTime()/1000 < fromD) { if (cb) { cb(days); }  return; }
					let dayI = d.getDate() - 1;
					days[dayI].has = true;
					days[dayI].id = m.id;
					lastDayI = dayI;
				}
			}

			if (cb) { cb(days); }

			// console.error('lastDayI', lastDayI);
			// console.error('resp.data.messages.length', resp.data.messages.length);
			if (lastDayI && lastDayI != fromI && resp.messages.length == options.limit) {
				if (rec < 30)
				await doSplit(fromI, lastDayI - 1, rec+1);
			}
			// console.error(resp);
		};

		for (let i = 1; i <= daysInMonth; i++) {
			days.push({
				from: new Date(year, month, i, 0, 0),
				to: new Date(year, month, i+1, 0, -1),
				has: false,
				id: null,
			});
		}

		// await Promise.all([doSplit(15, days.length -1, 1), doSplit(0, 14, 1)]);
		await doSplit(0, days.length -1, 1);

		// console.error(days);

		return days;
	}

	async loadElements(params) {
		if (params.initialization && params.refs && params.refs.length) {
			return params.refs;
		}

		const options = {
			peer: this.getInputPeerObject(),
			limit: 12,
			filter: {"_": 'inputMessagesFilter'+params.filter}
		};

		if (this['__last'+params.filter+'MessageOffsetId']) {
			options.offset_id = this['__last'+params.filter+'MessageOffsetId'];
		}

		const onM = (message, subprop) => {
			if (message[params.objProp] && message[params.objProp][subprop] && !params.idsRefs[message[params.objProp][subprop].id]) {
				const item = new params.classN({
					apiObject: message[params.objProp][subprop],
					peerManager: this._peerManager,
					messageApiObject: message,
					peer: this,
				});
				params.refs.push(item);
				params.idsRefs[item._id] = item;
			}
		};

		const resp = await this._peerManager._user.invoke('messages.search', options);
		if (resp && resp.data && resp.data.messages) {
			if (resp.data.users) {
				for (let user of resp.data.users) {
					this._peerManager.peerUserByAPIResult(user);
				}
			}
			for (let message of resp.data.messages) {
				for (let subprop of params.objSubProp) {
					onM(message, subprop);
				}
				this['__last'+params.filter+'MessageOffsetId'] = message.id;
			}
		}

		return params.refs;
	}

	async loadWebpages(initialization) {
		return await this.loadElements({
			initialization,
			refs: this._webpages,
			filter: 'Url',
			classN: MessageWebpage,
			idsRefs: this._webpagesIds,
			objProp: 'media',
			objSubProp: ['webpage'],
		});
	}

	async loadAudios(initialization) {
		return await this.loadElements({
			initialization,
			refs: this._audios,
			filter: 'Music',
			classN: MessageAudio,
			idsRefs: this._audiosIds,
			objProp: 'media',
			objSubProp: ['document'],
		});
	}

	async loadDocs(initialization) {
		return await this.loadElements({
			initialization,
			refs: this._docs,
			filter: 'Document',
			classN: MessageDoc,
			idsRefs: this._docsIds,
			objProp: 'media',
			objSubProp: ['document'],
		});
	}

	async loadMedia(initialization) {
		return await this.loadElements({
			initialization,
			refs: this._media,
			filter: 'PhotoVideo',
			classN: MessageMedia,
			idsRefs: this._mediaIds,
			objProp: 'media',
			objSubProp: ['photo', 'document'],
		});
	}

	// async loadSearchedMessages(messageIdToBeIncluded) {
	// 	const options = {
	// 		peer: this.getInputPeerObject(),
	// 		limit: 20
	// 	};
	// 	if (messageIdToBeIncluded) {
	// 		options.offset_id = messageIdToBeIncluded;
	// 		options.add_offset = -10;
	// 	}

	// 	const resp = await this._peerManager._user.invoke('messages.getHistory', options);
	// 	if (resp && resp.success) {
	// 		if (resp.data.users) {
	// 			for (let user of resp.data.users) {
	// 				this._peerManager.peerUserByAPIResult(user);
	// 			}
	// 		}
	// 		let someMessages = false;
	// 		let messages = [];
	// 		if (resp.data.messages) {
	// 			for (let message of resp.data.messages) {
	// 				let peerMessage = this.messageByAPIResult(message, true); // do not add them to messages list
	// 				messages.push(peerMessage);
	// 				someMessages = true;
	// 			}
	// 		}

	// 		messages.sort((a,b) => (a._id > b._id) ? 1 : ((b._id > a._id) ? -1 : 0));

	// 		this.emit('searchedMessages', messages);
	// 		return messages;
	// 	}

	// 	return [];
	// }


	// async loadMessages(messageIdToBeIncluded) {
	// 	if (!this._thereReMoreMessages || this._loadingMoreMessages) {
	// 		return false;
	// 	}

	// 	this._loadingMoreMessages = true;

	// 	const options = {
	// 		peer: this.getInputPeerObject(),
	// 		limit: 20
	// 	};

	// 	if (this._oldestMessageId && this._oldestMessageId != Infinity) {
	// 		options.offset_id = this._oldestMessageId;
	// 	}

	// 	if (messageIdToBeIncluded) {
	// 		options.offset_id = messageIdToBeIncluded;
	// 		options.add_offset = -10;
	// 	}

	// 	const resp = await this._peerManager._user.invoke('messages.getHistory', options);

	// 	if (resp && resp.success) {
	// 		if (resp.data.chats) {
	// 			for (let chat of resp.data.chats) {
	// 				this._peerManager.peerByAPIResult(chat);
	// 			}
	// 		}
	// 		if (resp.data.users) {
	// 			for (let user of resp.data.users) {
	// 				this._peerManager.peerUserByAPIResult(user);
	// 			}
	// 		}
	// 		let someMessages = false;
	// 		if (resp.data.messages) {
	// 			for (let message of resp.data.messages) {
	// 				this.messageByAPIResult(message);
	// 				someMessages = true;
	// 			}
	// 		}

	// 		if (!someMessages && !messageIdToBeIncluded) {
	// 			this._thereReMoreMessages = false;
	// 		}

	// 		this._messagesWereLoaded = true;
	// 	}

	// 	this._loadingMoreMessages = false;

	// 	console.error('sort messages');
	// 	this.sortMessages();

	// 	// this.recalcVisible();

	// 	this.emit('messages');

	// 	return true;
	// }

	getInputPeerObject() {
		if (this._type == 'chat') {
			return {
					"_": "inputPeerChat",
					"chat_id": this._apiObject.id
				};
		} else if (this._type == 'channel') {
			return {
					"_": "inputPeerChannel",
					"channel_id": this._apiObject.id,
					"access_hash": this._apiObject.access_hash
				};
		} else if (this._type == 'dialog') {
			return {
					"_": "inputPeerUser",
					"user_id": this._peerUser._apiObject.id,
					"access_hash": this._peerUser._apiObject.access_hash
				};
		}
	}

	readyToUse() {
		if (!this._mostRecentMessageDate || !this.isSubscribed()) {
			return false;
		}
		return true;
	}

	hasMessages() {
		return (this._messages.length > 0 && (!this._apiObject.pFlags || !this._apiObject.pFlags.deactivated));
	}

	fillUpdatesFromAPIResult(apiObject) {

		this._pts = apiObject.pts || this._pts;
		if (apiObject.unread_count !== undefined) {
			this._unreadCount = apiObject.unread_count;
			this._peerManager.emit('unreadCount', {peer: this});
		}
		this._read_outbox_max_id = apiObject.read_outbox_max_id || this._read_outbox_max_id;
		this._read_inbox_max_id = apiObject.read_inbox_max_id || this._read_inbox_max_id;

		if (apiObject.access_hash) {
			this._apiObject.access_hash = apiObject.access_hash;
		}

		if (!this._apiObject.pFlags) {
			this._apiObject.pFlags = {};
		}

		if (apiObject.pFlags) {
			if (apiObject.pFlags.pinned) {
				this._apiObject.pFlags.pinned = true;
			}
			if (apiObject.pFlags.loadedPinned) {
				this._apiObject.pFlags.loadedPinned = true;
			}
			if (apiObject.pFlags.left && !this._apiObject.pFlags.left) {
				this._apiObject.pFlags.left = true;
				this._peerManager.emit('subscribed', {peer: this});
			} else if (this._apiObject.pFlags.left && !apiObject.pFlags.left) {
				this._apiObject.pFlags.left = false;
				this._peerManager.emit('subscribed', {peer: this});
			}
		}

		if (apiObject.read_outbox_max_id && apiObject.top_message) {
			if (apiObject.read_outbox_max_id > apiObject.top_message) {
				this._readByPeer = false;
			} else {
				this._readByPeer = true;
			}
		}

		try {
			if (apiObject.photo.photo_small.local_id != this._apiObject.photo.photo_small.local_id) {
				// avatar updated
				// @todo: clear cached avatar, and force reload
				this._apiObject.photo = apiObject.photo;
			}
		} catch(e) {}

		if (apiObject.folder_id) {
			// console.error('updating folder');
			this._folderId = apiObject.folder_id;
		} else if (this._folderId && apiObject._ == 'dialog') {
			this._folderId = null;
		}

		this._peerManager.emit('peer', {peer: this});
	}

	async deleteMessage(messageId) {
		if (!messageId in this._messageIds) {
			return false;
		}

		let prevMessageId = null;
		this._messageIds[messageId] = null;
		for (let i = 0; i < this._messages.length; i++) {
			if (this._messages[i]._id == messageId) {
				if (i > 0) {
					prevMessageId = this._messages[i-1]._id;
				}
				this._messages.splice(i,1);
				break;
			}
		}

		this.emit('delete', {id: messageId, prevMessageId: prevMessageId});

		if (this._mostRecentMessage && this._mostRecentMessage._id == messageId) {
			this._mostRecentMessage = null;
			this._mostRecentMessageDate = null;
			this._displayMessage = '';

			// if there're prev message, move them to mostRecent
			if (this._messages.length) {
				this._mostRecentMessage = this._messages[this._messages.length-1];
				this._mostRecentMessageDate = this._messages[this._messages.length-1]._date;
				this._displayMessage = this._messages[this._messages.length-1].getDisplayMessage(true);
			}

			this.emit('update');
		}
	}

	messageByAPIResult(apiObject, doNotAddToPeer, doNotService) {
		if (apiObject.id in this._messageIds) {
			if (this._oldestMessageId > apiObject.id) {
				this._oldestMessageId = apiObject.id;
			}
			this._messageIds[apiObject.id].updateApiObject(apiObject);

			this.emit('updateMessage', {id: apiObject.id});
			return this._messageIds[apiObject.id];
		}

		const peerMessage = new PeerMessage({
			apiObject: apiObject,
			peer: this,
			peerUser: this._peerUser,
			peerManager: this._peerManager
		});

		if (doNotAddToPeer) {
			return peerMessage;
		}

		if (apiObject._ == 'messageService') {
			// @todo: check them
			if (apiObject.date > this._mostRecentMessageDate) {
				this._mostRecentMessageDate = apiObject.date;
				this._displayMessage = peerMessage.getDisplayMessage(true);
			}

			if (!doNotService) {
				if (apiObject.action) {
					if (apiObject.action._ == 'messageActionChatEditTitle') {
						this._apiObject.title = apiObject.action.title;

						this._peerManager.emit('updated', {peer: this});
					} else if (apiObject.action._ == 'messageActionChatEditPhoto') {
						try {
							if (!this._apiObject.photo) {
								this._apiObject.photo = {};
							}
							if (!this._apiObject.photo.photo_small) {
								this._apiObject.photo.photo_small = {};
							}

							this._apiObject.photo.dc_id = apiObject.action.photo.dc_id;
							this._apiObject.photo.photo_small = apiObject.action.photo.sizes[0].location;

							this._peerManager.emit('avatar', {peer: this});
						} catch(e) {}
					}
				}
			}

			// return false;
		}

		let messageGroupId = peerMessage.getGroupId();
		if (messageGroupId) {
			// if we already have this group initialized, add this message to it
			if (this._messageGroups[messageGroupId]) {
				this._messageGroups[messageGroupId].addMessageToGroup(peerMessage);
				this.emit('groupUpdated', {messageGroupId: messageGroupId, groupMessages: this._messageGroups[messageGroupId].getGroupMessages()});
			} else {
				this._messageGroups[messageGroupId] = peerMessage;
			}
		}

		this._messages.push(peerMessage);
		this._messageIds[peerMessage._id] = peerMessage;

		if (this._oldestMessageId > peerMessage._id) {
			this._oldestMessageId = peerMessage._id;
		}

		let wasUnread = this._unreadCount;
		if (peerMessage._date > this._mostRecentMessageDate) {
			this._mostRecentMessageDate = peerMessage._date;
			this._mostRecentMessage = peerMessage;
			this._displayMessage = peerMessage.getDisplayMessage(true);

			if (peerMessage._id > this._read_inbox_max_id && !peerMessage.isFromMe()) {
				this._unreadCount++;
			}
			if (peerMessage.isFromMe()) {
				this._unreadCount = 0;
			}

			this.emit('update');
		}

		if (wasUnread != this._unreadCount) {
			clearTimeout(this._unreadTimeout);
			this._unreadTimeout = setTimeout(()=>{
				this._peerManager.emit('unreadCount', {peer: this});
			}, 100);
		}


		return peerMessage;
	}

	markAsRead(onCloudToo) {
		this._unreadCount = 0;

		// console.error('this._unreadCount', this._unreadCount);
		this._peerManager.emit('unreadCount', {peer: this});


		if (onCloudToo) {
			/// mark as read on server
			const options = {
				peer: this.getInputPeerObject(),
			};

			if (this._mostRecentMessage) {
				options.max_id = this._mostRecentMessage._id;
			}
// inputChannel#afeb712e channel_id:int access_hash:long = InputChannel;
			if (this._type == 'channel') {
				options.channel = options.peer;
				options.channel._ = 'inputChannel';
				this._peerManager._user.invoke('channels.readHistory', options); /// no await, we don't care
			} else {
				this._peerManager._user.invoke('messages.readHistory', options); /// no await, we don't care
			}
		}
	}

	getUnreadCount() {
		return this._unreadCount;
	}

	getDisplayTime(date) {
		const now = new Date();
		date = (date ? new Date(date*1000) : new Date(this._mostRecentMessageDate*1000));

		if (now - date < 86400000) {
			// > 1 day
			return ('0'+date.getHours()).substr(-2)+':'+('0'+date.getMinutes()).substr(-2);
		} else {
			return ''+Format.monthsNames[date.getMonth()]+' '+date.getDate();
		}
	}

	getDisplayNameWB() {
		let verified = (this._apiObject.pFlags && this._apiObject.pFlags.verified);
		return (''+this.getDisplayName()).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+(verified ? ' <span class="verifiedAcc"></span>' : '');
	}

	getDisplayName() {
		if (this._peerUser) {
			if (this._peerUser.isMe()) {
				return 'Saved Messages';
			}
			return ''+this._peerUser._displayName;
		} else {
			return ''+this._apiObject.title || '';
		}
	}

	isSearchMatch(q) {
		if (this.getDisplayName().toLowerCase().indexOf(q) !== -1) {
			return true;
		}
		return false;
	}

	getDisplayMessage() {
		return this._displayMessage;
	}
}

Peer.cTime = (new Date().getTime() / 1000);

module.exports = Peer;
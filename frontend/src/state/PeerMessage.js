
const MessageMedia = require('./MessageMedia.js');
const MessageDoc = require('./MessageDoc.js');
const MessageSticker = require('./MessageSticker.js');
const MessageWebpage = require('./MessageWebpage.js');
const MessagePoll = require('./MessagePoll.js');
const MessageAudio = require('./MessageAudio.js');

const Format = require('../utils/Format.js');

class PeerMessage {
	constructor(params = {}) {
		this._message = params.message || '';
		this._peer = params.peer || null;
		// this._peerUser = params.peerUser || null;
		this._peerManager = params.peerManager;

		this._apiObject = params.apiObject; // object returned from TG api
		this._id = this._apiObject.id;

		this._message = this._apiObject.message;
		this._date = this._apiObject.date;

		this._media = null;
		this._doc = null;
		this._sticker = null;
		this._webpage = null;
		this._poll = null;
		this._audio = null;

		this._album = null; // set of medias
		this._groupMessages = [];
		this._groupMessagesIds = {};

		this._isMainInGroup = true;
		this._mainMessageInGroup = null;

		this.checkForObjects();

		this._mediaPreviewLoaded = false;

		this._peerUser = null;
		this._authorPeer = this._peer;
		if (this._apiObject.from_id && this._peerManager._peerUsers[this._apiObject.from_id]) {
			this._authorPeer = this._peerManager._peerUsers[this._apiObject.from_id];
			this._peerUser = this._authorPeer;
		} else if (this._apiObject.pFlags && this._apiObject.pFlags.out) {
			this._authorPeer = this._peerManager._mePeerUser;
		}
	}

	heatServersUp() {
		let obj = this._doc || this._audio || this._media;
		(obj && obj.heatServersUp());
	}

	async doButton(n) {
		let buttons = this.getButtons();
		if (buttons[n]) {
			let bot_id = null;
			if (this._apiObject.via_bot_id) {
				bot_id = this._apiObject.via_bot_id;
			} else {
				bot_id = this._apiObject.from_id;
			}

			if (buttons[n].data) {
				await this._peerManager._user.invoke('messages.getBotCallbackAnswer', {flags: true, peer: this._peer.getInputPeerObject(), msg_id: this._id, data: buttons[n].data});
				return true;
			} else if (buttons[n].url) {
				let url = buttons[n].url.split('t.me/');
				let p = url[1].split('?');

				let username = p[0];
				let action = p[1].split('=')[0];
				let data = p[1].split('=')[1];

				if (this._peerManager._peerUsers[bot_id]) {
					const random_id = (''+Math.random()).split('0.').join('');
					let ip = {
						_: 'inputPeerUser',
						user_id: bot_id,
						access_hash: this._peerManager._peerUsers[bot_id]._apiObject.access_hash,
					};
					let iu = {
						_: 'inputUser',
						user_id: bot_id,
						access_hash: this._peerManager._peerUsers[bot_id]._apiObject.access_hash,
					};

					// alert(action);

					if (action != 'startgroup') {
						await this._peerManager._user.invoke('messages.startBot', {random_id: random_id, bot: iu,  peer: ip, start_param: data});
					} else {
						// start in group
						return {
							_: 'startgroup',
							iu: iu,
							start_param: data
						};
					}
				}

				// alert('u: '+username+' a:'+action+' d:'+data);
			} else if (buttons[n].query) {
				let iu = {
					_: 'inputUser',
					user_id: bot_id,
					access_hash: this._peerManager._peerUsers[bot_id]._apiObject.access_hash,
				};
				const resp = await this._peerManager._user.invoke('messages.getInlineBotResults', {bot: iu,  peer: this._peer.getInputPeerObject(), query: buttons[n].query});
				const botResults = resp.data;

				return botResults;
				// console.log(message);
				// alert(message);
			}
		}
		// alert(n);
	}

	getButtons() {
		let ret = [];
		try {
			for (let row of this._apiObject.reply_markup.rows) {
				if (row._ == 'keyboardButtonRow') {
					row.title = row.buttons[0].text;
					row.data = row.buttons[0].data;
					row.url = row.buttons[0].url;
					row.query = row.buttons[0].query;
					ret.push(row);
				}
			}
		} catch(e) {};
		return ret;
	}

	authorPeer() {
		if (!this._authorPeer && this._apiObject.pFlags && this._apiObject.pFlags.out) {
			this._authorPeer = this._peerManager._mePeerUser;
		}
	}

	isService() {
		return (this._apiObject._ == 'messageService');
	}

	async getAuthorDialog() {
		if (this._peerManager._peers['dialog_'+this._apiObject.from_id]) {
			return this._peerManager._peers['dialog_'+this._apiObject.from_id];
		}
		if (this._authorPeer && this._peerManager._peerUsers[this._apiObject.from_id]) {
			this._peerManager.peerByAPIResult({
				peer: {
					user_id: this._apiObject.from_id
				}
			});
		}
		return this._peerManager._peers['dialog_'+this._apiObject.from_id];
	}

	async getFWDPeer() {
		const fwd = this._apiObject.fwd_from;
		if (!fwd) {
			return null;
		}
		let id = null;
		if (fwd.channel_id) {
			id = 'channel_'+fwd.channel_id;
		} else if (fwd.from_id) {
			id = 'dialog_'+fwd.from_id;
		}

		if (this._peerManager._peers[id]) {
			// console.error(this._peerManager._peers[id])
			return this._peerManager._peers[id];
		}

		return null;
		//
		// const options = {
		// 	channel: {
		// 		_: 'inputChannelFromMessage',
		// 		msg_id: this._id,
		// 		channel_id: fwd.channel_id,
		// 		peer: this._peer.getInputPeerObject(),
		// 	}
		// };

		// console.error(params);
		// const resp = await this._user.invoke('channels.getFullChannel', options);
		// console.error(resp);
	}

	addMessageToGroup(peerMessage) {
		// console.error('addMessageToGroup');

		if (this._groupMessagesIds[peerMessage._id]) {
			return this._groupMessagesIds[peerMessage._id];
		}
		this._groupMessagesIds[peerMessage._id] = peerMessage;
		this._groupMessages.push(peerMessage);

		if (peerMessage._message) {
			peerMessage._isMainInGroup = true;
			this._isMainInGroup = false;
			this._mainMessageInGroup = peerMessage;
		} else {
			peerMessage._isMainInGroup = false;
		}

		return peerMessage;
	}

	isMainInGroup() {
		return this._isMainInGroup;
	}

	getGroupMessages() {
		const ret = [];
		for (let groupMessage of this._peer._messageGroups[this.getGroupId()]._groupMessages) {
			ret.push(groupMessage);
		}
		ret.push(this._peer._messageGroups[this.getGroupId()]);
		return ret;
	}

	getGroupMedias() {
		return this.getGroupMessages().map((m) => { return {media: m._media, message: m} });
	}

	getGroupId() {
		return this._apiObject.grouped_id || false;
	}

	updateApiObject(apiObject) {
		this._apiObject = apiObject;
		if (this._message != apiObject.message) {
			this._message = apiObject.message;
		}
		// @todo: if different
		this.checkForObjects();
	}

	serialize() {
		return this._apiObject;
	}

	copyToClipboard() {
		navigator.clipboard.writeText(this._apiObject.message);
	}

	hasAvatar() {
		this.authorPeer();
		return this._authorPeer.hasAvatar();
	}

	getAvatarCacheURL() {
		this.authorPeer();
		return this._authorPeer.getAvatarCacheURL();
	}

	getAvatarBlobURLSync() {
		this.authorPeer();
		return this._authorPeer.getAvatarBlobURLSync();
	}

	getAvatarInitials() {
		this.authorPeer();
		return this._authorPeer.getAvatarInitials();
	}

	getAvatarColor() {
		this.authorPeer();
		return this._authorPeer.getAvatarColor();
	}

	async getAvatarBlobURL() {
		this.authorPeer();
		return await this._authorPeer.getAvatarBlobURL();
	}

	// getCachedAvatarURL() {
	// 	return this._authorPeer.getAvatarBlobURLSync();
	// 	if (this._apiObject.from_id) {
	// 		if (this._peerManager._peerUsers[this._apiObject.from_id]) {
	// 			return this._peerManager._peerUsers[this._apiObject.from_id].getCachedAvatarURL();
	// 		}
	// 	}

	// 	return this._peer.getCachedAvatarURL();
	// }


	checkForObjects() {
		let lazyAdd = (type, apiObject, messageApiObject) => {
			let idsStorage = this._peer._mediaIds;
			let storage = this._peer._media;
			let constr = MessageMedia;

			if (type == 'doc') {
				constr = MessageDoc;
				idsStorage = this._peer._docsIds;
				storage = this._peer._docs;
			} else if (type == 'sticker') {
				constr = MessageSticker;
				idsStorage = this._peer._stickersIds;
				storage = this._peer._stickers;
			} else if (type == 'webpage') {
				constr = MessageWebpage;
				idsStorage = this._peer._webpagesIds;
				storage = this._peer._webpages;
			} else if (type == 'poll') {
				constr = MessagePoll;
				idsStorage = this._peer._pollsIds;
				storage = this._peer._polls;
			} else if (type == 'audio') {
				constr = MessageAudio;
				idsStorage = this._peer._audiosIds;
				storage = this._peer._audios;
			}

			if (!idsStorage[apiObject.id]) {
				const object = new constr({
					apiObject: apiObject,
					peerManager: this._peerManager,
					messageApiObject: messageApiObject,
					peer: this._peer,
					peerMessage: this,
				});
				storage.push(object);
				idsStorage[apiObject.id] = object;
			}

			this['_'+type] = idsStorage[apiObject.id];

			// if (type == 'media') {
			// 	this._media = idsStorage[apiObject.id];
			// } else if (type == 'doc') {
			// 	this._doc = idsStorage[apiObject.id];
			// } else if (type == 'webpage') {
			// 	this._webpage = idsStorage[apiObject.id];
			// } else if (type == 'sticker') {
			// 	this._sticker = idsStorage[apiObject.id];
			// } else if (type == 'poll') {
			// 	this._poll = idsStorage[apiObject.id];
			// } else if (type == 'audio') {
			// 	this._poll = idsStorage[apiObject.id];
			// }
		};

		if (this._apiObject.media) {
			if (this._apiObject.media.webpage) {
				lazyAdd('webpage', this._apiObject.media.webpage, this._apiObject);
			}
			if (this._apiObject.media.poll) {
				lazyAdd('poll', this._apiObject.media.poll, this._apiObject);
			}
			if (this._apiObject.media.photo) {
				lazyAdd('media', this._apiObject.media.photo, this._apiObject);
			}
			if (this._apiObject.media.document) {
				let doc = this._apiObject.media.document;
				let docType = null;
				if (doc.attributes) {
					for (let attr of doc.attributes) {
						if (attr._ == 'documentAttributeVideo') {
							docType = 'video';
						}
						if (attr._ == 'documentAttributeSticker') {
							docType = 'sticker';
						}
						if (attr._ == 'documentAttributeAudio') {
							docType = 'audio';
						}
					}
				}
				if (doc.mime_type == 'application/x-tgsticker') {
					docType = 'sticker';
				}

				if (docType == 'video') {
					lazyAdd('media', doc, this._apiObject);
				} else if (docType == 'sticker') {
					lazyAdd('sticker', doc, this._apiObject);
				} else if (docType == 'audio') {
					lazyAdd('audio', doc, this._apiObject);
				} else {
					lazyAdd('doc', doc, this._apiObject);
				}
			}
		}
	}

	seenByPeer() {
		if (this._peer._read_outbox_max_id && this._id > this._peer._read_outbox_max_id) {
			return false;
		}
		return true;
	}

	isFromMe() {
		this.authorPeer();
		if (this._authorPeer && this._authorPeer.isMe && this._authorPeer.isMe()) {
			return true;
		}

		if (this._apiObject.from_id) {
			if (this._peerManager._peerUsers[this._apiObject.from_id]) {
				return this._peerManager._peerUsers[this._apiObject.from_id].isMe();
			}
		}
		return false;
	}

	getReplyMessage() {
		if (!this._apiObject || !this._apiObject.reply_to_msg_id) {
			return null;
		}
		if (this._peer && this._peer._messageIds && this._peer._messageIds[this._apiObject.reply_to_msg_id]) {
			return this._peer._messageIds[this._apiObject.reply_to_msg_id];
		}
	}

	getForwardedInfo() {
		if (!this._apiObject || !this._apiObject.fwd_from) {
			return null;
		}
		if (this._apiObject.fwd_from.channel_id && this._peerManager._peers['channel_'+this._apiObject.fwd_from.channel_id]) {
			return {
				name: this._peerManager._peers['channel_'+this._apiObject.fwd_from.channel_id].getDisplayName(),
				peer: this._peerManager._peers['channel_'+this._apiObject.fwd_from.channel_id],
			};
		}
		if (this._apiObject.fwd_from.from_id && this._peerManager._peerUsers[this._apiObject.fwd_from.from_id]) {
			return {
				name: this._peerManager._peerUsers[this._apiObject.fwd_from.from_id].getFirstName(),
				peerUser: this._peerManager._peerUsers[this._apiObject.fwd_from.from_id],
			};
		}

	}



	// async getAvatar() {
	// 	if (this._apiObject.from_id) {
	// 		if (this._peerManager._peerUsers[this._apiObject.from_id]) {
	// 			return this._peerManager._peerUsers[this._apiObject.from_id].getAvatar();
	// 		}
	// 	}
	// 	return this._peer.getAvatar();
	// }

	// getAvatarInitials() {
	// 	if (this._apiObject.from_id) {
	// 		if (this._peerManager._peerUsers[this._apiObject.from_id]) {
	// 			return this._peerManager._peerUsers[this._apiObject.from_id].getAvatarInitials();
	// 		}
	// 	}

	// 	return this._peer.getAvatarInitials();
	// }

	// getAvatarColor() {
	// 	if (this._apiObject.from_id) {
	// 		return ((''+this._apiObject.from_id).substr(-1) % 8) + 1;
	// 	} else {
	// 		return this._peer.getAvatarColor();
	// 	}
	// }

	getAuthorId() {
		if (this._apiObject.from_id) {
			return this._apiObject.from_id;
		} else if (this._authorPeer && this._authorPeer._id) {
			return this._authorPeer._id;
		} else {
			return this._peer.id;
		}
	}

	getAuthorFirstName() {
		this.authorPeer();
		if (this._authorPeer && this._authorPeer.getFirstName) {
			return this._authorPeer.getFirstName();
		}
		// if (this._apiObject.from_id) {
		// 	if (this._peerManager._peerUsers[this._apiObject.from_id]) {
		// 		return this._peerManager._peerUsers[this._apiObject.from_id].getFirstName();
		// 	}
		// }

		return this._peer.getDisplayName();
	}

	getDisplayTime() {
		const date = new Date(this._apiObject.date*1000);
		return ('0'+date.getHours()).substr(-2)+':'+('0'+date.getMinutes()).substr(-2);
	}

	// hasWebpagePhoto() {
	// 	if (this._apiObject.media && this._apiObject.media.webpage && this._apiObject.media.webpage.photo) {
	// 		return true;
	// 	}
	// 	return false;
	// }

	// getWebpageInfo() {
	// 	if (this._apiObject.media && this._apiObject.media.webpage) {
	// 		const ret = {
	// 			url: '',
	// 			displayUrl: '', //display_url
	// 			siteName: '', //site_name
	// 			title: '', // title
	// 			description: '', //description
	// 			hasPhoto: false,
	// 			photoIsSquare: true,
	// 			photoWidth: 320,
	// 			photoHeight: 240
	// 		};

	// 		ret.url = this._apiObject.media.webpage.url;
	// 		ret.displayUrl = this._apiObject.media.webpage.display_url;
	// 		ret.siteName = this._apiObject.media.webpage.site_name || '';
	// 		ret.title = this._apiObject.media.webpage.title || '';
	// 		ret.description = this._apiObject.media.webpage.description || '';

	// 		ret.hasPhoto = this._apiObject.media.webpage.photo ? true : false;
	// 		if (ret.hasPhoto) {
	// 			/// check if it's not square
	// 			if (this._apiObject.media.webpage.photo.sizes) {
	// 				for (let size of this._apiObject.media.webpage.photo.sizes) {
	// 					if (size && size.w != size.h) {
	// 						ret.photoIsSquare = false;
	// 					}
	// 					if (size && size.type == 'm') {
	// 						ret.photoWidth = size.w;
	// 						ret.photoHeight = size.h;
	// 					}
	// 				}
	// 			}
	// 		}

	// 		return ret;
	// 	}

	// 	return null;
	// }

	// hasWebpage() {
	// 	if (this._apiObject.media && this._apiObject.media.webpage) {
	// 		return true;
	// 	}
	// 	return false;
	// }

	getDownloadableInfo() {
		const ret = {
			size: 0,
			sizeHuman: '',
			filename: '',
			ext: '',
			color: 1
		};
		if (this._apiObject.media && this._apiObject.media.document && this._apiObject.media.document.attributes) {
			for (let attr of this._apiObject.media.document.attributes) {
				if (attr._ == "documentAttributeFilename") {
					ret.filename = ''+attr.file_name;
					ret.ext = ret.filename.substr(ret.filename.lastIndexOf('.') + 1);
					ret.color = ((''+ret.ext+' ').charCodeAt(0) % 8 + 1);

					if (ret.color == 2) {  /// 2 - green, doesn't look good when fromMe, need to pessimize it
						ret.color = 5;
					}
				}
			}

			ret.size = this._apiObject.media.document.size;

			// nice one. https://stackoverflow.com/a/20732091/1119169  thanks Andrew!
		    const sizeI = Math.floor( Math.log(ret.size) / Math.log(1024) );
		    ret.sizeHuman = ( ret.size / Math.pow(1024, sizeI) ).toFixed(2) * 1 + ['B', 'kB', 'MB', 'GB', 'TB'][sizeI];
		}

		return ret;
	}

	getPreviewMediaCacheURL() {
		let url = null;
		if (this._apiObject.media) {
			if (this._apiObject.media.photo) {
				url = './tg/message_photo_'+this._apiObject.media.photo.id+'.jpg';
			} else if (this._apiObject.media.webpage && this._apiObject.media.webpage.photo) {
				url = './tg/message_webpage_'+this._apiObject.media.webpage.photo+'.jpg';
			}
		}

		return url;
	}


	isDownloadable() {
		if (this._apiObject.media && this._apiObject.media.document && !this.hasVideo() && !this.hasSticker()) {
			return true;
		}
		return false;
	}

	hasMedia() {
		if (this._apiObject.media) {
			if (this._apiObject.media.photo) {
				return true;
			}
			// if (this._apiObject.media.document && this._apiObject.media.document.thumbs) {
			// 	return true;
			// }
		}
		return false;
	}

	hasVideo() {
		if (this._apiObject.media && this._apiObject.media.document && this._apiObject.media.document.attributes) {
			for (let attr of this._apiObject.media.document.attributes) {
				if (attr._ == "documentAttributeVideo") {
					return true;
				}
			}
		}

		return false;
	}

	hasSticker() {
		if (this._apiObject.media && this._apiObject.media.document && this._apiObject.media.document.attributes) {
			for (let attr of this._apiObject.media.document.attributes) {
				if (attr._ == "documentAttributeSticker") {
					return true;
				}
			}
		}

		return false;
	}

	hasAnimatedSticker() {
		if (this.hasSticker() && this._apiObject.media.document.mime_type == 'application/x-tgsticker') {
			return true;
		}
		return false;
	}

	isMediaOnly() {
		if (!this._apiObject.message && this.hasMedia()) {
			return true;
		} else {
			return false;
		}
	}

	static formatMessageBodyForObject(apiObject) {
		let message = apiObject.message;
		if (!message) {
			return '';
		}
		message = ''+message;

		message = message.replace(/[<>]/g, (c)=>{ if (c == '<') return '«'; else return '»'; });

		/// apply styles
		if (apiObject.entities) {
			const tagsToAdd = [];

			for (let entity of apiObject.entities) {
				/// todo: more formats
				if (entity._ == 'messageEntityUrl') {
					let url = null;
					url = message.substr(entity.offset, entity.length);
					if (url && entity.length) {
						tagsToAdd.push([entity.offset, "<a href='"+url+"' target='_blank'>", entity.length,"</a>"]); /// do you think it's safe????????
						// message =
					}
				}
				if (entity._ == 'messageEntityTextUrl') {
					let url = entity.url;
					if (url && entity.length) {
						tagsToAdd.push([entity.offset, "<a href='"+url+"' target='_blank'>", entity.length,"</a>"]); /// do you think it's safe????????
						// message =
					}
				}


				// if (entity._ == 'messageEntityBold') {
				// 	if (entity.length) {
				// 		tagsToAdd.push([entity.offset, "<strong>", entity.length,"</strong>"]); /// do you think it's safe????????
				// 		// message =
				// 	}
				// }
			}

			if (tagsToAdd) {
				let composed = [];
				for (let tag of tagsToAdd) {
					composed.push()
					message = message.substr(0, tag[0]) + tag[1] + message.substr(tag[0], tag[2]) + tag[3] + message.substr(tag[0]+tag[2]);
					for (let nextTag of tagsToAdd) {
						nextTag[0]+=(tag[1].length + tag[3].length);
					}
				}
			}
		}

		message = (message).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br/>$2');
		message = message.replace(/[«»]/g, (c)=>{ if (c == '»') return '&gt;'; else return '&lt;'; });

		return message;
	}

	formatMessageBody() {
		return PeerMessage.formatMessageBodyForObject(this._apiObject);
	}

	/**
	 * for peer list
	 * @return {[type]} [description]
	 */
	getDisplayAuthor() {
		this.authorPeer();
		if (this._authorPeer && this._authorPeer.getFirstName && !this._authorPeer.isMe()) {
			return this._authorPeer.getFirstName();
		}
		return '';
	}

	/**
	 * for peer list
	 * @return {[type]} [description]
	 */
	getDisplayMessage(withAuthor, search) {
		if (!this._apiObject) {
			return '';
		}

		if (this._apiObject._ == 'messageService') {
			try {
				if (this._apiObject.action) {
					if (this._apiObject.action == 'date') {
						return Format.dateToHuman(this._date, true);
					}
					let at = this._apiObject.action._;
					if (at == 'messageActionChatAddUser' && this._apiObject.action.users) {
						let user = this._peerManager.peerUser(this._apiObject.action.users[0]);
						return (user ? user._apiObject.first_name : 'User')+' joined';
					} else if (at == 'messageActionChatJoinedByLink' && this._apiObject.from_id) {
						let user = this._peerManager.peerUser(this._apiObject.from_id);
						return user._apiObject.first_name+' joined';
					} else if (at == 'messageActionChatCreate' || at == 'messageActionChannelCreate') {
						return 'Chat Created';
					} else if (at == 'messageActionChatEditTitle') {
						return 'Title changed';
					} else if (at == 'messageActionChatEditPhoto' || at == 'messageActionChatDeletePhoto') {
						return 'Photo changed';
					} else if (at == 'messageActionPinMessage') {
						return 'Message Pinned';
					}
				}

			} catch(e) {

				console.error(e);
			}
			return '';
		}

		let message = this._apiObject.message;
		if (!message) {
			message = '';
			if (this._apiObject.media && this._apiObject.media.caption) {
				message = this._apiObject.media.caption;
			}
		}


		// if (!message) {
		// 	if (this._apiObject.media) {
		// 		message = '🖼️ '+(this._apiObject.media.caption ? this._apiObject.media.caption : '');
		// 	} else if (this._apiObject.action) {
		// 		if (this._apiObject.action._ == 'messageActionChatAddUser' && this._apiObject.action.users) {
		// 			let user = this._peerManager.peerUser(this._apiObject.action.users[0]);
		// 			if (user) {
		// 				message = user._apiObject.first_name+' joined';
		// 			}
		// 		} else if (this._apiObject.action._ == 'messageActionChatJoinedByLink' && this._apiObject.from_id) {
		// 			let user = this._peerManager.peerUser(this._apiObject.from_id);
		// 			if (user) {
		// 				message = user._apiObject.first_name+' joined by link';
		// 			}
		// 		}
		// 	}
		// }

		// thanks Roger Poon https://stackoverflow.com/a/18914855/1119169
		let sentences = message.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
		let guessWord = null;

		if (search) {
			let lsearch = search.toLowerCase();
			guessWord = Format.guessWord(message, lsearch);
			for (let sentence of sentences) {
				// if searched word is in sentence
				let pos = sentence.toLowerCase().indexOf(guessWord);
				if (pos != -1) {
					message = sentence;

					if (pos >= (45 - guessWord.length)) {
						/// need to trim message so the guessed word is visible
						let i = 0;
						do {
							message = message.substring(message.indexOf(' ')+1);
							pos = message.toLowerCase().indexOf(guessWord);
							// console.log(message);
						} while(pos >= (45 - guessWord.length) && (i++ < 100));
					}

					break;
				}
			}

			// let pos = message.toLowerCase().indexOf(search.toLowerCase());
			// if (pos != -1) {
			// 	message = message.substring(pos - 20, pos + 20);
			// }
			// return guessWord;
		} else {
			if (sentences.length) {
				message = sentences[0];
			}
		}


		if (message.length > 45) {
			message = message.substr(0, 45);
			message = message.substr(0, Math.min(message.length, message.lastIndexOf(" ")))+'...';
		}

		if (this._media) {
			let em = '';
			if (this._media.isVideo()) {
				em = message ? '📹' : 'Video';
			} else {
				em = message ? '🖼️' : 'Photo';
			}

			message = em + ' ' + message;
		} else if (this._sticker) {
			message = this._sticker.alt();
		} else if (this._poll) {
			message = 'Poll';
		}

		if (guessWord) {
			let pos = message.toLowerCase().indexOf(guessWord);
			message = message.substring(0,pos) + "<span class='search'>" + message.substring(pos,pos+guessWord.length) + "</span>" + message.substring(pos+guessWord.length);
		} else if (withAuthor) {
			let da = this.getDisplayAuthor();
			if (da) {
				message = '<span>' + da + '</span>' + (''+message).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
			}
		}


		return message;
	}

}

module.exports = PeerMessage;
const EventTarget = window.classes.EventTarget;
const Storage = window.classes.Storage;

class PeerUser extends EventTarget {
	constructor(params = {}) {
	    super();

		// this._app = params.app;
		// this._user = params.app._user;
		this._peerManager = params.peerManager;

		this._type = 'user';
		this._id = params.id;				// TG user id
		this._apiObject = params.apiObject; // object returned from TG api

		this._displayName = null;
		if (this._apiObject && this._apiObject.first_name) {
			this._displayName = this._apiObject.first_name+' '+(this._apiObject.last_name ? this._apiObject.last_name : '');
		}

		this._isOnline = false;
		// this._avatarDisplayed = false;

		this._hasAvatar = null;
		this._avatarBlobURL = null;

		this._lastTypingTime = null;
		this._lastTypingAction = null;

		this._peer = null; // filled in Peer constructor
	}

	getDisplayName() {
		return this._displayName;
	}

	processApiUpdate(updateObject) {
		let isUpdated = false;
		if (updateObject._ == 'updateUserStatus') {
			this._apiObject.status = updateObject.status;
			isUpdated = this.checkOnlineChanged();
		}
		if (updateObject._ == 'updateUserTyping') {
			this._lastTypingTime = (new Date().getTime() / 1000);
			this._lastTypingAction = updateObject.action;

			isUpdated = true;
		}
		if (updateObject._ == 'updateUserPhoto') {
			this._apiObject.photo = updateObject.photo;

			if (this._peer) {
				this._peerManager.emit('avatar', {peer: this._peer});
			} else {
				this._peerManager.emit('avatar', {user: this});
			}

			isUpdated = true;
		}
		if (updateObject._ == 'updateUserName') {
			this._apiObject.first_name = updateObject.first_name;
			this._apiObject.last_name = updateObject.last_name;

			isUpdated = true;
		}

		return isUpdated;
	}

	serialize() {
		return this._apiObject;
	}

	isTyping() {
		if (this._lastTypingTime && (this._lastTypingTime > (new Date().getTime() / 1000) - 20)) {
			return true;
		}
		return false;
	}

	isRemoved() {
		if (this._apiObject && this._apiObject.pFlags && this._apiObject.pFlags.deleted) {
			return true;
		}
		return false;
	}

	async flushAvatar() {
		this._hasAvatar = null;
		this._avatarBlobURL = null;

		await this._peerManager._media.flushPeerAvatar(this);
		await this.getAvatarBlobURL();
	}

	hasAvatar() {
		return this._hasAvatar;
	}

	getAvatarColor() {
		return ((''+this._id).substr(-1) % 8) + 1;
	}

	getAvatarCacheURL() {
		return './tg/avatar_peer_dialog_'+this._id+'.png';
	}

	getAvatarBlobURLSync() {
		return this._avatarBlobURL;
	}

	async getAvatarBlobURL() {
		if (this._avatarBlobURL) {
			return this._avatarBlobURL;
		}
		if (this._hasAvatar === false) {
			return null;
		}

		let avatarBlobURL = await this._peerManager._media.getPeerAvatarAndReturnBlobURL(this);
		// console.error('loading avatar for', this._id);
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
	// 	this._peerManager._media.getPeerAvatar(this); // not waiting async
	// 	return './tg/avatar_peer_dialog_'+this._id+'.png';
	// }

	// async getAvatar() {
	// 	this._avatarDisplayed = true;
	// 	return this._peerManager._media.getPeerAvatar(this);
	// }

	isMe() {
		if (this._apiObject && this._apiObject.pFlags && this._apiObject.pFlags.self) {
			return true;
		}
		return false;
	}

	lastSeenString() {
		if (this._isOnline) {
			return 'online';
		} else {
			let apiStatus = this._apiObject.status;
			if (!apiStatus) {
				return '';
			}
			if (apiStatus._ == 'userStatusOnline') {
				return 'last seen just now';
			} else if (apiStatus._ == 'userStatusOffline') {
				const dateNow = ((new Date().getTime())/1000);
				const diff = Math.abs(dateNow - apiStatus.was_online);

				if (diff < 60) {
					return 'last seen just now';
				} else if (diff < 60*60) {
					let d = Math.floor(diff / 60);
					return 'last seen '+d+' minute'+(d == 1 ? '':'s')+' ago';
				} else if (diff < 60*60*24) {
					let d = Math.floor(diff / (60*60));
					return 'last seen '+d+' hour'+(d == 1 ? '':'s')+' ago';
				} else if (diff < 2*60*60*24) {
					return 'last seen yesterday';
				} else {
					let d = Math.floor(diff / (60*60*24));
					return 'last seen '+d+' day'+(d == 1 ? '':'s')+' ago';
				}
				//
				// apiStatus.was_online - timestamp
			} else if (apiStatus._ == 'userStatusRecently') {
				return 'last seen recently';
			} else if (apiStatus._ == 'userStatusLastWeek') {
				return 'last seen last week';
			} else if (apiStatus._ == 'userStatusLastMonth') {
				return 'last seen last month';
			}
			// userStatusEmpty
			return '';
		}

	}

	checkOnlineChanged() {
		const wasOnline = this._isOnline;
		this._isOnline = this.isOnline();
		if (this._isOnline != wasOnline) {
			return true;
		} else {
			return false;
		}
	}

	isOnline() {
		if (this._apiObject && this._apiObject.status) {
			const dateNow = ((new Date().getTime())/1000);

			if (this._apiObject.status._ == 'userStatusOnline' && this._apiObject.status.expires > dateNow) {
				return true;
			} else {
				return false;
			}
		}
	}

	getFirstName() {
		if (this._apiObject.first_name) {
			return this._apiObject.first_name.trim();
		}

		return '';
	}

	getAvatarInitials() {
		return (this._apiObject.first_name ? this._apiObject.first_name.charAt(0) : '')+(this._apiObject.last_name ? this._apiObject.last_name.charAt(0) : '');
	}
}

module.exports = PeerUser;
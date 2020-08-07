

class MessageAlbum {
	constructor(params = {}) {
		this._peerManager = params.peerManager;
		this._apiObject = params.apiObject; // object returned from TG api

		this._messageApiObject = params.messageApiObject || {};
		this._peer = params.peer;

		this._medias = [];
	}

	getInfo(i) {
		this.prepareInfo();
		return this._preparedInfo[i];
	}

	prepareInfo() {
		if (this._infoPrepared) {
			return true;
		}

		this._preparedInfo = {
			width: 0,
			height: 0,
		};

		this._infoPrepared = true;
	}

}

module.exports = MessageAlbum;
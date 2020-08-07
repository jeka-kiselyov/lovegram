const Format = require('../utils/Format.js');
const Streamable = require('./Streamable.js');

class MessageAudio extends Streamable {
	constructor(params = {}) {
		super(params);

		// this._peerManager = params.peerManager;
		// this._apiObject = params.apiObject; // object returned from TG api

		// this._messageApiObject = params.messageApiObject || {};
		// this._peer = params.peer;

		// this._id = this._apiObject.id;
	}

	get isVoice() {
		return this.getInfo('isVoice');
	}

	// getStreamURL() {} // In Streamable

	getInfo(i) {
		this.prepareInfo();
		return this._preparedInfo[i];
	}

	normalizeWaveform() {
		const from = 3;
		const to = 24;

		const inter = to - from;

		const bytes = this._preparedInfo.waveform;
	    if (bytes && bytes.name != 'Uint8Array' && bytes[0] !== undefined) {
	    	// from JSON
	    	let a = [];
	    	let i = 0;
	    	while (bytes[i] || bytes[i] === 0) {
	    		a.push(bytes[i]);
	    		i++;
	    	}
	    	this._preparedInfo.waveform = new Uint8Array(a);
	    }

		// @todo: normalize array length?
		for (let i = 0; i < this._preparedInfo.waveform.length; i++) {
			this._preparedInfo.waveform[i] = Math.ceil((this._preparedInfo.waveform[i] / 255) * inter) + from;
		}
	}

	prepareInfo() {
		if (this._infoPrepared) {
			return true;
		}

		this._preparedInfo = {
			waveform: [],
			mime: '',
			filename: '',
			title: '',
			performer: '',
			duration: 0,
			durationHuman: '',
			isVoice: false,
		};

		// if (this._messageApiObject) {
		// 	if (this._messageApiObject.message) {
		// 		this._preparedInfo.caption = this._messageApiObject.message;
		// 	}
		// 	this._preparedInfo.sentByPeerUserAtDateHuman = Format.dateToHuman(this._messageApiObject.date);
		// 	this._preparedInfo.sentByPeerUser = this._peerManager.peerUser(this._messageApiObject.from_id);
		// 	if (this._preparedInfo.sentByPeerUser) {
		// 		this._preparedInfo.sentByPeerUserName = this._preparedInfo.sentByPeerUser.getFirstName();
		// 		// console.error(this._preparedInfo.sentByPeerUser);
		// 	}
		// }

		if (this._apiObject.mime_type) {
			this._preparedInfo.mime = this._apiObject.mime_type;
		}

		if (this._apiObject.attributes) {
			for (let attr of this._apiObject.attributes) {
				if (attr._ == 'documentAttributeAudio') {

					let duration = attr.duration || 0;
					this._preparedInfo.duration = duration;
					this._preparedInfo.durationHuman = '' + Math.floor(duration / 60) + ':' + ('0' + (duration % 60)).slice(-2);

					if (attr.waveform) {
						this._preparedInfo.waveform = attr.waveform;
						this.normalizeWaveform();
					}
					this._preparedInfo.title = attr.title;
					this._preparedInfo.performer = attr.performer;

					if (attr.pFlags && attr.pFlags.voice) {
						this._preparedInfo.isVoice = true;

						if (this._messageApiObject && this._peerManager._peerUsers[this._messageApiObject.from_id]) {
							this._preparedInfo.performer = this._peerManager._peerUsers[this._messageApiObject.from_id].getFirstName();
						}
					}
					// this._preparedInfo.width = attr.w || 0;
					// this._preparedInfo.height = attr.h || 0;
					// if (attr.h) {
					// 	this._preparedInfo.aspectRatio = attr.w / attr.h;
					// }

					// if (attr.pFlags && attr.pFlags.supports_streaming) {
					// 	this._preparedInfo.supportsStreaming = true;
					// }
				}
				if (attr._ == "documentAttributeFilename") {
					this._preparedInfo.filename = ''+attr.file_name;
				}
			}
		}

		if (!this._preparedInfo.title) {
			this._preparedInfo.title = this._preparedInfo.filename;
		}
		if (!this._preparedInfo.performer) {
			this._preparedInfo.performer = '';
		}

		// if (this._apiObject.sizes) {
		// 	for (let size of this._apiObject.sizes) {
		// 		if (size.w > this._preparedInfo.width) {
		// 			this._preparedInfo.width = size.w;
		// 			this._preparedInfo.height = size.h;
		// 		}

		// 		if (this._preparedInfo.height && this._preparedInfo.aspectRatio == 1) {
		// 			this._preparedInfo.aspectRatio = this._preparedInfo.width / this._preparedInfo.height;
		// 		}
		// 	}
		// }

		this._infoPrepared = true;
	}

	get id() {
		return this._id;
	}

}

module.exports = MessageAudio;

class MessageSticker {
	constructor(params = {}) {
		this._peerManager = params.peerManager;
		this._apiObject = params.apiObject; // object returned from TG api
		this._previewBase64 = null;

		this._id = this._apiObject.id;
		this.blobURL = null;
		this.json = null;

		this._isAnimated = false;
		if (this._apiObject.mime_type == 'application/x-tgsticker') {
			this._isAnimated = true;
		}
	}

	alt() {
		if (this._apiObject.attributes) {
			for (let attr of this._apiObject.attributes) {
				if (attr.alt) {
					return attr.alt;
				}
			}
		}
		return '';
	}

	isAnimated() {
		return this._isAnimated;
	}

	get tgs() {
		return this.isAnimated();
	}

	get id() {
		return this._id;
	}

	get url() {
		return this.getPreviewMediaCacheURL();
	}

	async load() {
		if (!this._isAnimated) {
			if (this.blobURL) {
				return this.blobURL;
			}
//new Promise(function(res) { setTimeout(res, 5000); } );
			let blobURL = await this._peerManager._media.loadStickerAndReturn(this._apiObject);
			if (!blobURL) {
				// alert(1);
			}
			if (blobURL) {
				this.blobURL = blobURL;
				this.cached = true;
			}

			return this.blobURL;
		} else {
			if (this.json) {
				console.error('was cached');
				return this.json;
			}
			console.error('was not cached');

			let json = await this._peerManager._media.loadStickerAndReturn(this._apiObject);
			if (json) {
				this.json = json;
				this.cached = true;
			}

			return json;
		}
	}

	getPreviewMediaCacheURL() {
		if (this._isAnimated) {
			return './tg/sticker_'+this._apiObject.id+'.json';
		} else {
			return './tg/sticker_'+this._apiObject.id+'.png';
		}
	}

}

module.exports = MessageSticker;
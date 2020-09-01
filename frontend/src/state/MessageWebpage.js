

class MessageWebpage {
	constructor(params = {}) {
		this._peerManager = params.peerManager;
		this._apiObject = params.apiObject; // object returned from TG api
		this._previewBase64 = null;
		this._peerMessage = params.peerMessage;

		this._id = this._apiObject.id;
		this.blobURL = null;
	}

	get url() {
		return this.getPreviewMediaCacheURL();
	}

	getPreviewMediaCacheURL() {
		if (!this.getInfo('hasPhoto')) {
			return null;
		} else {
			return './tg/message_photo_'+this._apiObject.photo.id+'_x.jpg';
		}
	}

	async loadPhoto() {
		if (!this.getInfo('hasPhoto')) {
			return null;
		}

		if (this.blobURL) {
			return this.blobURL;
		}

		let blobURL = await this._peerManager._media.loadPreviewAndReturnBlobURL(this._apiObject.photo, 'x', this._peerMessage);
		if (blobURL) {
			this.blobURL = blobURL;
			this.cached = true;
		}

		return this.blobURL;
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
			url: '',
			displayUrl: '', //display_url
			siteName: '', //site_name
			title: '', // title
			description: '', //description
			hasPhoto: false,
			photoIsSquare: true,
			previewBase64: null,
			photoWidth: 320,
			photoHeight: 240
		};

		this._preparedInfo.url = this._apiObject.url;
		this._preparedInfo.displayUrl = this._apiObject.display_url;
		this._preparedInfo.siteName = this._apiObject.site_name || '';
		this._preparedInfo.title = this._apiObject.title || '';
		this._preparedInfo.description = this._apiObject.description || '';


		this._preparedInfo.hasPhoto = this._apiObject.photo ? true : false;
		if (this._preparedInfo.hasPhoto) {
			/// check if it's not square
			if (this._apiObject.photo.sizes) {
				for (let size of this._apiObject.photo.sizes) {
					if ((size && size.w != size.h) || size.w > 200) {
						this._preparedInfo.photoIsSquare = false;
					}
					if (size && size.type == 'm') {
						this._preparedInfo.photoWidth = size.w;
						this._preparedInfo.photoHeight = size.h;
					}
				}
			}

			let previewBase64 = this.getPreviewBase64();
			if (previewBase64) {
				this._preparedInfo.previewBase64 = previewBase64;
			}
		}

		this._infoPrepared = true;
	}

	getPreviewBase64() {
		if (this._previewBase64 !== null) {
			return this._previewBase64;
		}

		let bytes = null;
		if (this._apiObject.sizes && this._apiObject.sizes[0] && this._apiObject.sizes[0].bytes) {  // photo
			bytes = this._apiObject.sizes[0].bytes;
		} else if (this._apiObject.thumbs && this._apiObject.thumbs[0] && this._apiObject.thumbs[0].bytes) { // video
			bytes = this._apiObject.thumbs[0].bytes;
		} else if (this._apiObject.photo && this._apiObject.photo.sizes[0] && this._apiObject.photo.sizes[0].bytes) { // webpage
			bytes = this._apiObject.photo.sizes[0].bytes;
		}

		if (bytes === null || bytes === undefined) {
			return false;
		}
		// console.log(this._apiObject.media)

		bytes = this._peerManager._media.decodeStrippedPhoto(bytes);
		let binary = '';
		for (var i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}

		this._previewBase64 = 'data:image/jpeg;base64,'+btoa(binary);

		return this._previewBase64;
	}

}

module.exports = MessageWebpage;
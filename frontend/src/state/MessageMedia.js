const Format = require('../utils/Format.js');
const Streamable = require('./Streamable.js');

class MessageMedia extends Streamable {
	constructor(params = {}) {
		super(params);

		// this._peerManager = params.peerManager;
		// this._apiObject = params.apiObject; // object returned from TG api

		// this._messageApiObject = params.messageApiObject || {};
		// this._peer = params.peer;

		this._previewBase64 = null;

		// this._id = this._apiObject.id;
		this.blobURL = null;



		// this._isDownloading = false;
		// this._downloadingPercentage = 0;
		// this._downloadingSize = 0;
		// this._downloadingPartN = 0;

		// this._skippedPartN = null;

		// this._totalParts = 1;
		// this._partBlobs = [];
		// this._downloadedParts = {};
		// this._isDownloaded = false;

		// // this._blobStream = null;
		// //
		// this._parallelC = this._peerManager._app._config.get('maxParallelConnections');

	}

	async getPlayableBlobURL() {
		if (this._playableBlobURL) {
			return this._playableBlobURL;
		}

		this._playableBlobURL = await this.save(true);

		return this._playableBlobURL;
	}

	// async save(returnBlobURL) {
	// 	if (this.isPhoto()) {
	// 		let blobUrl = await this.loadFull();
	// 		if (!blobUrl) {
	// 			return false;
	// 		}

	// 		let link = document.createElement("a"); // Or maybe get it from the current document
	// 		link.href = blobUrl;
	// 		link.download = 'image.jpg';
	// 		link.innerHTML = "Click here to download the file";
	// 		link.click();
	// 	} else {


	// 		/// video
	// 		await this.scheduleDownload();
	// 		while (!this._isDownloaded) {
	// 			await this.downloadNextPart();
	// 		};

	// 		// let link = document.createElement("a"); // Or maybe get it from the current document
	// 		// link.href = this.getStreamURL();
	// 		// link.download = 'video.mp4';
	// 		// link.innerHTML = "Click here to download the file";
	// 		// link.click();

	// 		// return;

	// 		let that = this;
	// 		const stream = new ReadableStream({
	// 			start(controller) {
	// 				function pushStream(stream) {
	// 					const reader = stream.getReader();
	// 					return reader.read().then(function process(result) {
	// 							if (result.done) return;
	// 							controller.enqueue(result.value);
	// 							return reader.read().then(process);
	// 						});
	// 				}

	// 				let composeStream = async () => {

	// 					that._partBlobs.sort((a,b) => (a.n > b.n) ? 1 : ((b.n > a.n) ? -1 : 0));

	// 					console.error(that._partBlobs);

	// 					for (let part of that._partBlobs) {
	// 						let stream = part.blob.stream();
	// 						await pushStream(stream);
	// 					}

	// 					controller.close();
	// 				};

	// 				composeStream();
	// 		    }
	// 		});

	// 		let mime = this.getInfo('mime');
	// 		let filename = this.getInfo('filename');

	// 		if (!mime) {
	// 			mime = 'video/mp4';
	// 		}
	// 		if (!filename) {
	// 			filename = 'video.mp4';
	// 		}

	// 		const response = new Response(stream, {'Content-Type': mime, 'Content-Disposition': 'attachment'});
	// 		let blob = await response.blob();

	// 		let blobUrl = URL.createObjectURL(blob);

	// 		if (returnBlobURL) {
	// 			return blobUrl;
	// 		} else {
	// 			let link = document.createElement("a"); // Or maybe get it from the current document
	// 			link.href = blobUrl;
	// 			link.download = filename;
	// 			link.innerHTML = "Click here to download the file";
	// 			link.click();
	// 		}

	// 	}
	// }

	isPhoto() {
		if (this._apiObject['_'] && this._apiObject['_'] == 'photo') {
			return true;
		}
		return false;
	}

	isVideo() {
		return !this.isPhoto();
	}

	isGIF() {
		return (this.isVideo() && this.getInfo('isGIF'));
	}

	isRoundVideo() {
		return (this.isVideo() && this.getInfo('isRound'));
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
			aspectRatio: 1,
			videoDuration: 0,
			videoDurationHuman: '0:00',
			isRound: false,
			isGIF: false,
			supportsStreaming: false,
			mime: '',
			filename: '',
			sentByPeerUser: null,
			sentByPeerUserName: '',
			sentByPeerUserAtDateHuman: '',
			caption: '',
			sizeHuman: '',
		};

		if (this._messageApiObject) {
			if (this._messageApiObject.message) {
				this._preparedInfo.caption = this._messageApiObject.message;
			}
			this._preparedInfo.sentByPeerUserAtDateHuman = Format.dateToHuman(this._messageApiObject.date);
			this._preparedInfo.sentByPeerUser = this._peerManager.peerUser(this._messageApiObject.from_id);
			if (this._preparedInfo.sentByPeerUser) {
				this._preparedInfo.sentByPeerUserName = this._preparedInfo.sentByPeerUser.getFirstName();
				// console.error(this._preparedInfo.sentByPeerUser);
			}
		}

		if (this._apiObject.mime_type) {
			this._preparedInfo.mime = this._apiObject.mime_type;
		}

		if (this._apiObject.attributes) {
			for (let attr of this._apiObject.attributes) {
				if (attr._ == 'documentAttributeAnimated') {
					this._preparedInfo.isGIF = true;
				}
				if (attr._ == 'documentAttributeVideo') {
					if (attr.pFlags && attr.pFlags.round_message) {
						this._preparedInfo.isRound = true;
					}

					let duration = attr.duration || 0;
					this._preparedInfo.videoDuration = duration;
					this._preparedInfo.videoDurationHuman = '' + Math.floor(duration / 60) + ':' + ('0' + (duration % 60)).slice(-2);
					this._preparedInfo.width = attr.w || 0;
					this._preparedInfo.height = attr.h || 0;
					if (attr.h) {
						this._preparedInfo.aspectRatio = attr.w / attr.h;
					}

					if (attr.pFlags && attr.pFlags.supports_streaming) {
						this._preparedInfo.supportsStreaming = true;
					}
				}
				if (attr._ == "documentAttributeFilename") {
					this._preparedInfo.filename = ''+attr.file_name;
				}
			}
		}

		if (this._apiObject.size) {
			this._preparedInfo.sizeHuman = this.sizeToHuman(this._apiObject.size);
		}

		if (this._apiObject.sizes) {
			for (let size of this._apiObject.sizes) {
				if (size.w > this._preparedInfo.width) {
					this._preparedInfo.width = size.w;
					this._preparedInfo.height = size.h;
				}

				if (this._preparedInfo.height && this._preparedInfo.aspectRatio == 1) {
					this._preparedInfo.aspectRatio = this._preparedInfo.width / this._preparedInfo.height;
				}
			}
		}

		this._infoPrepared = true;
	}

	getVideoLengthString() {
		return this.getInfo('videoDurationHuman');
	}

	get id() {
		return this._id;
	}

	get url() {
		return this.getPreviewMediaCacheURL();
	}

	static async loadPreviewsFromCache(messageMedias) {
		// console.error('checking media cache', messageMedias);
		await app._user._protocol.getCachedResources(messageMedias);
	}

	async loadPreview(dcShift) {
		// console.error('loadPreview', this._messageApiObject.id);

		if (this.blobURL) {
			return this.blobURL;
		}

		let blobURL = await this._peerManager._media.loadPreviewAndReturnBlobURL(this._apiObject, 'm', this._peerMessage, dcShift);
		if (blobURL) {
			this.blobURL = blobURL;
			this.cached = true;
		}

		// console.error('loaded', this._messageApiObject.id, blobURL);

		return this.blobURL;
	}

	async loadFull() {
		if (this._promiseLoadFull) {
			await this._promiseLoadFull;
		} else {
			this._promiseLoadFull = new Promise((res)=>{
				this._promiseLoadFullResolver = res;
			});
		}

		if (this._originalBlobURL || this._originalBlobURLLoaded) {
			return this._originalBlobURL;
		}

		let originalBlobURL = await this._peerManager._media.loadPreviewAndReturnBlobURL(this._apiObject, 'o', this._peerMessage);
		if (originalBlobURL) {
			this._originalBlobURL = originalBlobURL;
		} else {
			this._originalBlobURL = await this.loadPreview();
		}

		this._originalBlobURLLoaded = true;
		this._promiseLoadFullResolver();

		return this._originalBlobURL;
	}

	getStreamURL() {
		return './tg/svideo/doc_'+this.id+'_stream_'+this._apiObject.size+'.mp4';
	}

	getPreviewMediaCacheURL(isAlreadyCached) {
		// if (isAlreadyCached === undefined) {
		// 	// find if it's cached or not
		// }

		return './tg/message_photo_'+this._apiObject.id+'_m.jpg';
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

module.exports = MessageMedia;
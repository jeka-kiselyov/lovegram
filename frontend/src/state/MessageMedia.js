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
		await app._user._protocol.getCachedResources(messageMedias);
	}

	async loadPreview() {
		// console.error('loadPreview', this._messageApiObject.id);

		if (this.blobURL) {
			return this.blobURL;
		}

		let blobURL = await this._peerManager._media.loadPreviewAndReturnBlobURL(this._apiObject);
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

		let originalBlobURL = await this._peerManager._media.loadPreviewAndReturnBlobURL(this._apiObject, 'o');
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

	// async getDownloadedBlob() {
	// 	if (this._blobStream === null) {
	// 		let that = this;
	// 		this._blobStream = new ReadableStream({
	// 			start(controller) {
	// 				function pushStream(stream) {
	// 					const reader = stream.getReader();
	// 					return reader.read().then(function process(result) {
	// 							if (result.done) return;
	// 							controller.enqueue(result.value);
	// 							console.log('added');
	// 							return reader.read().then(process);
	// 						});
	// 				}
	// 				that.pushToStream = pushStream;
	// 				that.finishStream = ()=>{
	// 					controller.close();
	// 				};
	// 		    }
	// 		});

	// 		this._addedBlobsToStream = 0;
	// 		for (let blob of this._partBlobs) {
	// 			let stream = blob.stream();
	// 			await this.pushToStream(stream);
	// 			this._addedBlobsToStream++;
	// 		}

	// 		let headers = {'Content-Type': this._apiObject.mime_type, 'Content-Length': this._apiObject.size};
	// 		const response = new Response(this._blobStream, headers);
	// 		console.log(1);
	// 		this.finishStream();
	// 		let blob = await response.blob();
	// 		console.log(2);
	// 		let blobUrl = URL.createObjectURL(blob);

	// 		this._streamBlobURL = blobUrl;
	// 	} else {
	// 		let i = 0;
	// 		for (let blob of this._partBlobs) {
	// 			if (i > this._addedBlobsToStream) {
	// 				let stream = blob.stream();
	// 				this.pushToStream(stream);
	// 			}
	// 			i++;
	// 		}
	// 	}

	// 	return this._streamBlobURL;
	// }

	// scheduleDownload() {
	// 	if (this._isDownloading || this._isDownloaded) {
	// 		return true;
	// 	}

	// 	this._isDownloading = true;
	// 	this._downloadingPercentage = 0;
	// 	this._downloadingPartN = 0;
	// 	this._totalParts = Math.ceil( this._apiObject.size / (512*1024) );
	// 	this._partBlobs = [];
	// 	this._downloadedParts = {};

	// 	// setTimeout(()=>{
	// 	// 	this._downloadingPercentage = 50;
	// 	// 	this.downloadNextPart();
	// 	// }, 5000);
	// }

	// async downloadPart(n) {
	// 	if (this._downloadedParts[n]) {
	// 		return true;
	// 	}
	// 	this._downloadedParts[n] = true;

	// 	console.error('Media | Downloading part: ', n);

	// 	let blob = await this._peerManager._media.loadFilePartAndReturnBlob(this._apiObject, n);

	// 	console.error('Media | Downloaded part: ', n);

	// 	await this._peerManager._user._protocol.fulfillSWStream(this.id, n);

	// 	this._partBlobs.push({n: n, blob: blob});

	// 	return true;
	// }

	// async downloadNextPart() {
	// 	if (this._isDownloaded) {
	// 		return true;
	// 	}

	// 	let downloadingPartN = this._downloadingPartN;
	// 	let wasForced = false;

	// 	// determine if sw asked for specific part
	// 	if (this._peerManager._user._protocol._mostRecentSWMessage && this._peerManager._user._protocol._mostRecentSWMessage.command == 'waitfor') {
	// 		downloadingPartN = this._peerManager._user._protocol._mostRecentSWMessage.partN;
	// 		this._downloadingPartN = downloadingPartN;
	// 		this._isDownloaded = false;
	// 		this._peerManager._user._protocol._mostRecentSWMessage = null;

	// 		wasForced = true;
	// 		// this._downloadingPartN = downloadingPartN;
	// 		// await this.downloadPart(forcedN);
	// 	}

	// 	// let alreadyWas = false;
	// 	// for (let partBlob of this._partBlobs) {
	// 	// 	if (partBlob.n == downloadingPartN) {
	// 	// 		alreadyWas = true;
	// 	// 	}
	// 	// }

	// 	if (this._isDownloaded) {
	// 		return true;
	// 	}


	// 	if (wasForced) {
	// 		// download few chunks in parallel
	// 		let promises = [];
	// 		let max = this._parallelC;
	// 		let i = 0;
	// 		do {
	// 			promises.push(this.downloadPart(downloadingPartN));
	// 			downloadingPartN++;
	// 			if (downloadingPartN >= this._totalParts) {
	// 				break;
	// 			}
	// 			i++;
	// 		} while (i < max);

	// 		await Promise.all(promises);
	// 		this._downloadingPartN = downloadingPartN;
	// 	} else {
	// 		await this.downloadPart(downloadingPartN);
	// 		this._downloadingPartN++;
	// 	}

	// 	if (this._downloadingPartN >= this._totalParts) {
	// 		let thereIsMissed = false;
	// 		for (let i = 0; i < this._totalParts; i++) {
	// 			if (!this._downloadedParts[i] && !thereIsMissed) {
	// 				thereIsMissed = true;
	// 				this._downloadingPartN = i;
	// 				break;
	// 			}
	// 		}

	// 		if (!thereIsMissed) {
	// 			this._isDownloaded = true;
	// 		}
	// 	}

	// 	// if (!alreadyWas) {
	// 	// 	let blob = await this._peerManager._media.loadFilePartAndReturnBlob(this._apiObject, downloadingPartN);
	// 	// 	await this._peerManager._user._protocol.fulfillSWStream(this.id, downloadingPartN);

	// 	// 	// console.error(blob);
	// 	// 	// console.error(this._downloadingPartN, this._downloadingPercentage, this._totalParts);

	// 	// 	this._partBlobs.push({n: downloadingPartN, blob: blob});
	// 	// 	this._downloadedParts[downloadingPartN] = true;

	// 	// 	this._downloadingPartN++;
	// 	// 	this._downloadingPercentage = Math.ceil( (this._downloadingPartN / this._totalParts) * 100 );
	// 	// 	this._downloadingSize = (512*1024) * this._downloadingPartN;

	// 	// 	if (this._downloadingPartN >= this._totalParts) {
	// 	// 		let thereIsMissed = false;
	// 	// 		for (let i = 0; i < this._totalParts; i++) {
	// 	// 			if (!this._downloadedParts[i] && !thereIsMissed) {
	// 	// 				thereIsMissed = true;
	// 	// 				this._downloadingPartN = i;
	// 	// 			}
	// 	// 		}

	// 	// 		if (!thereIsMissed) {
	// 	// 			this._isDownloaded = true;
	// 	// 		}

	// 	// 		// if (this._skippedPartN !== null) {
	// 	// 		// 	this._downloadingPartN = this._skippedPartN;
	// 	// 		// 	this._skippedPartN = null;
	// 	// 		// } else {
	// 	// 		// 	this._isDownloaded = true;
	// 	// 		// }
	// 	// 	} else {
	// 	// 		// setTimeout(()=>{
	// 	// 		// 	this.downloadNextPart();
	// 	// 		// }, 100);
	// 	// 	}
	// 	// }
	// }

	getPreviewMediaCacheURL(isAlreadyCached) {
		// if (isAlreadyCached === undefined) {
		// 	// find if it's cached or not
		// }

		return './tg/message_photo_'+this._apiObject.id+'.jpg';
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
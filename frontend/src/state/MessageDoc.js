const Format = require('../utils/Format.js');
const Streamable = require('./Streamable.js');

class MessageDoc extends Streamable {
	constructor(params = {}) {
		super(params);

		// this._peerManager = params.peerManager;
		// this._apiObject = params.apiObject; // object returned from TG api
		// this._id = this._apiObject.id;
		this._preparedInfo = {};
		this._infoPrepared = false;

		// this._isDownloading = false;
		// this._downloadingPercentage = 0;
		// this._downloadingSize = 0;
		// this._downloadingSizeHuman = '0 kB';
		// this._downloadingPartN = 0;
		// this._totalParts = 1;
		// this._partBlobs = [];
		// this._isDownloaded = false;
	}

	// async save() {
	// 	let that = this;
	// 	// const stream = new ReadableStream({
	// 	// 	start(controller) {
	// 	// 		function pushStream(stream) {
	// 	// 			const reader = stream.getReader();
	// 	// 			return reader.read().then(function process(result) {
	// 	// 					if (result.done) return;
	// 	// 					controller.enqueue(result.value);
	// 	// 					return reader.read().then(process);
	// 	// 				});
	// 	// 		}

	// 	// 		let composeStream = async () => {
	// 	// 			for (let blob of that._partBlobs) {
	// 	// 				let stream = blob.stream();
	// 	// 				await pushStream(stream);
	// 	// 				await new Promise((res)=>setTimeout(res,1));
	// 	// 			}

	// 	// 			controller.close();
	// 	// 		};

	// 	// 		composeStream();
	// 	//     }
	// 	// });

	// 			// for (let blob of that._partBlobs) {


	// 	let content = new Blob(this._partBlobs);
	// 	const response = new Response(content, {'Content-Type': this.getInfo('mime'), 'Content-Disposition': 'attachment'});
	// 	let blob = await response.blob();

	// 	let blobUrl = URL.createObjectURL(blob);

	// 	let link = document.createElement("a"); // Or maybe get it from the current document
	// 	link.href = blobUrl;
	// 	link.download = this.getInfo('filename');
	// 	link.innerHTML = "Click here to download the file";
	// 	link.click();
	// }

	cancelDownload() {
		if (this._isDownloaded) {
			return true;
		}

		this._isDownloading = false;
		// @todo: free memory?
	}

	// scheduleDownload() {
	// 	if (this._isDownloading) {
	// 		return true;
	// 	}

	// 	this._isDownloading = true;
	// 	this._downloadingPercentage = 0;
	// 	this._downloadingPartN = 0;
	// 	this._totalParts = Math.ceil( this.getInfo('size') / (512*1024) );
	// 	this._partBlobs = [];

	// 	// setTimeout(()=>{
	// 	// 	this._downloadingPercentage = 50;
	// 	// 	this.downloadNextPart();
	// 	// }, 5000);
	// }

	// async downloadNextPart() {
	// 	if (this._isDownloaded) {
	// 		return true;
	// 	}

	// 	let blob = await this._peerManager._media.loadFilePartAndReturnBlob(this._apiObject, this._downloadingPartN);
	// 	// console.error(blob);
	// 	// console.error(this._downloadingPartN, this._downloadingPercentage, this._totalParts);
	// 	this._partBlobs.push(blob);


	// 	this._downloadingPartN++;
	// 	this._downloadingPercentage = Math.ceil( (this._downloadingPartN / this._totalParts) * 100 );
	// 	this._downloadingSize = (512*1024) * this._downloadingPartN;
	// 	this._downloadingSizeHuman = this.sizeToHuman(this._downloadingSize);

	// 	if (this._downloadingPartN >= this._totalParts) {
	// 		this._isDownloaded = true;
	// 	} else {
	// 		// setTimeout(()=>{
	// 		// 	this.downloadNextPart();
	// 		// }, 100);
	// 	}
	// }

	getInfo(i) {
		this.prepareInfo();
		return this._preparedInfo[i];
	}

	// sizeToHuman(size) {
	// 	// nice one. https://stackoverflow.com/a/20732091/1119169  thanks Andrew!
	//     const sizeI = Math.floor( Math.log(size) / Math.log(1024) );
	//     return ( size / Math.pow(1024, sizeI) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][sizeI];
	// }

	prepareInfo() {
		if (this._infoPrepared) {
			return true;
		}

		this._preparedInfo = {
			size: 0,
			sizeHuman: '',
			mime: '',
			filename: '',
			ext: '',
			color: 1,
			dateHuman: '',
		};

		if (this._apiObject.attributes) {
			for (let attr of this._apiObject.attributes) {
				if (attr._ == "documentAttributeFilename") {
					this._preparedInfo.filename = ''+attr.file_name;
					this._preparedInfo.ext = this._preparedInfo.filename.substr(this._preparedInfo.filename.lastIndexOf('.') + 1);
					this._preparedInfo.color = ((''+this._preparedInfo.ext+' ').charCodeAt(0) % 8 + 1);
					if (this._preparedInfo.color == 2) {  /// 2 - green, doesn't look good when fromMe, need to pessimize it
						this._preparedInfo.color = 5;
					}
				}
			}
		}

		this._preparedInfo.size = this._apiObject.size;
		this._preparedInfo.sizeHuman = this.sizeToHuman(this._preparedInfo.size);

	    this._preparedInfo.dateHuman = Format.dateToHuman(this._apiObject.date);

	    this._preparedInfo.mime = this._apiObject.mime_type;

		this._infoPrepared = true;
	}

	get id() {
		return this._id;
	}

}


module.exports = MessageDoc;
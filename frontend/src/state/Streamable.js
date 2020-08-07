

class Streamable {
	constructor(params = {}) {
		this._apiObject = params.apiObject; // object returned from TG api
		this._id = this._apiObject.id;
		this._peerManager = params.peerManager;
		this._peer = params.peer;

		this._messageApiObject = params.messageApiObject || {};

		this._isDownloading = false;
		this._downloadingPercentage = 0;
		this._downloadingSize = 0;
		this._downloadingSizeHuman = '';
		this._downloadingPartN = 0;

		// this._totalParts = 1;
		this._partBlobs = [];
		this._downloadedParts = {};
		this._isDownloaded = false;

		this._skippedPartN = null;
		this._parallelC = this._peerManager._app._config.get('maxParallelConnections');

		this._totalParts = Math.ceil( this._apiObject.size / (512*1024) );
	}

	/**
	 * Check for parts in cache
	 * @return {[type]} [description]
	 */
	async checkCache() {
		if (this._isDownloaded) {
			return true;
		}

		let items = [];
		for (let i = 0; i < this._totalParts; i++) {
			items.push({url: './tg/doc_'+this._id+'_part_'+i+'.dat', i: i});
		}
		await this._peerManager._user._protocol.getCachedResources(items);
		for (let item of items) {
			if (item.blob) {
				this._downloadedParts[item.i] = true;
				this._partBlobs.push({n: item.i, blob: item.blob});
				this._peerManager._user._protocol.fulfillSWStream(this.id, item.i);

				if (item.i == this._totalParts - 1) {
					this._isDownloaded = true;
				}
			}
		}
	}

	async save(returnURL) {
		let blobUrl = null;
		let revoke = true;
		if (this.isPhoto && this.isPhoto()) {
			blobUrl = await this.loadFull();
			revoke = false;
		} else {
			if (!this._isDownloaded) {
				await this.checkCache();
				do {
					await this.downloadNextPart();
				} while(!this._isDownloaded);
			}

			let ba = [];
			this._partBlobs.sort((a, b) => (a.n > b.n) ? 1 : -1);
			for (let b of this._partBlobs) {
				ba.push(b.blob);
			}
			let content = new Blob(ba);
			const response = new Response(content, {'Content-Type': this.getInfo('mime'), 'Content-Disposition': 'attachment'});
			let blob = await response.blob();

			blobUrl = URL.createObjectURL(blob);
		}

		if (blobUrl) {
			if (returnURL) {
				return blobUrl;
			} else {
				let link = document.createElement("a"); // Or maybe get it from the current document
				link.href = blobUrl;
				link.download = this.getInfo('filename');
			    document.body.appendChild(link);
				link.innerHTML = "download";
				link.click();

				if (revoke) {
				    window.URL.revokeObjectURL(blobUrl);
				}
			}
		}
	}

	getStreamURL() {
		let ext = 'mp4';
		if (this._apiObject.mime_type == 'audio/ogg') {
			ext = 'ogg';
		} else if (this._apiObject.mime_type == 'audio/mpeg') {
			ext = 'mp3';
		}
		return './tg/svideo/doc_'+this.id+'_stream_'+this._apiObject.size+'.'+ext;
	}

	scheduleDownload() {
		if (this._isDownloading || this._isDownloaded) {
			return true;
		}

		this._isDownloading = true;
		// this._downloadingPercentage = 0;
		// this._downloadingPartN = 0;
		// this._totalParts = Math.ceil( this._apiObject.size / (512*1024) );

		// console.error('totalParts', this._totalParts);

		// this._partBlobs = [];
		// this._downloadedParts = {};
	}

	sizeToHuman(size) {
		// nice one. https://stackoverflow.com/a/20732091/1119169  thanks Andrew!
	    const sizeI = Math.floor( Math.log(size) / Math.log(1024) );
	    return ( size / Math.pow(1024, sizeI) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][sizeI];
	}

	async downloadPart(n) {
		console.error(n)
		if (!this._downloadedParts[n]) {
			this._downloadedParts[n] = true;

			// console.error('asked get '+n);
			try {
				let ab = await this._peerManager._media.loadFilePartAndReturnAB(this._apiObject, n);
			// console.error('asked got '+n);
			// this._partBlobs.push({n: n, blob: blob});

			// let ab = await blob.arrayBuffer();

				await this._peerManager._user._protocol.fulfillSWStream(this.id, n, ab);

				let url = './tg/doc_'+this._apiObject.id+'_part_'+n+'.dat'
				let blob = await this._peerManager._user._protocol.putToCacheAndForget({
					binary: ab,
					url: url,
				});
				this._partBlobs.push({n: n, blob: blob});
				this._downloadingSize = (512*1024) * (1 + this._downloadingPartN);
			} catch(e) {
				console.error(e);
			}
		} else {
			await this._peerManager._user._protocol.fulfillSWStream(this.id, n);
		}


		return true;
	}

	async downloadNextPart(forceParallel) {
		if (this._isDownloaded) {
			return true;
		}

		let downloadingPartN = this._downloadingPartN;
		let wasForced = false;

		// determine if sw asked for specific part
		if (this._peerManager._user._protocol._docMessages[this._id]) {
			downloadingPartN = this._peerManager._user._protocol._docMessages[this._id].partN;
			console.error('sw asked to '+downloadingPartN);
			delete this._peerManager._user._protocol._docMessages[this._id];

			this._downloadingPartN = downloadingPartN;
			this._isDownloaded = false;
			// this._peerManager._user._protocol._mostRecentSWMessage = null;

			wasForced = true;
		}

		if (this._isDownloaded) {
			return true;
		}

		if (wasForced || forceParallel) {
			// download few chunks in parallel
			let promises = [];
			let max = this._parallelC;
			let i = 0;
			do {
				promises.push(this.downloadPart(downloadingPartN));
				downloadingPartN++;
				if (downloadingPartN >= this._totalParts) {
					break;
				}
				i++;
			} while (i < max);

			await Promise.all(promises);
			this._downloadingPartN = downloadingPartN;
		} else {
			await this.downloadPart(downloadingPartN);
			this._downloadingPartN++;
		}

		this._downloadingPercentage =  Math.ceil( (this._downloadingPartN / this._totalParts) * 100 );
		this._downloadingSizeHuman = this.sizeToHuman(this._downloadingSize);

		if (this._downloadingPartN >= this._totalParts) {
			let thereIsMissed = false;
			for (let i = 0; i < this._totalParts; i++) {
				if (!this._downloadedParts[i] && !thereIsMissed) {
					thereIsMissed = true;
					this._downloadingPartN = i;
					break;
				}
			}

			if (!thereIsMissed) {
				this._isDownloaded = true;
			}
		}
	}

}

module.exports = Streamable;
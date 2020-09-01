const EventTarget = window.classes.EventTarget;

class DownloadManager extends EventTarget {
	constructor(params = {}) {
		super();

		this._docsToDownload = [];
		// this._docsDownloaded = {};

		setTimeout(()=>{
			this.tick();
		}, 5000);
	}

	schedule(docItem) {
		this._docsToDownload.push(docItem);
		docItem.scheduleDownload();
	}

	cancel(docItem) {

		for (let i = 0; i < this._docsToDownload.length; i++) {
			if (this._docsToDownload[i].id == docItem.id) {
				this._docsToDownload.splice(i, 1);
				docItem.cancelDownload();
				break;
			}
		}
	}

	async tick() {
		let tm = 100;
		if (this._docsToDownload.length) {
			let docItem = this._docsToDownload[0];

			try {
				await docItem.downloadNextPart(!!docItem._downloadingSize); // get 1st part in one thread, next in parallel
			} catch(e) {
				console.log(e);
			}

			if (docItem._isDownloaded) {
				// we are done with this
				this.emit('downloaded', docItem);
				this._docsToDownload.shift();
			} else {
				this.emit('progress', docItem);
			}
			tm = 10;
		}

		setTimeout(()=>{
			this.tick();
		}, tm);
	}
}

module.exports = DownloadManager;
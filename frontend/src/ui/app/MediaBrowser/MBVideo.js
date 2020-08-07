const MBAbstract = require('./MBAbstract.js');

class MBVideo extends MBAbstract {
	constructor(params) {
		super(params);

		this._mediaPlaying = true;
	}

	getMediaWidth() {
		return this._data.calc.width;
	}

	animateGo() {
		let el = this.$('.mbbPhoto');
		el.style.top = '' + this._data.calc.y + 'px';
		el.style.left = '' + this._data.calc.x + 'px';
		el.style.height = '' + this._data.calc.height + 'px';
		el.style.width = '' + this._data.calc.width + 'px';

		this.$('.videoLoading').style.marginTop = '' + ( (this._data.calc.height / 2) - 12 ) + 'px';

		this._mediaPlaying = true;
		// this.loadFull();
		//
		setTimeout(()=>{
			this.startLoad();
		}, 100);
	}

	stopMedia() {
		const videoEl = this.$('.videoPlayer');
		if (videoEl) {
			videoEl.pause();
		}

		this._mediaPlaying = false;
	}

	async startLoad() {
		this._media.scheduleDownload();
		await this._media.checkCache();
		do {
			console.time('1');
			await this._media.downloadNextPart();
			// let blobURL = await this._media.getDownloadedBlob();
			// console.warn(blobURL);

			const videoEl = this.$('.videoPlayer');

			if (!videoEl) {
				return;
			}

			if (!this._srcSet) {
				videoEl.onloadeddata = () => {
					videoEl.style.display = 'block';
					this.$('.videoLoading').style.display = 'none';

					if (this._mediaPlaying) {
						videoEl.play();
					}
				};
				videoEl.src = this._media.getStreamURL(); // + '?r=' + Math.random();
				videoEl.load();
				this._srcSet = true;
			}
			console.timeEnd('1');
		} while(!this._media._isDownloaded && this._mediaPlaying);

		console.error('Media | downloaded');
	}

	// async loadFull() {
	// 	let originalBlobURL = await this._media.loadFull();
	// 	if (originalBlobURL) {
	// 		let el = this.$('.mbbPhoto');
	// 		if (el) {
	// 			el.style.backgroundImage = "url('"+originalBlobURL+"')";
	// 		}
	// 	}
	// }

	template() {
		return `
			<div class="mbbPhoto mbbVideo" style="background-image: url('{{imageURL}}'); {{if (options.fromDefined)}}top: {{from.y}}px; left: {{from.x}}px; width: {{from.width}}px; height: {{from.height}}px;{{/if}}">
				<div class="cssload-zenith onDark videoLoading" style="margin-top: 200px;"></div>
				<video class="videoPlayer" id="video_{{domId}}" preload="auto" controls playsinline style="display: none;"></video>
			</div>
		`;
	}
};

module.exports = MBVideo;
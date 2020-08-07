const AbstractMessage = require('./AbstractMessage.js');
const Layouter = require('../../utils/Layouter.js');

class GIF extends AbstractMessage {
	constructor(params) {
		super(params);


		const toLay = [];
		toLay.push({
			width: params.message._media.getInfo('width'),
			height: params.message._media.getInfo('height'),
			id: params.message._media._id,
			media: params.message._media,
		});

		this._layouter = new Layouter(toLay);
		const layouted = this._layouter.layout();

		this._data.mediaSize = {
			width: layouted[0].width,
			height: layouted[0].height,
		};

		if (this._data.mediaSize.width > 256) {
			let k = this._data.mediaSize.height / this._data.mediaSize.width;
			this._data.mediaSize.width = 256;
			this._data.mediaSize.height = 256 * k;
		}

		this._data.mediaSize.hheight = this._data.mediaSize.height / 2 - 17;
		this._gifPlaying = false;
		this._gifPaused = false;

		// this._data.mediaSize = this.getSizeForTheMedia();
		this._data.previewBase64 = params.message._media.getPreviewBase64();

		this._wasRecent = false; // added most recently, so we need to play animation of it
	}

	wasRecent() {
		this._wasRecent = true;
	}

	clickHandler() {
		this._wasRecent = true;
		this.play();
	}

	doPlay() {
		let messageEl = this.$('#message_'+this._data.message._id);
		let videoEl = this.$('#messageVideo_'+this._data.message._id);

		videoEl.muted = true;
		this._gifPlaying = true;
		messageEl.classList.add('loaded');

		if (!this._wasRecent) {
			this.pause();
		} else {
			this._gifPaused = false;
		}

		if (this._gifPaused) {
			videoEl.loop = false;
			this._gifPlaying = false;
		} else {
			this.pauseOthers();
			videoEl.loop = true;
			videoEl.play();
		}
	}

	play() {
		if (this._data.message._media && this._data.message._media.isGIF()) {
			let videoEl = this.$('#messageVideo_'+this._data.message._id);
			if (videoEl) {
				if (!this._videoPlayingSrcSet) {
					videoEl.onloadeddata = () => {
						this.doPlay();
					};
					videoEl.src = this._data.message._media.getStreamURL();
					this._videoPlayingSrcSet = true;
				} else {
					this.doPlay();
				}
			}

			this.tick();
		}
	}

	async tick() {
		await this._data.message._media.checkCache();

		while(!this._data.message._media._isDownloaded) {
			await this._data.message._media.downloadNextPart();
		}
	}

	photoLoaded(blobURL) {
		const el = this.$('#message_'+this._data.message._id);
		if (el) {
			const url = "url('"+blobURL+"')";
			if (this._data.previewBase64) {
				el.style.backgroundImage = url + ',' + el.style.backgroundImage;
			} else {
				el.style.backgroundImage = url;
				el.style.setProperty('--brImage', url);
			}

			this.nextTick(()=>{
				this.play();
			});
		}
	}

	pauseOthers() {
		for (let mc of this._parent._components.messages) {
			if (mc._data.message._id != this._data.message._id && (mc._gifPaused === false || mc._gifPlaying === false)) {

				mc.pause();
			}
		}
	}

	pause() {
		// console.error('pausing '+this._data.message._id);
		this._gifPaused = true;
		try {
			this.$('#messageVideo_'+this._data.message._id).pause();
		} catch(e) {};
	}
};

GIF.template = `
					<div id="message_{{message._id}}" data-id="{{message._id}}"
						class="
							panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
							withVideo
							withVideoOnly
							panelGIF
							{{if (options.sameAsNext)}} sameAsNext{{/if}}
							messageAction
						"
						title="{{message._id}}"
						style="
							{{if (options.previewBase64)}}
							--brImage: url('{{previewBase64}}'); background-image: url('{{previewBase64}}');
							{{/if}}
							width: {{mediaSize.width}}px;
							height: {{mediaSize.height}}px;
						"
						>

						<div class="messageContent messageMediaOnly"
							style="width: {{mediaSize.width}}px; height: {{mediaSize.height}}px;"
							>
									<div id="messageMedia_{{message._id}}" class="messageMedia" style="width: {{mediaSize.width}}px; height: {{mediaSize.height}}px;"><div class="cssload-zenith onDark videoLoading" style="margin-top: {{mediaSize.hheight}}px;"></div><video muted id="messageVideo_{{message._id}}" autoplay loop></video></div>

						</div>
						<div class="messageMeta">{{self.getMetaHTML() | safe}}</div>

						{{self.avHTML(options.message, 'avatarSmall')|safe}}

					</div>

			<div style="clear: both"></div>
		`;


module.exports = GIF;
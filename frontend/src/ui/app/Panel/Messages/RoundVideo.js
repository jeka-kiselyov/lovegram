const AbstractMessage = require('./AbstractMessage.js');
const AppIcon = require('../../../icons/AppIcon.js');

class RoundVideo extends AbstractMessage {
	constructor(params) {
		super(params);

		this._data.mediaSize = this.getSizeForTheMedia();
		this._components.NoSound = this.newC(AppIcon, {icon: 'nosound'});

		this._videoPlayingBlobURL = null;
		this._videoPlayingSrcSet = false;
		this._videoPlayingState = 'undefined';
		this._roundVideoDate = this._data.message._date;

		this.playRoundVideo();
	}

	clickHandler() {
		if (this._videoPlayingState == 'undefined' || this._videoPlayingState == 'pause') {
			this.playRoundVideo();
		} else if (this._videoPlayingState == 'muted') {
			this.muteRoundVideo(false);
		} else if (this._videoPlayingState == 'play') {
			this.pauseRoundVideo();
		}
	}

	pauseRoundVideo() {
		if (this._data.message._media && this._data.message._media.isRoundVideo()) {
			let videoEl = this.$('#messageVideo_'+this._data.message._id);
			if (videoEl) {
				videoEl.pause();
				videoEl.muted = true;

				this._videoPlayingState = 'pause';
				this.$('.nosound').style.display = 'block';
			}
		}
	}

	muteRoundVideo(muted) {
		let videoEl = this.$('#messageVideo_'+this._data.message._id);
		if (videoEl) {
			if (muted) {
				videoEl.muted = true;
				this.$('.nosound').style.display = 'block';
				this._videoPlayingState = 'muted';
			} else {
				videoEl.muted = false;
				this.$('.nosound').style.display = 'none';
				this._videoPlayingState = 'play';

				this.pauseOthers();
			}
		}
	}

	pauseOthers() {
		for (let mc of this._parent._components.messages) {
			if (mc != this && mc._roundVideoDate) {
				mc.pauseRoundVideo();
			}
		}
	}

	roundLoopEnded() {
		if (this._videoPlayingState == 'play') {
			// try to find the next round video
			let foundMC = null;
			let foundDateDiff = Infinity;
			for (let mc of this._parent._components.messages) {
				if (mc != this && mc._roundVideoDate) {
					if (mc._roundVideoDate > this._roundVideoDate && (mc._roundVideoDate - this._roundVideoDate) < foundDateDiff) {
						foundDateDiff = (mc._roundVideoDate - this._roundVideoDate);
						foundMC = mc;
					}
				}
			}

			if (foundMC) {
				foundMC.playRoundVideo(true);
			} else {
				this.muteRoundVideo(true);
				let videoEl = this.$('#messageVideo_'+this._data.message._id);
				if (videoEl) {
					videoEl.play();
				}
			}
		} else {
			this._videoPlayingState = 'pause';
		}
	}

	playRoundVideo(playLoud) {
		if (this._data.message._media && this._data.message._media.isRoundVideo()) {
			let doPlay = ()=>{
				let videoEl = this.$('#messageVideo_'+this._data.message._id);
				if (videoEl) {
					if (!this._videoPlayingSrcSet) {
						videoEl.onloadeddata = () => {
							if (playLoud) {
								videoEl.muted = false;
								this.$('.nosound').style.display = 'none';
								this._videoPlayingState = 'play';
							} else {
								videoEl.muted = true;
								this.$('.nosound').style.display = 'block';
								this._videoPlayingState = 'muted';
							}

							this.$('#messageMediaPlaying_'+this._data.message._id).style.display = 'block';
							this.$('#messageMedia_'+this._data.message._id).style.display = 'none';
						};
						videoEl.onended = () => {
							this.roundLoopEnded();
						};
						videoEl.src = this._videoPlayingBlobURL;
						this._videoPlayingSrcSet = true;

						this.pauseOthers();
					} else {
						if (playLoud) {
							try {
								videoEl.currentTime = 0;
							} catch(e) {}
							videoEl.muted = false;
							this.$('.nosound').style.display = 'none';
							this._videoPlayingState = 'play';
						} else {
							videoEl.muted = true;
							this.$('.nosound').style.display = 'block';
							this._videoPlayingState = 'muted';
						}

						videoEl.play();
						this.$('#messageMediaPlaying_'+this._data.message._id).style.display = 'block';
						this.$('#messageMedia_'+this._data.message._id).style.display = 'none';

						this.pauseOthers();
					}
				}
			};

			if (this._videoPlayingBlobURL) {
				doPlay();
			} else {
				this._data.message._media.getPlayableBlobURL()
					.then((blobURL)=>{
						this._videoPlayingBlobURL = blobURL;
						doPlay();
					});
			}
		}
	}

	photoLoaded(blobURL) {
		const el = this.$('#message_'+this._data.message._id);
		if (el) {
			const url = "url('"+blobURL+"')";
			if (el.classList.contains('withPhotoOnly')) {
				el.style.backgroundImage = url;
				el.style.setProperty('--brImage', url);

				// el.style.setProperty('--brImage', 'url("https://static.toiimg.com/thumb/msid-44945488,width-748,height-499,resizemode=4,imgsize-291921/Nice-in-pictures.jpg")');
			} else {
				const mediaEl = this.$('#messageMedia_'+this._data.message._id);
				if (mediaEl) {
					mediaEl.style.backgroundImage = url;
				}
			}
		}

		// this.resizeToPhotoRatio();
	}
};

RoundVideo.template = `
			<div id="message_{{message._id}}" data-id="{{message._id}}"
				class="
					panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
					withVideo withVideoOnly
					panelRoundVideo
					messageAction
				"
				title="{{message._id}}"
				style="
					{{if (options.message._media)}}
						min-width: {{mediaSize.width}}px;
					{{/if}}
				"
				>

				<div class="duration">{{message._media.getInfo('videoDurationHuman')}} <div class="nosound">{{component(options.components.NoSound)}}{{/component}}</div></div>

				<div id="messageMedia_{{message._id}}" class="messageMedia" style="background-image: url('{{message._media.getPreviewBase64()}}');
					min-width: {{mediaSize.width}}px;">
					<div class=playIcon></div>
				</div>
				<div id="messageMediaPlaying_{{message._id}}" class="messageMedia messageMediaPlaying" style="display: none;">
					<video muted id="messageVideo_{{message._id}}" autoplay></video>
				</div>

				<div class="messageMeta">{{self.getMetaHTML() | safe}}</div>

				{{self.avHTML(options.message, 'avatarSmall')|safe}}

			</div>

			<div style="clear: both"></div>
		`;


module.exports = RoundVideo;
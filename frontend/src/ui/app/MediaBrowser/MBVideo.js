const MBAbstract = require('./MBAbstract.js');
const AppUI = require('../../../utils/AppUI.js');

class MBVideo extends MBAbstract {
	constructor(params) {
		super(params);

		this._previewHeight = 100;
		this._mediaPlaying = true;

		// this._events = [
		// 	['click', 'mpPlay'+this._domId, 'onPlayClick'],
		// 	['mousedown', 'mpTrack'+this._domId, 'onTrackDown'],
		// 	['mousemove', 'mpTrack'+this._domId, 'onTrackMove'],
		// 	['mouseup', 'mpTrack'+this._domId, 'onTrackUp'],
		// 	['mouseleave', 'mpTrack'+this._domId, 'onTrackLeave'],
		// ];
		this._mouseIsDown = null;
	}

	onResize() {
		this.calc();
		this.animateGo(true);

		this._trackRect = null;
	}

	getMediaWidth() {
		return this._data.calc.width;
	}

	animateGo(dontstart) {
		let el = this.$('.mbbPhoto');
		el.style.top = '' + this._data.calc.y + 'px';
		el.style.left = '' + this._data.calc.x + 'px';
		el.style.height = '' + this._data.calc.height + 'px';
		el.style.width = '' + this._data.calc.width + 'px';

		this.$('.videoLoading').style.marginTop = '' + ( (this._data.calc.height / 2) - 12 ) + 'px';

		el.classList.add('playing');

		this._mediaPlaying = true;
		// this.loadFull();
		//
		if (!dontstart) {
			setTimeout(()=>{
				this.startLoad();
			}, 100);
		}
	}

	stopMedia() {
		if (this._videoTag) {
			this._videoTag.muted = true;
			this._videoTag.pause();
			this._videoTag.removeAttribute('src');
			this._videoTag.load();
		}

		this.$('.previewVideo').pause();
		this.$('.previewVideo').removeAttribute('src');
		this.$('.previewVideo').load();

		this._srcSet = false;
		this._mediaPlaying = false;
		this._previewSet = false;

		this.$('.mbbPhoto').classList.remove('playing');
	}

	onFull() {
		this._videoTag.requestFullscreen();
	}

	async startLoad() {

		this._media.scheduleDownload();
		await this._media.checkCache();
		await this.restorePreviewSprites();

		this._previewSet = false;
		do {
			// console.time('1');
			this.onLoadTime();
			await this._media.downloadNextPart();
			// let blobURL = await this._media.getDownloadedBlob();
			// console.warn(blobURL);

			this._videoTag = this.$('.videoPlayer');

			if (!this._videoTag) {
				return;
			}



			/// pause music if playing
			this._app._mediaPlayer.pausePlaying();

			this._videoTag.muted = false;

			if (!this._eventsSet) {
				this.$('.mpCont').addEventListener('click', (e)=>{this.onClick(e);});
				this.$('.mpPlay').addEventListener('click', ()=>{this.onPlayClick();});
				this.$('.mpFull').addEventListener('click', ()=>{this.onFull();});
				this.$('.mpTrack').addEventListener('mousedown', (e)=>{this.onTrackDown(e);});
				this.$('.mpTrack').addEventListener('mousemove', (e)=>{this.onTrackMove(e);});
				this.$('.mpTrack').addEventListener('touchmove', (e)=>{this.onTrackTouch(e);});
				this.$('.mpTrack').addEventListener('mouseup', (e)=>{this.onTrackUp(e);});
				this.$('.mpTrack').addEventListener('mouseleave', (e)=>{this.onTrackLeave(e);});

				this._eventsSet = true;
			}

			if (!this._srcSet) {
				this._videoTag.onloadeddata = () => {
					this._videoTag.style.display = 'block';
					this.$('.videoLoading').style.display = 'none';

					if (this._mediaPlaying) {
						this._videoTag.play();
						this.playB(false);
					}
				};

				this._videoTag.addEventListener('timeupdate', (e)=>{this.onTagTime(e);});
				this._videoTag.addEventListener('play', (e)=>{this.videoProgress();});
				this._videoTag.addEventListener('ended', (e)=>{this.videoProgress();});
				this._videoTag.addEventListener('progress',()=>{this.videoProgress();});
				this._videoTag.src = this._media.getStreamURL(); // + '?r=' + Math.random();
				this._videoTag.load();
				this._srcSet = true;
			}
			// console.timeEnd('1');
		} while(!this._media._isDownloaded && this._mediaPlaying);

		// console.error('Media | downloaded');
	}

	onLoadTime() {
		this.$('.mpLoaded').innerText = (this._media._isDownloaded || !this._media._isDownloading || !this._media._downloadingPercentage) ? '' : (this._media._downloadingSizeHuman+' / '+this._media.getInfo('sizeHuman'));
	}

	onTagTime(e) {
		const percents = 100 * (this._videoTag.currentTime / this._videoTag.duration);
		let ct = '' + Math.floor(this._videoTag.currentTime / 60) + ':' + ('0' + Math.floor(this._videoTag.currentTime % 60)).slice(-2);
		this.$('.mpTime').innerText = ct + ' / ' + this._media.getInfo('videoDurationHuman');

		// console.error(percents);
		if (this._mouseIsDown === null) {
			this.seekToPercents(percents);
			this._playingPercents = percents;
			this.videoProgress();
		}

		this.upPlay();
	}

	videoProgress() {
		// alert(1)
		try {
			let range = 0;
			let bf = this._videoTag.buffered;
			let time = this._videoTag.currentTime;

			try {
			    while(!(bf.start(range) <= time && time <= bf.end(range)) && range < 100) {
			        range += 1;
			    }
			} catch(e) { range--; }

		    let loadStartPercentage = bf.start(range) / this._videoTag.duration;
		    let loadEndPercentage = bf.end(range) / this._videoTag.duration;
		    let loadPercentage = 100*(loadEndPercentage - loadStartPercentage);

		    if (this._playingPercents) {
		    	loadPercentage+=this._playingPercents;
		    }

			this.$('.mptLoaded').style.width = ''+(loadPercentage)+'%';
		} catch(e){  }


	}

	onClick(e) {
		if (e.target.closest('.mpTrack') || e.target.closest('.mpButs')) return;
		this.onPlayClick();
	}

	onPlayClick() {
		if (this._videoTag.currentTime > 0 && !this._videoTag.paused && !this._videoTag.ended) {
			// playing
			this._videoTag.pause();
			this.playB(true);
		} else {
			this._videoTag.play();
			this.playB(false);
		}
	}

	upPlay() {
		if (this._videoTag.currentTime > 0 && !this._videoTag.paused && !this._videoTag.ended) {
			this.playB(false);
			return false;
		} else {
			this.playB(true);
			return true;
		}
	}

	playB(pause) {
		this.$('.mpIconPlay').classList[(pause ? 'add' : 'remove')]('active');
		this.$('.mpIconPause').classList[(!pause ? 'add' : 'remove')]('active');
	}

	onTrackDown(e) {
		this._mouseIsDown = e.pageX;
		this.$('.mptOver').style.display = 'block';
		this.seekToX(e.pageX);
	}

	onTrackTouch(e) {
		// console.error(e.touches);
		this.previewOnX(e.touches[0].pageX);
	}

	onTrackMove(e) {
		this.previewOnX(e.pageX);

		if (this._mouseIsDown === null) {
			return false;
		}
		this.seekToX(e.pageX);
	}

	onTrackUp(e) {
		this._mouseIsDown = null;
		this.$('.mptOver').style.display = 'none';
		let p = this.xToPercents(e.pageX);
		this._videoTag.currentTime = this.percentsToTime(p);

		if (this.isTouchDevice()) {
			this.onTrackLeave();
		}
	}

	onTrackLeave() {
		this.toHidePreview();
	}

	toHidePreview() {
		clearTimeout(this._hpt);
		this._hpt = setTimeout(()=>{
			this.$('.mptHover').classList.remove('active');
		}, 200);
	}

	xToPercents(x) {
		if (!this._trackRect) {
			this._trackRect = this.$('.mpTrack').getBoundingClientRect();
		}
		let percents = ((x - this._trackRect.x) < 0 ? 0 : (x - this._trackRect.x)) / this._trackRect.width;
		percents = (percents > 1 ? 1 : percents)*100;

		return percents;
	}

	percentsToTime(p) {
		return (this._videoTag.duration / 100) * p;
	}

	seekToPercents(p) {
		p = (p - 1); if (p > 98) p = 98;
		this.$('.mptBlue').style.width = ''+p+'%';
		this.$('.mptBall').style.left = ''+p+'%';
	}

	seekToX(x) {
		let p = this.xToPercents(x);
		this.seekToPercents(p);
	}

	// recalcHover() {
	// }

	async restorePreviewSprites() {
		this._previewsCached = {};
		let blob = await this._app._peerManager._media.getVideoPreview(this._media);
		// this._previewsCached = {};
		if (blob) {
			let url = URL.createObjectURL(blob);
					this._previewsURL = url;

					// console.log(url);
					// this.$('#mptHoverB1').style.backgroundImage = "url('"+this._previewsURL+"')";
					// this.$('#mptHoverB2').style.backgroundImage = "url('"+this._previewsURL+"')";


			this.$('.mptHover').style.backgroundImage = "url('"+this._previewsURL+"')";

			await this.updatePreviewSprites(url);
		}
	}

	async updatePreviewSprites(blobURL) {
		let previewI = this._previewSeekOffset / 5;

		let pItemWidth = (this._media.getInfo('aspectRatio') * this._previewHeight);
		if (!this._canvasInitialized) {
			this._previewCanvas = document.createElement('canvas');
		    this._previewCanvas.width = pItemWidth * 20; // item for each 5 percents
		    this._previewCanvas.height = this._previewHeight;
			this._canvasInitialized = true;
		}

	    let ctx = this._previewCanvas.getContext("2d");

	    if (blobURL) {
	    	// on initialization we draw previews from cache to canvas
	    	const img = new Image;
			img.onload = ()=>{
				ctx.drawImage(img,0,0,img.width,img.height,0,0,this._previewCanvas.width,this._previewCanvas.height);

				for (let i = 0; i < 30; i++) {
				    let p = ctx.getImageData(pItemWidth*i + 1, 0, 1, 1).data;
				    if (p[0] > 110 && p[0] > p[1] && p[0] > p[2]) {
				    	// color is red
				    	this._previewsCached[i] = true;
				    }
				    // console.error(i, (p[0] > 110 && p[0] > p[1] && p[0] > p[2]), p[0]); // color is red
				}

			};
			img.src = blobURL;
	    } else {
		    // ctx.imageSmoothingEnabled = true;
		    // ctx.drawImage(this._previewVideo, this._previewCanvas.width*(this._previewSeekOffset / 5), 0, this._previewCanvas.width, 50);
		    ctx.drawImage(this._previewVideo, 0, 0, this._media.getInfo('width'), this._media.getInfo('height'), (pItemWidth * previewI), 0, (pItemWidth), this._previewHeight);

		    ctx.fillStyle = '#ff0000';
			ctx.fillRect((pItemWidth * previewI), 0, 3, 3); // draw red pixel in top left corner of sprite item so we know preview was generated for that frame

		    this._previewCanvas.toBlob((blob)=>{
					let url = URL.createObjectURL(blob);

		    		this._app._peerManager._media.saveVideoPreview(this._media, blob);
					this._previewsCached[previewI] = true;
					this._previewsURL = url;

					// console.log(url);

					this.$('.mptHover').style.backgroundImage = "url('"+this._previewsURL+"')";
					// this.$('#mptHoverB1').style.backgroundImage = "url('"+this._previewsURL+"')";
					// this.$('#mptHoverB2').style.backgroundImage = "url('"+this._previewsURL+"')";
		    	}, 'image/jpeg', 0.9);
	    }

	}

	previewSeeking() {
		this.$('.mptHover').classList.add('seeking');
	}

	previewSeeked() {
		this.$('.mptHover').classList.remove('seeking');
		this.updatePreviewSprites();
	}

	previewOnX(x) {
		if (!this._previewSet) {
			this._previewVideo = this.$('.previewVideo');
			this._previewVideo.src = this._media.getStreamURL() + '?preview'; // + '?r=' + Math.random();
			this._previewVideo.addEventListener('seeking',()=>{ this.previewSeeking(); });
			this._previewVideo.addEventListener('seeked',()=>{ this.previewSeeked(); });

			let width = (this._media.getInfo('aspectRatio') * this._previewHeight);
			this.$('.mptHover').style.width = ''+width+'px';
			this.$('.mptHover').style.marginLeft = '-'+Math.floor(width/2)+'px';

			this._trackRect = this.$('.mpTrack').getBoundingClientRect();
			this._maxPreviewPOffset = Math.ceil(Math.abs(Math.floor(width/2) / this._trackRect.width)*100);

			this._previewSet = true;
		}

		this.$('.mptHover').classList.add('active');
		let p = this.xToPercents(x);
		// limit based on width
		if (p < this._maxPreviewPOffset) p = this._maxPreviewPOffset; if (p > (100-this._maxPreviewPOffset)) p = (100-this._maxPreviewPOffset);
		this.$('.mptHover').style.left = ''+p+'%';
		this._previewSeekOffset = Math.floor(p / 5) * 5;

		let previewI = this._previewSeekOffset / 5;
		if (this._previewsCached && this._previewsCached[previewI]) {
			if (this._lastPreviewI == previewI) return;
			this.$('.mptHover').classList.remove('seeking');

			this._previewVideo.style.display = 'none';

			// if (!this._currentHoverB) this._currentHoverB = 1;
			// this.$('#mptHoverB'+this._currentHoverB).classList.remove('active');
			// let cb = this._currentHoverB == 1 ? 2 : 1;
			// this.$('#mptHoverB'+cb).style.backgroundPosition = '-'+((this._media.getInfo('aspectRatio') * this._previewHeight)*previewI)+'px 0px';
			// this.$('#mptHoverB'+cb).classList.add('active');
			// this._currentHoverB = cb;

			let already = this.$('#mptHoverItem'+previewI);
			if (already) {
				already.remove();
			}
				// this.$('.mptHovers').appendChild(already); // move it to the end
			// } else {
				let bgPos = '-'+((this._media.getInfo('aspectRatio') * this._previewHeight)*previewI)+'px 0px';
				let html = `<div id="mptHoverItem${previewI}" class="mptHoverItem" style="background-position: ${bgPos}; background-image: url(${this._previewsURL})"></div>`;
				this.$('.mptHovers').insertAdjacentHTML('beforeEnd', html);
			// }

			setTimeout(()=>{
				this.$('#mptHoverItem'+previewI).classList.add('active');
				clearTimeout(this._rppto);
				this._rppto = setTimeout(()=>{
					let items = this.$$('.mptHoverItem');
					for (let i = 0; i < items.length-1; i++) {
						items[i].remove();
					}
					items[items.length - 1].classList.add('forcedactive');
				},800);
			}, 10);

			// this.$('.mptHover').style.backgroundPosition = '-'+((this._media.getInfo('aspectRatio') * this._previewHeight)*previewI)+'px 0px';

			this._lastPreviewI = previewI;
			// this.$('#mptHoverB2').style.backgroundPosition = '-'+((this._media.getInfo('aspectRatio') * this._previewHeight)*previewI)+'px 0px';
			// showing preview as image in div background
		} else {
			// showing preview as seeking video tag
			this._previewVideo.style.display = 'block';
			// console.error('this._previewSeekOffset', this._previewSeekOffset);
			this._previewVideo.currentTime = Math.floor(this.percentsToTime(this._previewSeekOffset));
		}
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
				<div class="mpCont">
					<div class="mpNav">
						<div class="mpNavCont noswipe">
							<div class="mpTrack" id="mpTrack{{domId}}">
								<div class="mptGray"></div>
								<div class="mptLoaded"></div>
								<div class="mptBlue"></div>
								<div class="mptBall"></div>
								<div class="mptOver"></div>
								<div class="mptHover"><div class="cssload-zenith dark"></div><div class="mptHovers"></div><video class="previewVideo" muted></video></div>
							</div>
							<div class="mpButs noswipe">
								<div class="mpPlay" id="mpPlay{{domId}}">
									<div class="mpIcon mpIconPlay">${AppUI.getIconHTML('play')}</div>
									<div class="mpIcon mpIconPause active">${AppUI.getIconHTML('pause')}</div>
								</div>
								<div class="mpTime"></div>
								<div class="mpFull" id="mpFull{{domId}}">
									<div class="mpIcon active">${AppUI.getIconHTML('fullscreen')}</div>
								</div>
								<div class="mpLoaded">
								</div>
							</div>
						</div>
						<video id="video_{{domId}}" class="videoTag videoPlayer" style="display: none;"></video>
					</div>
				</div>
				<div class="cssload-zenith onDark videoLoading" style="margin-top: 200px;"></div>
			</div>
		`;
	}
};

module.exports = MBVideo;
const AbstractMessage = require('./AbstractMessage.js');

class AudioPlayer extends AbstractMessage {
	constructor(params) {
		super(params);

		this._events = [
			['mouseup', 'at_'+this.domId, 'onMouseUp'],
			['mousedown', 'at_'+this.domId, 'onMouseDown'],
			['mousemove', 'at_'+this.domId, 'onMouseMove'],
			['click', 'ab_'+this.domId, 'onPlay'],
		];

		this._seekWidth = 250;
		this._playPercents = 11;
		this._mouseIsDown = false;

		this._seekEls = [];

		// this._audio = null;

		// this._audioInitPromiseResolver = null;
		// this._audioInitPromise = null;

		// this._audioSrcSet = false;
		// this._streamURL = null;

		// this._audioCanPlay = false;

		// this._audioCanPlayPromiseResolver = null;
		// this._audioCanPlayPromise = new Promise((res)=>{ this._audioCanPlayPromiseResolver = res; });

		this._currentTime = 0;
		this._duration = this._data.message._audio.getInfo('duration');

		this._isPlaying = false;


		this._app._mediaPlayer.on('play', (params)=>{
			if (params.messageAudio._id != this._data.message._audio._id) return;
			this.play();
		});
		this._app._mediaPlayer.on('pause', (params)=>{
			if (params.messageAudio._id != this._data.message._audio._id) return;
			this.pause();
		});
		this._app._mediaPlayer.on('timeupdate', (params)=>{
			if (params.messageAudio._id != this._data.message._audio._id) return;
			this.timeUpdated(params);
		});
	}

	onPlay() {
		if (this._isPlaying) {
			this.pause();
			this._app._mediaPlayer.pauseAudio(this._data.message._audio, this._data.message._peer);
		} else {
			this.play();
			this._app._mediaPlayer.playAudio(this._data.message._audio, this._data.message._peer);
		}
	}

	async play() {
		// if (this._isPlaying) {
		// 	return;
		// }

		// await this._app._mediaPlayer.playAudio(this._data.message._audio);
		this._isPlaying = true;

		this.$('#ab_'+this.domId+'_play').classList.remove('active');
		this.$('#ab_'+this.domId+'_pause').classList.add('active');

		if (!this._data.message._audio.isVoice) {
			this.$('#at_'+this.domId+'_artist').classList.remove('active');
			this.$('#at_'+this.domId).classList.add('active');
		}
	}

	async pause() {
		// if (!this._isPlaying) {
		// 	return;
		// }

		// await this._app._mediaPlayer.pauseAudio(this._data.message._audio);

		this.$('.audioTime').innerHTML = ''+this._data.message._audio.getInfo('durationHuman');
		this._isPlaying = false;

		this.$('#ab_'+this.domId+'_play').classList.add('active');
		this.$('#ab_'+this.domId+'_pause').classList.remove('active');

		if (!this._data.message._audio.isVoice) {
			this.$('#at_'+this.domId+'_artist').classList.add('active');
			this.$('#at_'+this.domId).classList.remove('active');
		}

	}

	async seekTo(percents) {
		await this.play();
		await this._app._mediaPlayer.seekTo(this._data.message._audio, percents);
		// this._audio.currentTime = (percents / 100) * this._duration;
	}

	timeUpdated(params) {
		if (params.messageAudio._id != this._data.message._audio._id) {
			return;
		}
		if (!this._isPlaying && params.currentTime) {
			this.play();
		}

		this._currentTime = params.currentTime;

		if (!this._data.message._audio.isVoice) {
			if (this._isPlaying) {
				this.$('.audioTime').innerHTML = ''+Math.floor(this._currentTime / 60) + ':' + ('0' + (Math.floor(this._currentTime) % 60)).slice(-2)+' / '+this._data.message._audio.getInfo('durationHuman');
			}
		}

		if (this._mouseIsDown) {
			return;
		}

		let pSeek = (this._currentTime / this._duration)*100;
		this.moveSeekTo(pSeek);
	}

	// async audioLoad() {
	// 	const messageAudio = this._data.message._audio;

	// 	do {
	// 		console.error('next part');
	// 		await messageAudio.downloadNextPart();
	// 		if (!this._audio) {
	// 			return;
	// 		}
	// 	} while(!messageAudio._isDownloaded);
	// 	console.error('is downloaded');
	// }

	// async initAudio() {
	// 	if (this._audioInitPromise) {
	// 		await this._audioInitPromise;
	// 		return this._audio;
	// 	}

	// 	this._audioInitPromise = new Promise((res)=>{ this._audioInitPromiseResolver = res; });

	// 	console.error('initAudio');

	// 	const messageAudio = this._data.message._audio;
	// 	this._streamURL = messageAudio.getStreamURL();
	// 	this._audio = new Audio(this._streamURL);
	// 	this._audio.addEventListener("canplay", (event) => {
	// 		this._audioCanPlay = true;
	// 		this._audioCanPlayPromiseResolver();
	// 	});

	// 	this._audio.addEventListener('timeupdate', (event) => {
	// 		this._currentTime = this._audio.currentTime;
	// 		this.timeUpdated();
	// 	});

	// 	this._audio.addEventListener('ended', (event) => {
	// 		this.pause();
	// 	});

	// 	messageAudio.scheduleDownload();
	// 	this.audioLoad();
	// 	this._audioInitPromiseResolver();
	// }

	onMouseDown(e) {
		const x = e.offsetX;
		this._mouseIsDown = true;
		this.$('.audioTrack').classList.add('seeking');
		this.moveSeekTo(100*(x / this._seekWidth));
	}

	onMouseMove(e) {
		if (!this._mouseIsDown) {
			return false;
		}

		const x = e.offsetX;
		this.moveSeekTo(100*(x / this._seekWidth));
	}

	onMouseUp(e) {
		const x = e.offsetX;
		this._mouseIsDown = false;
		const percents = 100*(x / this._seekWidth);
		this.moveSeekTo(percents);
		this.$('.audioTrack').classList.remove('seeking');
		this.seekTo(percents);
	}

	moveSeekTo(percents) {
		if (this._data.message._audio.isVoice) {
			if (this._seekEls.length) {
				let toLe = this._seekEls.length * (percents / 100);
				for (let i = 0; i < this._seekEls.length; i++) {
					if (i < toLe) {
						this._seekEls[i].classList.add('seeked');
					} else {
						this._seekEls[i].classList.remove('seeked');
					}
				}
			}
		} else {
			this.$('.audioSeek').style.width = ''+percents+'%';
		}
	}

	afterRender() {
		this.nextTick(()=>{
			this._seekEls = this.$$('.awi');
			this.assignDomEvents();
		});
	}
};
//
AudioPlayer.template = `
			<div id="message_{{message._id}}" data-id="{{message._id}}"
				class="
					panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
					{{if (options.sameAsNext)}} sameAsNext{{/if}}
				"
				title="{{message._id}}"
				style="
				"
				>

				<div class="messageAuthor">{{authorName}}</div>
				{{if (options.reply)}}
					<div class="messageReply">
						<div class="author">{{reply.author}}</div>
						<div class="replyBody">{{reply.message}}</div>
					</div>
				{{/if}}


				{{if (options.forwardedInfo)}}<div class="fowardedHeader">Forwarded message</div>{{/if}}
				<div class="messageContent {{if (options.forwardedInfo)}}messageReply{{/if}}"
					style=""
					>
					{{if (options.forwardedInfo)}}
						<div class="author">{{forwardedInfo.name}}</div>
					{{/if}}

					<div class="audio audio_{{message._audio.id}}" data-id="{{message._audio.id}}">
						<div class="audioButton rpb" id="ab_{{domId}}"><div id="ab_{{domId}}_play" class="active">{{self.AppUI.getIconHTML('play')|safe}}</div><div id="ab_{{domId}}_pause">{{self.AppUI.getIconHTML('pause')|safe}}</div></div>
						{{if (options.message._audio.isVoice)}}
							<div class="audioWaveform">
								<div class="awOver" id="at_{{domId}}"></div>
								{{each(options.message._audio.getInfo('waveform'))}}<span class="awi" style="height: {{@this}}px;"></span>{{/each}}
							</div>
						{{#else}}
							<div class="audioTitle">{{message._audio.getInfo('title')}}</div>
							<div class="audioArtist active" id="at_{{domId}}_artist">{{message._audio.getInfo('performer')}}</div>
							<div class="audioTrack" id="at_{{domId}}" ><div class="audioSeek"></div><div class="audioLine"></div></div>
						{{/if}}
						<div class="audioTime">{{message._audio.getInfo('durationHuman')}}</div>
					</div>

				</div>
				<div class="messageMeta">{{self.getMetaHTML() | safe}}</div>

				{{self.avHTML(options.message, 'avatarSmall')|safe}}

			</div>

			<div style="clear: both"></div>
		`;


module.exports = AudioPlayer;
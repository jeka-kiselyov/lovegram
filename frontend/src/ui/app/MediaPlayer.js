const EventTarget = window.classes.EventTarget;
const Res = require('../../utils/Res.js');

class MediaPlayer extends EventTarget {
	constructor(params) {
		super(params);

		this._recorder = null;
		this._recorded = null;
		this._recordedDuration = null;

		this._recordedStartAt = null;
		this._recordedFinishAt = null;
		this._isRecording = false;

		this._askedToLoadAudio = null;
		this._playingAudio = null;
		this._playingTime = 0;
		this._audiosTags = {};
		this._audiosCanPlay = {};

		this._pausedAudio = true;
		this._audioPeer = null;
	}

	async seekTo(messageAudio, percents) {
		if (!this._playingAudio || this._playingAudio._id != messageAudio._id) {
			// await this.playAudio(messageAudio);
		}
		this._audiosTags[messageAudio._id].currentTime = (percents / 100) * this._audiosTags[messageAudio._id].duration;
	}

	async audioLoad(messageAudio, preload) {
		do {
			// console.error('next part');
			if (!messageAudio) {
				return;
			}
			if (messageAudio._isDownloaded) {
				return;
			} else if (preload && (this._audiosCanPlay[messageAudio._id])) {
				// if we jumped to other audio - no need to load this more
				return;
			}
			await messageAudio.downloadNextPart(true);
		} while(true);
		// console.error('mediaPlayer is downloaded');
	}

	async preloadAudio(messageAudio) {
		if (await this.sureSingle('preload_'+messageAudio._id)) {
			return true;
		}

		this._askedToLoadAudio = messageAudio;
		const streamURL = messageAudio.getStreamURL();
		const audioTag = new Audio(streamURL);
		this._audiosTags[messageAudio._id] = audioTag;

		await new Promise((res)=>{
			audioTag.addEventListener("canplay", (event) => {
				console.error('canplay');
				this._audiosCanPlay[messageAudio._id] = true;
				res();
			});
			audioTag.addEventListener("loadedmetadata", (event) => {
				console.error('loadedmetadata');
				this._audiosCanPlay[messageAudio._id] = true;
				res();
			});
			audioTag.addEventListener('timeupdate', (event) => {
				this._playingTime = audioTag.currentTime;
				if (!this._pausedAudio) {
					this.emit('timeupdate', {
						messageAudio: messageAudio,
						currentTime: audioTag.currentTime,
						percents: 100 * (audioTag.currentTime / audioTag.duration),
					});
				}
				// this.timeUpdated();
			});
			audioTag.addEventListener('ended', (event) => {
				this.audioEnded();
				// this.pausePlaying();
				// this.emit('ended', {messageAudio: this._playingAudio});
			});
			messageAudio.scheduleDownload();
			this.audioLoad(messageAudio, true);
		});

		this.fulfilSingle('preload_'+messageAudio._id, true);
	}

	async audioEnded() {
		this.pausePlaying();
		if (this._audioPeer) {
			for (let i = 0; i < this._audioPeer._audios.length; i++) {
				if (this._audioPeer._audios[i]._id == this._playingAudio._id) {
					this.playAudio(this._audioPeer._audios[i+1], this._audioPeer);
				}
			}
		}
	}

	async toggleAudio(messageAudio, peer) {
		console.error('toggleAudio', messageAudio);

		if (!this._playingAudio || this._pausedAudio || this._playingAudio._id != messageAudio._id) {
			await this.playAudio(messageAudio, peer);
		} else {
			await this.pauseAudio(messageAudio);
		}
	}

	async playAudio(messageAudio, peer) {
		if (this._playingAudio && this._playingAudio._id == messageAudio._id && !this._pausedAudio) {
			return;
		}
		this._audioPeer = peer;

		const playingAudio = this._playingAudio;
		if (this._audiosCanPlay[messageAudio._id]) {

		} else {
			await this.preloadAudio(messageAudio);
		}
		this.pauseAudio(playingAudio);

		this._playingAudio = messageAudio;
		this._audiosTags[messageAudio._id].play();
		this._pausedAudio = false;

		this.emit('play', {
			messageAudio: messageAudio,
		});
		this.audioLoad(messageAudio);

		if (playingAudio && playingAudio._id != messageAudio._id) {
			// changed to other, so lets prev to the start
			this._audiosTags[playingAudio._id].currentTime = 0;
		}
	}

	pausePlaying() {
		(this._playingAudio && this.pauseAudio(this._playingAudio));
	}

	async pauseAudio(messageAudio) {
		if (this._playingAudio && this._playingAudio._id == messageAudio._id && this._pausedAudio) {
			return;
		}
		// messageAudio = messageAudio || this._playingAudio;
		if (!messageAudio) {
			return;
		}

		this._audiosTags[messageAudio._id].pause();
		this._pausedAudio = true;
		this.emit('pause', {
			messageAudio: messageAudio,
		});
	}

	getRecordedDuration() {
		if (this._recordedStartAt === null) {
			return 0;
		}

		let toTime = this._recordedFinishAt;
		if (toTime === null) {
			toTime = new Date();
		}

		return (toTime.getTime() - this._recordedStartAt.getTime())/1000;
	}

	async initRecorder() {
		if (this._isRecording) {
			return true;
		}

		this._isRecording = true;
		this._recordedStartAt = null;
		this._recordedFinishAt = null;

		if (!this._recorder) {
			await Res.includeOnce('assets/js/oggrecorder.js');
			this._recorder = new Recorder({
				encoderPath: 'assets/js/oggworker.js',
				encoderSampleRate: 24000,
				encoderApplication: 2048,
				reuseWorker: true,
			});
	        this._recorder.ondataavailable = (typedArray)=>{
	        	this._recorded = typedArray;
	        };
		}

        try {
			await this._recorder.start();
			console.log('duration', 'started');
			this._recordedStartAt = new Date();
        } catch(e) {
        	console.error(e);

			this._isRecording = false;
			return false;
        }

        if (this._recordedFinishAt !== null) {
        	await this.stopRecorder();
        }
        return true;
	}

	async stopRecorder() {
		try {
			this._recordedFinishAt = new Date();
			await this._recorder.stop();
			console.log('duration', 'stoped');
		} catch(e) {}
		this._isRecording = false;
	}
};

module.exports = MediaPlayer;

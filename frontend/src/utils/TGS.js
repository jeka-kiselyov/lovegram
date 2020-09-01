

class TGS {
	constructor(container) {
		// this._domElementId = domElementId;
		this._container = container;
		this._data = null;
		this._anim = null;

		this._restoreData = null;
		this._freed = false;

		this._lastTime = null;
		this._playTillTime = null;
		this._onEnterFrame = (e)=>{
			if (this._playTillTime === null) {
				return;
			}

			let normTime = e.currentTime;

			let llmin = Math.min(this._lastTime, e.currentTime);
			let llmax = Math.max(this._lastTime, e.currentTime);

			if (  ((llmax - llmin) > 100 && this._playTillTime === 0) || // tricky ass, catch max->0 switch @todo: make this good
				  (this._playTillTime !== null && (llmin <= this._playTillTime && llmax >= this._playTillTime)) ) {
				setTimeout(()=>{
					this._anim.goToAndStop(this._playTillTime, true);
					this._lastTime = this._playTillTime;
					this.rE();
				},1);
			}

			this._lastTime = e.currentTime;
		}

		this._onComplete = ()=>{
			this.rE();
		};
	}

	/**
	 * Free animation memory, but keep rendered dom element, so it can be restored any time
	 * @return {[type]} [description]
	 */
	free() {
		// console.error('free');
		this._anim.renderer.renderConfig.clearCanvas = false;
	    this._anim.renderer.destroy();
	    this._anim.imagePreloader.destroy();
	    this._anim.trigger('destroy');
	    this._anim._cbs = null;
	    this._anim.onEnterFrame = this.onLoopComplete = this.onComplete = this.onSegmentStart = this.onDestroy = null;
	    this._anim.renderer = null;

		// return this.destroy();

		delete this._anim.animationData;
		delete this._anim.assets;
		delete this._anim.projectInterface;
		// this._anim.renderer.destroy();
		delete this._anim.renderer;
		delete this._anim.imagePreloader;
		this._anim = null;

		this._freed = true;
		// console.error('free done');
	}

	destroy() {
		if (this._anim) {
			this._anim.destroy();
			delete this._anim.animationData;
			delete this._anim.renderer;
			delete this._anim.assets;
			delete this._anim;

			console.log('destroyed');
		}
	}

	aE() {
		this._anim.addEventListener('enterFrame', this._onEnterFrame);
		this._anim.addEventListener('complete', this._onComplete);
	}

	rE() {
		this._anim.removeEventListener('enterFrame', this._onEnterFrame);
		this._anim.removeEventListener('complete', this._onComplete);
		if (this._resolvePlayTo) {
			this._resolvePlayTo();
		}
	}

	playTo(time, guessDirection, speed) {
		this._promise = new Promise((res,rej)=>{
			if (this._resolvePlayTo) {
				this._resolvePlayTo();
			}

			speed = speed || 1;

			this._resolvePlayTo = res;

			// console.log('play to', time);
			this._anim.loop = false;
			if (this._anim.currentFrame > time) {
				if (guessDirection) {
					this._anim.setSpeed(-1*speed);
				} else {
					this._anim.setSpeed(speed);
				}
				this._anim.play();
				// console.log('reverse');
			} else {
				this._anim.setSpeed(speed);
				this._anim.play();
				// console.log('forward');
			}
			this._playTillTime = time;
			this.aE();
		});

		return this._promise;
				// this._anim.goToAndStop(this._playTillTime, true);
	}

	async playOneLoop() {
		this._anim.goToAndStop(0);
			// console.error('play 1');

		await new Promise((res)=>{
			this._anim.addEventListener('complete', res);
			// console.error('play');
			this._anim.play();
		});
	}

	async playOnce() {
		let wasFreed = false;
		if (this._restoreData) {
			const data = await this._restoreData.load();
			this._container.innerHTML = '';
			await this.setJSON(data, true);
			this._freed = false;
			wasFreed = true;
		}

		if (this._anim.isPaused) {
			this._anim.loop = false;
			await this.playOneLoop();

			if (wasFreed) {
				this.free();
			}
		}
	}

	async setData(data, doNotStart) {
		await TGS._lottieReadyPromise;

// window.lottie.setQuality('high');
		// this._data = data;
		const options = {
			container: this._container,
			renderer: 'canvas',
			loop: true,
			autoplay: true,
			animationData: data,
			rendererSettings: {
			    preserveAspectRatio: 'xMidYMid meet',
			    progressiveLoad: true,
			    clearCanvas: true,
			    dpr: 2,
			},
		};
		if (doNotStart) {
			// options.renderer = 'canvas';
			options.loop = false;
			options.autoplay = false;
		}
		this._anim = lottie.loadAnimation(options);
		this._anim.frameRate = 1;
		// window['anim'] = this._anim;
	}

	async setJSON(json, doNotStart, freeMemory, restoreData, playOneLoop) {
		const animData = ((typeof json) == 'string') ? JSON.parse(json) : json;
		await this.setData(animData, doNotStart);

		if (playOneLoop) {
			await this.playOneLoop();
		}
		if (freeMemory) {
			this.free();
			this._restoreData = restoreData;
		}
	}

	async fetch(url) {
	    return new Promise((resolve, reject)=>{
	        var oReq = new XMLHttpRequest;
	        oReq.open("GET", url);
	        oReq.onload = function (oEvent) {
	            resolve(oReq.responseText);
	        };
	        oReq.send();
	    });
	}


	async fetchJSON(url, inflateGzipFunc) {
		let json = null;
		try {
			json = await this.fetch(url);
		} catch(e) {
			console.error(e);
		}
		// console.error(json);

		if (json) {
			await this.setJSON(json);
			return true;
		} else {
			return false;
		}
	}

};

TGS._lottieReadyResolve = null;
TGS._lottieReadyPromise = new Promise((res, rej)=>{
	TGS._lottieReadyResolve = res;
});

if (window.lottie) {
	// it's there already
	TGS._lottieReadyResolve(window.lottie);
} else {
	window['lottieIsReady'] = ()=>{
		TGS._lottieReadyResolve(window.lottie);
	};
}


// console.error('WE are here');
// console.error(window['LOT']);
// window['LOT'] = true;


// if (!window['lottieIsReady'] && TGS._lottieReadyResolve && !TGS._lottieReadyPromise) {
// 	console.log('WAITING');
// 	TGS._lottieReadyResolve = null;
// 	TGS._lottieReadyPromise = new Promise((res, rej)=>{
// 		TGS._lottieReadyResolve = res;
// 	});
// }

// console.log(TGS.rand);
// TGS.rand = Math.random();
// console.log(TGS.rand);


// if (window.lottie) {
// 	// it's there already
// 	if (TGS._lottieReadyResolve) {
// 		TGS._lottieReadyResolve(window.lottie);
// 	} else {
// 		console.error('test');
// 	}
// 	console.log('resolving');
// 	console.log(TGS._lottieReadyPromise);
// } else {
// 	window['lottieIsReady'] = ()=>{
// 		TGS._lottieReadyResolve(window.lottie);
// 		console.log('resolving');
// 		console.log(TGS._lottieReadyPromise);
// 	};
// }


module.exports = TGS;

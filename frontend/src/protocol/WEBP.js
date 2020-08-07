class WEBP {
	constructor() {
    	this._isInitializing = false;
    	this._initializationPromiseResolver = null;
    	this._initializationPromise = new Promise((res,rej)=>{
    		this._initializationPromiseResolver = res;
    	});

    	this._workerPromises = {};
    	this._workerPromisesResolvers = {};

    	this._hasSupport = this.detectSupport();
    	// alert(this._hasSupport);
	}

	detectSupport() {
		// Thanks Rui
		// https://stackoverflow.com/a/27232658/1119169
	    const elem = document.createElement('canvas');
	    if (!!(elem.getContext && elem.getContext('2d'))) {
	        // was able or not to get WebP representation
	        return elem.toDataURL('image/webp').indexOf('data:image/webp') == 0;
	    }

	    // very old browser like IE 8, canvas not supported
	    return false;
	}

	async convert(binary) {
		await this.initializeWorker();
		const id = (''+Math.random()).split('.').join('');
		this._workerPromises[id] = new Promise((res, rej)=>{
			this._workerPromisesResolvers[id] = res;
		});
		this._worker.postMessage({
			id: id,
			binary: binary,
		});

		return await this._workerPromises[id];
	}

	async initializeWorker() {
		if (this._initialized) {
			return true;
		}
		if (this._isInitializing) {
			return await this._initializationPromise;
		}

		this._isInitializing = true;

		this._worker = new Worker('webpworker.js');
		this._worker.onmessage = (event)=>{
			if (event.data && event.data.id) {
				if (this._workerPromisesResolvers[event.data.id]) {
					this._workerPromisesResolvers[event.data.id](event.data);
					delete this._workerPromisesResolvers[event.data.id];
					delete this._workerPromises[event.data.id];
				}
			}
		};

	    this._initializationPromiseResolver(true);
	}



}


module.exports = WEBP;
const EventTarget = require('../utils/EventTarget.js');
const FileCacher = require('../utils/FileCacher.js');

class API extends EventTarget {
	constructor(options) {
	    super();

    	this._app = options.app;
    	this._initialized = false;

    	this._isInitializing = false;
    	this._initializationPromiseResolver = null;
    	this._initializationPromise = new Promise((res,rej)=>{
    		this._initializationPromiseResolver = res;
    	});

    	this._workerPromises = {};
    	this._workerPromisesResolvers = {};

    	this._scope = this.getScope();

    	this._sw = null;

    	// this._mostRecentSWMessage = null;
    	this._docMessages = {};

    	this.FileCacher = FileCacher;

    	this.initialize();
	}

	async initialize() {
		//
		if (!this._app._config.get('persistMediaCache')) {
			// clearing the cache
			await FileCacher.delete();
		}

		/// below we are cleaning sw promises. This is required (for FF)
		let sw = null;

		if (navigator.serviceWorker) {
			if (navigator.serviceWorker.controller) {
				sw = navigator.serviceWorker.controller;
			}
			if (!sw) {
				let registrations = await navigator.serviceWorker.getRegistrations();
				if (registrations[0]) {
					sw = registrations[0].active;
				} else {
					console.warn(registrations);
				}
			}
		} else {
			alert('https required');
		}

		if (sw) {
			sw.postMessage({ command: 'clean' });
		}

		if('serviceWorker' in navigator) {
			navigator.serviceWorker.register('./sw.js', { scope: this._scope })
			    .then((registration)=>{
			    	this._sw = registration.active;
			    	console.log(registration);
			        console.log('Service Worker Registered');

			        navigator.serviceWorker.addEventListener('message', event => {
			        	if (event && event.data) {
			        		console.error('Media | Message from sw', event.data);
			        		// message from sw - event.data
			        		// this._mostRecentSWMessage = event.data;
			        		if (event.data.documentId) {
			        			this._docMessages[event.data.documentId] = event.data;
			        		}

			        		// this.emit('sw', event.data);
			        	}
			        }, false);
			    }, /*catch*/ function(error) {
					console.log('Service worker registration failed:', error);
				});
		}
	}

	async fulfillSWStream(documentId, partN, ab) {
		let sw = this._sw;
		if (!sw && navigator.serviceWorker && navigator.serviceWorker.controller) {
			sw = navigator.serviceWorker.controller;
		}
		if (!sw) {
			let registrations = await navigator.serviceWorker.getRegistrations();
			if (registrations[0]) {
				sw = registrations[0].active;
			} else {
				console.warn(registrations);
			}
		}
		if (sw) {
			console.error({ command: 'fulfill', documentId: documentId, partN: partN, ab: ab })
			sw.postMessage({ command: 'fulfill', documentId: documentId, partN: partN, ab: ab });
		}
	}

	getScope() {
		let scope = window.location.pathname;
		let scopePaths = scope.split('/');
		if (scopePaths[scopePaths.length - 1].indexOf('.')) { // probably the filename
			scopePaths[scopePaths.length - 1] = '';
		}
		scope = scopePaths.join('/');

		return scope;
	}

	normalizeURL(url) {
		url = url.split('./').join('/');
		url = this._scope + url;
		return url.split('//').join('/');
	}

	async removeCache(url) {
		await FileCacher.open(); // @todo: once!
		let murl = this.normalizeURL(url);
		await FileCacher.deleteUrl(murl);
	}

	async getCachedResources(items) {
		await FileCacher.open(); // @todo: once!


		const urls = [];
		const refs = {};
		console.error('loading cached items', items.length);
		for (let i = 0; i < items.length; i++) {
			if (items[i].blobURL) {
				continue;
			}
			// console.error('loading cached', items[i]);
			if (items[i].url !== null) {
				let url = this.normalizeURL(items[i].url);
				urls.push(url);
				if (!refs[url]) {
					refs[url] = [];
				}
				refs[url].push(items[i]);
			}
		}

		// console.error('loading cached', urls);

		// console.error(urls);
		const resps = await FileCacher.matchAll(urls);

		for (let resp of resps) {
			if (!resp) {
				// not cached
			} else if (refs[resp[0]]) {
				let json = null;
				let blob = null;
				let blobURL = null;
				if (resp[1]) {
					if (resp[0].indexOf('.json') != -1) { /// is json
						json = await resp[1].text();
					} else {
						blob = await resp[1].blob();
						blobURL = URL.createObjectURL(blob);
					}
				}
				// console.error(resp[0], blobURL);
				for (let ref of refs[resp[0]]) {
					ref.json = json;
					ref.blobURL = blobURL;
					ref.blob = blob;
					ref.cached = true;
				}
			}
		}

		// console.error(items);

		// 		let cached = await FileCacher.match(url);
		// 		items[i].cached = cached ? true : false;
		// 		if (cached) {
		// 			if (url.indexOf('.json') != -1) {
		// 				/// tgs sticker, fulfill json
		// 				items[i].json = await cached.text();
		// 			} else {
		// 				items[i].blob = await cached.blob();
		// 				items[i].blobURL = URL.createObjectURL(items[i].blob);
		// 			}
		// 		}
		// 	}
		// }

		return items;
	}

	async putToCacheAndForget(options) {
		await FileCacher.open(); // @todo: once!

		let url = this.normalizeURL(options.url);
		const binary = options.binary;

		let contentType = 'image/jpeg';
		if (url.indexOf('.png') != -1) {
			contentType = 'image/png';
		} else if (url.indexOf('.json') != -1) {
			contentType = 'application/json';
		} else if (url.indexOf('.dat') != -1) {
			contentType = 'application/octet-stream';
		}

		const response = new Response(binary, {status: 200, statusText: 'OK', headers: {
			'Content-Type': contentType,
			'Content-Length': binary.byteLength || binary.size,
			'Cache-Control': 'public, max-age: 86400, immutable',
		}});

		let blob = await (response.clone().blob());
// console.error('here444');
		await FileCacher.put(url, response);
// console.error('here5555');

		return blob;
	}

	async putToCacheAndReturnBlob(options) {
		await FileCacher.open(); // @todo: once!

		let url = this.normalizeURL(options.url);
		const binary = options.binary;

		let contentType = 'image/jpeg';
		if (url.indexOf('.png') != -1) {
			contentType = 'image/png';
		} else if (url.indexOf('.json') != -1) {
			contentType = 'application/json';
		} else if (url.indexOf('.dat') != -1) {
			contentType = 'application/octet-stream';
		}

		const response = new Response(binary, {status: 200, statusText: 'OK', headers: {
			'Content-Type': contentType,
			'Content-Length': binary.byteLength || binary.size,
			'Cache-Control': 'public, max-age: 86400, immutable',
		}});

		let blob = await (response.clone().blob());
		await FileCacher.put(url, response);

		return blob;
	}

	async loadRaw(options) {
		await this.initializeWorker();
		const resp = await this.callWorker('loadRaw', options);
		return resp.data;
	}

	async loadImageAndReturnBlobURL(options) {
		await this.initializeWorker();
		const resp = await this.callWorker('loadImageAndReturnBlobURL', options);
		return resp.data;
	}

	async getCountryCode() {
		await this.initializeWorker();
		const resp = await this.callWorker('getCountryCode', {});
		return resp.data;
	}

	async loadFileAndInflate(options) {
		await this.initializeWorker();
		const resp = await this.callWorker('loadFileAndInflate', options);
		return resp.data;
	}

	/**
	 * Invoke API method and cache results. options.max - max lifetime in munutes
	 * @param  {[type]} method  [description]
	 * @param  {Object} params  [description]
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	async invokeAndCache(method, params = {}, options) {
		await FileCacher.open(); // @todo: once!

		// console.error('invokeAndCache | '+method);

		let url = '/tg/ch_'+method+'_'+JSON.stringify(params).replace(/[\W_]+/g,"_")+'.json';
		// console.error('invokeAndCache | '+url);
		let matched = await FileCacher.match(url);
		if (matched) {
			// console.error('invokeAndCache | matched');
			let json = await matched.json();
			if (!json.max || json.max < (new Date).getTime()) {
				return json.data;
			}
		}

		const resp = await this.invoke(method, params, options);
		if (resp && resp.success) {
			const contentType = 'application/json';
			resp.max = (new Date()).getTime() + options.max * 60000;
			const data = JSON.stringify(resp);
			const response = new Response(data, {status: 200, statusText: 'OK', headers: {
				'Content-Type': contentType,
				'Content-Length': data.length,
				'Cache-Control': 'public, max-age: 86400, immutable',
			}});
			// console.error('invokeAndCache | put to cache');
			FileCacher.put(url, response);
		}

		return resp.data;
	}

	async invoke(method, params = {}, options) {
		await this.initializeWorker();
		return await this.callWorker('invoke', {method: method, params: params, options: options});
	}

	async generateSRP(accountPassword, password) {
		await this.initializeWorker();
		// https://core.telegram.org/constructor/account.password
		// https://core.telegram.org/api/srp
		const resp = await this.callWorker('generateSRP', {accountPassword: accountPassword, password: password});
		return resp.data;
	}

	async md5(obj) {
		await this.initializeWorker();
		const resp = await this.callWorker('md5', obj);
		return resp.data;
	}

	async inflate(obj) {
		await this.initializeWorker();
		const resp = await this.callWorker('inflate', obj);
		return resp.data;
	}

	async initializeWorker() {
		if (this._initialized) {
			return true;
		}
		if (this._isInitializing) {
			return await this._initializationPromise;
		}

		this._isInitializing = true;

		this._worker = new Worker('mtworker.js');
		this._worker.onmessage = (event)=>{
			if (event.data && event.data.id) {
				if (this._workerPromisesResolvers[event.data.id]) {
					this._workerPromisesResolvers[event.data.id](event.data);
					delete this._workerPromisesResolvers[event.data.id];
					delete this._workerPromises[event.data.id];
				} else if (event.data.id == 'state') {
					localStorage.setItem('apiState', event.data.state);
				} else if (event.data.id == 'update') {
					// console.error('update', event.data);
					this.emit('update', event.data.update);
				}
			}
		};

		const initialState = localStorage.getItem('apiState');

    	const options = {
    		initialState: initialState,
    		scope: this._scope,
    		cacheName: this._cacheName,
    		test: this._app._config.get('test'),
    		ssl: this._app._config.get('ssl'),
    		persistState: this._app._config.get('persistState'),
    		appId: this._app._config.get('appId'),
    		appHash: this._app._config.get('appHash'),
    		websockets: this._app._config.get('websockets'),
    		defaultDC: this._app._config.get('defaultDC'),
    		keepNotDefaultNetworkers: this._app._config.get('keepNotDefaultNetworkers'),
    	};

    	let success = await this.callWorker('initialize', options);
    	if (success) {
	    	// console.log(success);
	    	this._initializationPromiseResolver(success);
    	} else {
    		// @todo: something same as in protocol.js
    	}
	}

	async callWorker(method, options) {
		const id = (''+Math.random()).split('.').join('');
		const payload = {
			id: id,
			method: method,
			options: options,
		};

		this._workerPromises[id] = new Promise((res, rej)=>{
			this._workerPromisesResolvers[id] = res;
		});

		this._worker.postMessage(payload);
		if (options.timeout) {
			return await Promise.race([new Promise(function(res) { setTimeout(()=>{ res({data: null}); }, options.timeout) }), this._workerPromises[id]]);
		} else {
			return await this._workerPromises[id];
		}
	}

	userData() {
		return localStorage.getItem('apiUserData');
	}

	persistUser(userData) {
		if (!userData) {
			localStorage.removeItem('apiUserData');
		} else {
			localStorage.setItem('apiUserData', userData);
		}
	}

	logout() {
		localStorage.removeItem('apiUserData');
		localStorage.removeItem('apiState');
		localStorage.removeItem('dialogs');

    	document.location = document.location + '?loggedout';
	}

}


module.exports = API;
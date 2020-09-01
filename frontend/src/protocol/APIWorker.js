const teleweb = require('teleweb');
const FileCacher = require('../utils/FileCacher.js');

let initialized = false;
let invoke = null;

let storage = {
	state: '',
	user: ''
};

let localConfig = {};

const queryableFunctions = {
	loadRaw: async function(options) {
		const {params} = options;

    	console.info('API Q File RAW:', options);

    	// params.api_id = localConfig.appId;
    	// params.api_hash = localConfig.appHash;

    	try {
	    	let resp = await invoke('upload.getFile', params, options.options || {});
	    	return resp.bytes;
	    } catch(e) {}

	    return null;
	},
	currentDC: async function() {
		try {
			let state = JSON.parse(storage.state);
			return parseInt(''+state.current_dc_id, 10);
		} catch(e) { return null; }
	},
	activeNetworkers: async function() {
		return teleweb.activeNetworkers();
	},
	loadImageAndReturnBlobURL: async function(options) {
		const {url, params} = options;

    	console.info('API Q File:', options);

    	// params.api_id = localConfig.appId;
    	// params.api_hash = localConfig.appHash;

    	try {
	    	let resp = await invoke('upload.getFile', params, options.options || {});
			if (resp && resp.bytes) {
		    	console.info('API Res File length:', resp.bytes.byteLength);
		    	await FileCacher.open();
				// const cache = await caches.open(localConfig.cacheName);

	    		let resUrl = url;
				resUrl = resUrl.split('./').join('/');
				resUrl = localConfig.scope + resUrl;
				resUrl = resUrl.split('//').join('/');

				let contentType = 'image/jpeg';
				if (resUrl.indexOf('.png') != -1) {
					contentType = 'image/png';
				} else if (resUrl.indexOf('.json') != -1) {
					contentType = 'application/json';
				} else if (resUrl.indexOf('.dat') != -1) {
					contentType = 'application/octet-stream';
				}

				const response = new Response(resp.bytes, {status: 200, statusText: 'OK', headers: {
					'Content-Type': contentType,
					'Content-Length': resp.bytes.byteLength || resp.bytes.size,
					'Cache-Control': 'public, max-age: 86400, immutable',
				}});

				let blob = await (response.clone().blob());
				FileCacher.put(resUrl, response);
				// cache.put(resUrl, response);
				return URL.createObjectURL(blob);
			}
    	} catch(e) {
    		if (e && e.type && (''+e.type).indexOf('_REFERENCE') != -1) {
    			// false on file_reference error, null on others
    			return false;
    		}
    	}

		return null;
	},
	loadFileAndInflate: async function(options) {
		const {url, params} = options;

    	// params.api_id = localConfig.appId;
    	// params.api_hash = localConfig.appHash;

    	try {
	    	let resp = await invoke('upload.getFile', params, options.options || {});
			if (resp && resp.bytes) {
				await FileCacher.open();
				// const cache = await caches.open(localConfig.cacheName);

	    		let resUrl = url;
				resUrl = resUrl.split('./').join('/');
				resUrl = localConfig.scope + resUrl;
				resUrl = resUrl.split('//').join('/');

				let contentType = 'image/jpeg';
				if (resUrl.indexOf('.png') != -1) {
					contentType = 'image/png';
				} else if (resUrl.indexOf('.json') != -1) {
					contentType = 'application/json';
				} else if (resUrl.indexOf('.dat') != -1) {
					contentType = 'application/octet-stream';
				}

				let data = teleweb.inflateObj(resp.bytes);

				const response = new Response(data, {status: 200, statusText: 'OK', headers: {
					'Content-Type': contentType,
					'Content-Length': data.byteLength || data.size || data.length,
					'Cache-Control': 'public, max-age: 86400, immutable',
				}});

				FileCacher.put(resUrl, response);
				// cache.put(resUrl, response);

				return data;
			}
    	} catch(e) {
    	}

		return null;
	},
	getCountryCode: async function() {
		const ndc = teleweb.getNearestDc();
		return ((ndc && ndc.country) ? ndc.country : null);
	},
    initialize: async function(config) {
    	localConfig = config;
    	if (localConfig.initialState) {
    		storage.state = localConfig.initialState;
    	}

    	// try to initialize teleweb library and get info about signed in user
        let fullUser = await teleweb.init(config, state => new Promise((resolve, reject) => {
        			storage.state = state;
					const payload = {
						id: 'state',
						state: state,
						success: true,
					};
					postMessage(payload);
		        	// localStorage.setItem('workerTeleState', state);
		        }),() => new Promise((resolve, reject) => {
		        	if (storage.state) {
		        		resolve(storage.state);
		        	} else {
		        		resolve({});
		        	}
				}), 'debug');

        console.info('API initialization result', fullUser);
        let localUserData = storage.user;

        teleweb.setUpdatesCallback((updateObject)=>{
			const payload = {
				id: 'update',
				update: updateObject,
				success: true,
			};
			postMessage(payload);
        });

        // if user is not signed in, but there's session, flush it
        if (!fullUser && (localUserData && localUserData != 'null')) {
        	storage.state = '';
        	storage.user = '';
        	initialized = false;

        	return false;
        }

        initialized = true;
        invoke = teleweb.mtpInvokeApi;

        return true;
    },
    invoke: async function(options) {
    	const {method, params} = options;

    	// params.api_id = localConfig.appId;
    	// params.api_hash = localConfig.appHash;

    	console.info('API Q:', method, params);
    	let cid = Math.random();
    	console.time('API | invoke_'+method+'_'+cid);
    	let resp = await invoke(method, params, options.options || {});
    	console.timeEnd('API | invoke_'+method+'_'+cid);
    	console.info('API Resp:', resp);

    	return resp;
    },
    generateSRP: async function(options) {
    	const {accountPassword, password} = options;

		const srp = new teleweb.SRPGenerator(accountPassword);
		return await srp.getInputCheckPasswordSRP(password);
    },
    inflate: async function(data) {
    	return teleweb.inflateObj(data);
    },
    md5: async function(data) {
    	return teleweb.MD5(data);
    },
};

onmessage = function(e) {
	// console.log('Worker: Message received from main script', e);
	const {id, method, options} = e.data;

	if (queryableFunctions[method]) {
		queryableFunctions[method](options)
			.then((data)=>{
				const payload = {
					data: data,
					success: true,
					id: id,
				};
				postMessage(payload);
			})
			.catch((e)=>{
				console.error(e);
				const payload = {
					id: id,
					data: e,
					success: false,
				};
				postMessage(payload);
			});
	}
}
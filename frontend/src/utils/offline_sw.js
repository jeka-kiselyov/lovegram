var window = self;
//self.importScripts('mtponly.js');

const version = "0.0.1";
const cacheName = `lovegram-0.0.1`;
const config = require('../config/config.js');

const FileCacher = require('./FileCacher.js');


let wPromises = {};
let wPromisesResolvers = {};

// let theCache = null;
const reopenTheCache = async function() {
	// console.time('reopenTheCache');
	await FileCacher.open(true); // force reopen
	// console.timeEnd('reopenTheCache');
};

let memoryCache = {};
const extensionsToKeepInMemory = ['css', 'js', 'woff2', 'llic', 'json', 'o.png', 'bg.jpg', 'ico', 'callback'];

self.addEventListener('install', e => {
	e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
	// console.log('sw activated');
	event.waitUntil(self.clients.claim());
});

let streamPromises = {};
let streamPromiseResolvers = {};

const postMessageToClient = async function(event, msg) {
	// console.error('Media | Sending message to clients', msg);
    if (!event.clientId) return;
    const client = await clients.get(event.clientId);
    if (!client) return;
	// console.error('Media | Sending message to client', event.clientId, msg);
	// console.error('sending msg to clients', msg);
	client.postMessage(msg);
	// self.clients.matchAll().then(clients => {
	// console.error(clients);
	// 	// clients.forEach(client => client.postMessage(msg));
	// })
};

const fetchObject = async function(event) {
	await FileCacher.open();
	// let gCache = await caches.open(cacheName);
	let response = null;

	let workWithMemory = false;
	if (event.request.url.slice(-1) == '/') {
		workWithMemory = true;
	} else {
		for (let ext of extensionsToKeepInMemory) {
			if (event.request.url.indexOf(ext) != -1) {
				workWithMemory = true;
			}
		}
	}

	if (!workWithMemory) {
		// console.time(event.request.url);
		response = await FileCacher.match(event.request.url, {ignoreSearch: true});
		// console.timeEnd(event.request.url);
	}

	if (workWithMemory && memoryCache[event.request.url] && config.persistServiceWorkerCache) {
		return memoryCache[event.request.url].clone();
	}

	if (event.request.url.indexOf('/tg/svideo/') != -1) {
		// console.log('Media | Range request');
		// streaming video
		let pos = 0;
		let till = null;

		try {
			const hBytes = /^bytes\=(\d+)\-(\d+)?$/g.exec(
				event.request.headers.get('range')
		    );
		    pos = Number(hBytes[1]);
		    till = Number(hBytes[2]) || null;
			// pos = Number(/^bytes\=(\d+)\-$/g.exec(event.request.headers.get('range'))[1]);
		} catch(e) {
			pos = 0;
		}

// https://philna.sh/blog/2018/10/23/service-workers-beware-safaris-range-request/

	    // console.log('Media | Range request for', event.request.url, ', starting position:', pos);

	    let partN = Math.floor( pos / (512*1024) );
	    // console.log('Media | Looking for part n', partN);

	    let documentId = event.request.url.split('_')[1].split('_')[0]; // @todo: check
	    // console.log('Media | Looking for document', documentId);

	    let posInPart = pos - partN * (512*1024);
	    let tillInPart = null;
	    if (till) {
	    	tillInPart = till - partN * (512*1024);
	    	if (tillInPart > 512*1024 - 1) {
	    		tillInPart = 512*1024 - 1;
	    	}
	    }
	    // let tillInPart = till - partN * (512*1024);

	    // console.log('Media | Going to cut part at ', posInPart);
	    // console.log('Media | Going to cut part end at ', tillInPart);

	    let scopePrefix = event.request.url.split('/tg/svideo/')[0];

	    let partURL = scopePrefix+'/tg/doc_'+documentId+'_part_'+partN+'.dat';
	    // console.log('Media | Looking for part', partURL);

	    let totalSize = event.request.url.split('_stream_')[1].split('.')[0];

	    let ab = null;
	    let partResponse = await FileCacher.match(partURL);
	    if (!partResponse) {
		    let promiseId = 'sp'+documentId+'_'+partN;
		    if (!streamPromises[promiseId]) {
		    	streamPromises[promiseId] = new Promise((res)=>{
		    		streamPromiseResolvers[promiseId] = res;
		    	});

			    event.waitUntil(postMessageToClient(event, { command: 'waitfor', documentId: documentId, partN: partN }));
		    } else {
		    	// console.error('Media | There is promise already', promiseId);
		    }

		    // console.log('Media | No cached. Waiting for promise ', promiseId);

		    ab = await streamPromises[promiseId];

		    // console.log('Media | No cached. Waiting for promise fullfiled ', promiseId);

			// console.time('theCache.match');
			if (!ab) {
			    console.error('sw | lookin in cache ');
			    partResponse = await FileCacher.match(partURL);
			} else {
				console.error('sw | got ab', ab, partN);
			}
			// console.timeEnd('theCache.match');
	    }

	    // console.log('Media | Response from cache', partResponse);
	    if (partResponse || ab) {
	    	if (!ab) {
		    	ab = await partResponse.arrayBuffer();
	    	}

	    	let contentType = 'video/mp4';
	    	if (event.request.url.indexOf('.ogg') != -1) {
	    		contentType = 'audio/ogg';
	    	} else if (event.request.url.indexOf('.mp3') != -1) {
	    		contentType = 'audio/mpeg';
	    	}

	    	let abLength = ab.byteLength;
	    	let sentBytes = abLength - posInPart;

	    	let sliced = null;
	    	if (tillInPart) {
	    		sliced = ab.slice(posInPart, tillInPart+1);
	    		sentBytes = tillInPart - posInPart + 1;
	    	} else {
	    		sliced = ab.slice(posInPart);
	    	}

	    	let crHeader = 'bytes ' + pos + '-' + (sentBytes + pos - 1) + '/' + totalSize;
	    	// console.log('Media | sentBytes', sentBytes, 'byteLength', sliced.byteLength);
	    	// console.log('Media | ', crHeader);

	    	// let status = 206;
	    	// let datatos = ab.slice(posInPart);
	    	// if (partN == 1505) {
	    	// 	status = 200;
	    	// 	datatos = new ArrayBuffer(529288);
	    	// }

	   //  	let respo = new Response(
				// datatos,
				// {
				// 	status: status,
				// 	statusText: 'Partial Content',
				// 	headers: [
				// 		['Content-Type', contentType],
				// 		['Content-Range', crHeader ],
				// 		['Content-Length', sentBytes],]
				// });
	    	// console.error('Media | ', ab.slice(posInPart));
	    	// console.error('Media | ', respo);
	    	// console.error('Media | ', respo.headers.entries());

	    	// console.log(crHeader);
	    	// console.log(sliced);

	    	return new Response(
				sliced,
				{
					status: 206,
					statusText: 'Partial Content',
					headers: [
						['Content-Type', contentType],
						['Content-Range', crHeader ],
						['Content-Length', sliced.byteLength ],
						]
				});
	    } else {

	    	// console.error('Media | Sending blank');
	    	// ask client to try this url little later
	    	return new Response(
				new ArrayBuffer(1),
				{
					status: 302,
					statusText: 'Found',
					headers: []
				});;
	    }

	} else 	if (!response && event.request.url.indexOf('/tg/') != -1) {
		// creating the promise waiting for resource to be cached
		let promiseId = event.request.url.split('/tg/')[1];
		if (!wPromises[promiseId]) {
			wPromises[promiseId] = new Promise((resolve, reject)=>{
				wPromisesResolvers[promiseId] = resolve;
			});
		}

		// resolving it on timeout
		setTimeout(()=>{
			if (wPromisesResolvers[promiseId]) {
				wPromisesResolvers[promiseId](false);
			}
		}, 20000);

		// waiting for it
		let success = await wPromises[promiseId];
		response = await FileCacher.match(event.request, {ignoreSearch: true});

		return response;
	} else if (response) {
		return response;
	} else {
		if (workWithMemory && config.persistServiceWorkerCache) {
			memoryCache[event.request.url] = await fetch(event.request);
			return memoryCache[event.request.url].clone();
		} else {
			return await fetch(event.request);
		}
	}

};

self.addEventListener('fetch', function(event) {
	event.respondWith(fetchObject(event));
	// console.error(event);
	// fetchObject(event).then((response)=>{
	// console.error(response);
	// console.error(event);
	// 			event.respondWith(new Promise((res)=>{ res(response); }));
	// console.error(event);
	// });


	// let n = new Promise((res,rej)=>{
	// 	fetchObject(event)
	// 		.then((response)=>{
	// 			console.error(response);
	// 			event.respondWith(new Promise((res)=>{ res(response); }));
	// 			// console.error('resolved', response);
	// 			// self.clients.matchAll().then(clients => {
	// 			// 	console.error(clients);
	// 			// });
	// 			// res(response);
	// 		})
	// 		.catch((e)=>{
	// 			console.error(e);
	// 		});
	// });

	// n();
	// let fo = fetchObject(event);
	// console.error('fo', fo);
	// try {
	// 	let res = event.respondWith(n);
	// } catch(e) {
	// 	console.error(e);
	// }
});

// self.addEventListener('fetch', event => {
// 	let gCache = null;
// 	event.respondWith(
// 		caches.open(cacheName)
// 			.then(cache => {
// 				gCache = cache;
// 				return gCache.match(event.request, {ignoreSearch: true});
// 			})
// 			.then(response => {
// 				// console.warn('sw', response);
// 				// console.warn('sw', event.request);
// 				if (!response && event.request.url.indexOf('/tg/') != -1) {
// 					// expected TG media resource, but it's not yet loaded
// 					// console.log("expected TG media resource, but it's not yet loaded", event.request.url);
// 					let promiseId = event.request.url.split('/tg/')[1];
// 					if (!wPromises[promiseId]) {
// 						wPromises[promiseId] = new Promise((resolve, reject)=>{
// 							wPromisesResolvers[promiseId] = resolve;
// 						});
// 					}

// 					return new Promise((res, rej)=>{
// 						wPromises[promiseId]
// 							.then((s)=>{

// 								// setTimeout(()=>{

// 									caches.open(cacheName)
// 										.then(cache => {
// 												cache.match(event.request, {ignoreSearch: true})
// 													.then(response => {
// 														// console.warn(promiseId);
// 														// console.warn(response);
// 														res(response);
// 													});
// 									});


// 								// },5000);

// 								console.error(s);
// 							});
// 						setTimeout(()=>{
// 							wPromisesResolvers[promiseId](false);
// 						},20000);
// 					});
// 				} else {
// 					return response || fetch(event.request);
// 				}
// 		})
// 	);
// });

self.addEventListener('message', event => {
	console.log('sw message');
	console.log(event);

	if (event && event.data) {
		if (event.data.command == 'clean') {
			// console.error('Media | SW Startup Clean');
			// console.error(wPromisesResolvers);
			// console.error(wPromises);
			// console.error(streamPromiseResolvers);
			// console.error(streamPromises);
			// clean promises (run for every page load)
			for (let k in wPromisesResolvers) {
				// console.error('Media | Clearing promise', k);
				wPromisesResolvers[k](null);
			}
			for (let k in streamPromiseResolvers) {
				// console.error('Media | Clearing promise', k);
				streamPromiseResolvers[k](null);
			}

			wPromises = {};
			wPromisesResolvers = {};
			streamPromiseResolvers = {};
			streamPromises = {};
		} else if (event.data.command == 'put') {
			// put media object to cache
			FileCacher.open()
				.then(cache => {
					let promiseId = event.data.cache_id+'.'+event.data.ext;
					let fileName = (event.data.scope ? event.data.scope : '')+'/tg/'+promiseId;
					fileName = fileName.split('//').join('/');

					let contentType = 'image/jpeg';
					if (event.data.ext == 'png') {
						contentType = 'image/png';
					} else if (event.data.ext == 'json') {
						contentType = 'application/json';
					}

					const response = new Response(event.data.binary, {status: 200, statusText: 'OK', headers: {
						'Content-Type': contentType,
						'Content-Length': event.data.binary.byteLength || event.data.binary.size,
						'Cache-Control': 'public, max-age: 86400, immutable',
						'ETag': fileName,
					}});

					FileCacher.put(fileName, response)
						.then(()=>{
							reopenTheCache().
								then(()=>{
									if (wPromisesResolvers[promiseId]) {
										wPromisesResolvers[promiseId](true);
									}
								});
						});
				});
		} else if (event.data.command == 'mtp') {
			// initialize mtproto library and auth to the server
		} else if (event.data.command == 'fulfill') {
			// fullfill stream part
			let documentId = event.data.documentId;
			let partN = event.data.partN;
			let promiseId = 'sp'+documentId+'_'+partN;

			console.log('Media | ', event.data);

			let fulfill = function(pId) {
				if (event.data.ab) {
					if (streamPromiseResolvers[pId]) {
					    console.log('fulfill promise ', pId);
						streamPromiseResolvers[pId](event.data.ab);
					}
				} else {
					reopenTheCache()
						.then(()=>{
							// console.log(streamPromiseResolvers);

							if (streamPromiseResolvers[pId]) {
							    // console.log('fulfill promise ', pId);
								streamPromiseResolvers[pId]();
							}
						});
				}
			}

			fulfill(promiseId);
		}
	}
});


// console.log('sw script loaded');


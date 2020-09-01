const EventTarget = window.classes.EventTarget;
const WEBP = require('../protocol/WEBP.js');

class MediaManager extends EventTarget {
	constructor(params = {}) {
		super();

		this._app = params.app;

		this._user = params.user;
		this._user._mediaManager = this;
		this._storage = params.storage;

		/// data for stripped images decoding
		this._header8 = Uint8Array.from([255,216,255,224,0,16,74,70,73,70,0,1,1,0,0,1,0,1,0,0,255,219,0,67,0,40,28,30,35,30,25,40,35,33,35,45,43,40,48,60,100,65,60,55,55,60,123,88,93,73,100,145,128,153,150,143,128,140,138,160,180,230,195,160,170,218,173,138,140,200,255,203,218,238,245,255,255,255,155,193,255,255,255,250,255,230,253,255,248,255,219,0,67,1,43,45,45,60,53,60,118,65,65,118,248,165,140,165,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,248,255,192,0,17,8,0,0,0,0,3,1,34,0,2,17,1,3,17,1,255,196,0,31,0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,255,196,0,181,16,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,125,1,2,3,0,4,17,5,18,33,49,65,6,19,81,97,7,34,113,20,50,129,145,161,8,35,66,177,193,21,82,209,240,36,51,98,114,130,9,10,22,23,24,25,26,37,38,39,40,41,42,52,53,54,55,56,57,58,67,68,69,70,71,72,73,74,83,84,85,86,87,88,89,90,99,100,101,102,103,104,105,106,115,116,117,118,119,120,121,122,131,132,133,134,135,136,137,138,146,147,148,149,150,151,152,153,154,162,163,164,165,166,167,168,169,170,178,179,180,181,182,183,184,185,186,194,195,196,197,198,199,200,201,202,210,211,212,213,214,215,216,217,218,225,226,227,228,229,230,231,232,233,234,241,242,243,244,245,246,247,248,249,250,255,196,0,31,1,0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,255,196,0,181,17,0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,119,0,1,2,3,17,4,5,33,49,6,18,65,81,7,97,113,19,34,50,129,8,20,66,145,161,177,193,9,35,51,82,240,21,98,114,209,10,22,36,52,225,37,241,23,24,25,26,38,39,40,41,42,53,54,55,56,57,58,67,68,69,70,71,72,73,74,83,84,85,86,87,88,89,90,99,100,101,102,103,104,105,106,115,116,117,118,119,120,121,122,130,131,132,133,134,135,136,137,138,146,147,148,149,150,151,152,153,154,162,163,164,165,166,167,168,169,170,178,179,180,181,182,183,184,185,186,194,195,196,197,198,199,200,201,202,210,211,212,213,214,215,216,217,218,226,227,228,229,230,231,232,233,234,242,243,244,245,246,247,248,249,250,255,218,0,12,3,1,0,2,17,3,17,0,63,0]);
		this._footer8 = Uint8Array.from([ 255, 217 ]);

		/// promises for single proccess downloads
		this._downloadPromises = {};
		this._downloadPromiseResolvers = {};

		///
		this._serversHeated = {};

		this._webp = new WEBP();

		this._parallelC = this._app._config.get('maxParallelConnections');
	}

	async getVideoPreview(messageMedia) {
		const url = './tg/'+messageMedia._id+'_preview.jpg';
		return await this._user._protocol.matchGetBlob(url);
	}

	async saveVideoPreview(messageMedia, blob) {
		const url = './tg/'+messageMedia._id+'_preview.jpg';
		this._user._protocol.putToCacheAndForget({url: url, binary: blob, lazy: true});
	}

	async uploadPhoto(bytes, filename) {
		console.error('uploading photo', bytes, filename);

		let randomFileId = (''+Math.random()).split('.').join('').split('0').join('1');
		let uploadedParts = 0;
		let md5 = await this._user._protocol.md5(bytes);

		const currentDC = await this._user._protocol.currentDC();

		const maxPartSize = 512*1024;
		const fileSize = bytes.length;
		let promises = [];

		for (let currentPart = 0; currentPart*maxPartSize < fileSize; currentPart++) {
			const options = {
				"file_id": randomFileId,
				"file_part": 0,
				"bytes": []
			};

			options.file_part = currentPart;
			options.bytes = bytes.subarray(currentPart*maxPartSize, (currentPart+1)*maxPartSize);

			const dcId = currentDC + 1000 * (currentPart % this._parallelC + 1);
			promises.push(this._user.invoke('upload.saveFilePart', options, {dcId: dcId}));
			// const resp = await this._user.invoke('upload.saveFilePart', options);
			// console.warn(resp);
			if (promises.length >= this._parallelC) {
				await Promise.all(promises);
				promises = [];
			}

			uploadedParts++;
		}

		await Promise.all(promises);

		return {
			"_": "inputFile",
			"parts": uploadedParts,
			"id": randomFileId,
			"name": filename,
			"md5_checksum": md5
		};
	}

	decodeStrippedPhoto(bytes) {
	    if (bytes && bytes.name != 'Uint8Array' && bytes[0] !== undefined) {
	    	// from JSON
	    	let a = [];
	    	let i = 0;
	    	while (bytes[i] || bytes[i] === 0) {
	    		a.push(bytes[i]);
	    		i++;
	    	}
	    	bytes = new Uint8Array(a);
	    }
		// https://github.com/telegramdesktop/tdesktop/blob/bec39d89e19670eb436dc794a8f20b657cb87c71/Telegram/SourceFiles/ui/image/image.cpp#L225
		// https://github.com/thelightningseas/tg-weather/blob/9cde9563c610012b09cf5e0219d93cb1667ff450/venv/Lib/site-packages/telethon/utils.py#L1160
	    if (!bytes || bytes.byteLength < 3 || bytes[0] != 1) {
	    	return bytes;
	    }


	    // if (bytes.name != 'Uint8Array' && bytes[0] && bytes[0] == 1) {
	    // 	// from JSON
	    // 	let a = [];
	    // 	let i = 0;
	    // 	while (bytes[i] || bytes[i] === 0) {
	    // 		a.push(bytes[i]);
	    // 		i++;
	    // 	}
	    // 	bytes = new Uint8Array(a);
	    // }

		const out = new Uint8Array(bytes.byteLength + this._header8.byteLength - 3 + 2);
		const headerLength = this._header8.byteLength;
		out.set(this._header8);
		out[164] = bytes[1];
		out[166] = bytes[2];
		out.set(bytes, headerLength - 3);

		out[headerLength - 3] = this._header8[headerLength - 3];
		out[headerLength - 2] = this._header8[headerLength - 2];
		out[headerLength - 1] = this._header8[headerLength - 1];

		out[out.byteLength - 2] = this._footer8[0];
		out[out.byteLength - 1] = this._footer8[1];

		return out;
	}

	async heatServersUp(apiDocument) {
		let dcId = apiDocument.dc_id;
		if (this._serversHeated[dcId]) {
			return;
		}

		// console.time('heating up servers');

		// establish connections to media servers for this document
		this._serversHeated[dcId] = true;
		console.error(dcId);

		let an = await this._user._protocol.activeNetworkers();
		let conn = false;
		for (let a of an) {
			if (a == dcId) {
				// already connected to it
				conn = true;
			}
		}

		if (!conn) {
			await this._user.invoke('help.getSupport', {}, {dcId: dcId});
		}

		let ps = [];
		for (let i = 1; i <= this._parallelC; i++) {
			ps.push(this._user.invoke('help.getSupport', {}, {dcId: (1000*i + dcId)}));
		}
		await Promise.all(ps);

		// console.timeEnd('heating up servers');
	}

	async loadFilePartAndReturnAB(apiDocument, partN, peerMessage) {
		const cacheKey = 'doc_'+apiDocument.id+'_part_'+partN;

		let chunkSize = 512*1024;
		let params = {
			"precise": 0,
			"limit": chunkSize,
			"offset": partN * chunkSize,
		};
		params.location = {
			"_": "inputDocumentFileLocation",
			"access_hash": apiDocument.access_hash,
			"file_reference": apiDocument.file_reference,
			"id": apiDocument.id
		};

		let options = {};
		options.dcId = apiDocument.dc_id + 1000 * (partN % this._parallelC + 1); // max 3 parallel sockets

		// console.time('Media | invoke_'+cacheKey);
		let resp = await this._user.invoke('upload.getFile', params, options);
		// console.timeEnd('Media | invoke_'+cacheKey);
		// console.error(resp);
		// console.error(resp.data);

		// console.error(resp, peerMessage);

		if (!resp.success && resp.data.type && resp.data.type.indexOf('FILE_REFERENCE_') != -1 && peerMessage) { // file reference error and we have peerMessage to update it
			await this.updateFileReferences(peerMessage, apiDocument);
			params.location.file_reference = apiDocument.file_reference;
			resp = await this._user.invoke('upload.getFile', params, options);
		}

		if (resp && resp.data && resp.data.bytes) {
			// console.time('Media | put_'+cacheKey);
			// console.error('Media | put_'+cacheKey);
			let ab = resp.data.bytes.buffer.slice(resp.data.bytes.byteOffset, resp.data.bytes.byteLength + resp.data.bytes.byteOffset);
			// this._user._protocol.putToCacheAndForget({binary: resp.data.bytes, url: './tg/'+cacheKey+'.dat'});

			return ab;
			// let blob = await this._user._protocol.putToCacheAndForget({binary: resp.data.bytes, url: './tg/'+cacheKey+'.dat'});
			// console.timeEnd('Media | put_'+cacheKey);
			// return blob;
		} else {
			console.error(resp);
		}

		// await new Promise((res)=>{ setTimeout(res, 50000); });

		return null;
	}


	async loadStickerAndReturn(apiDocument) {
		// @todo: need to update file_reference here?

		const cacheKey = 'sticker_'+apiDocument.id;

		const params = {
			location: {
				"_": "inputDocumentFileLocation",
				"access_hash": apiDocument.access_hash,
				"file_reference": apiDocument.file_reference,
				"id": apiDocument.id,
			},
			"precise": 0,
			"limit": 1024 * 1024, // 1MB?
			"offset": 0
		};

		// console.error(params);

		let options = {};
		options.dcId = apiDocument.dc_id;

		let url = './tg/'+cacheKey+'.json';
		if (apiDocument.mime_type != 'application/x-tgsticker') {
			params.location.thumb_size = 's';
			url = './tg/'+cacheKey+'.png';

			if (!this._webp._hasSupport) {
				let binary = await this._user._protocol.loadRaw({url, params: params, options: options, timeout: 5000});

				let png = await this._webp.convert(binary);
				// console.error(png);

				const response = new Response(png.data, {status: 200, statusText: 'OK', headers: {
					'Content-Type': 'image/png',
					'Content-Length': png.data.length,
					'Cache-Control': 'public, max-age: 86400, immutable',
				}});

				this._user._protocol.putToCacheAndForget({url: url, binary: png.data});

				let blob = await (response.blob());
				return URL.createObjectURL(blob);
			} else {
				let blobURL = await this._user._protocol.loadImageAndReturnBlobURL({url: url, params: params, options: options, timeout: 5000});
				return blobURL;
			}

		} else {
			let json = await this._user._protocol.loadFileAndInflate({url: url, params: params, options: options, timeout: 5000});
			return json;
		}
	}

	async updateFileReferences(peerMessage, apiObject) {
		let m = 'messages.getMessages';
		const params = {};
		if (peerMessage._peer._type == 'channel') {
			m = 'channels.getMessages';
			params.channel =  {
				"_": "inputChannel",
				"channel_id": peerMessage._peer._apiObject.id,
				"access_hash": peerMessage._peer._apiObject.access_hash,
			};
		}

		params.id = [{_: 'inputMessageID', id: peerMessage._id}];

		const resp = await this._user.invoke(m, params);
		// console.error(resp);

		try {
			let m = resp.data.messages[0];
			// let is = ['photo', 'document'];
			// for (let i of is) {
			// 	if (m[i] && m[i].file_reference) {
			// 		apiObject.file_reference = m[i].file_reference;
			// 		return true;
			// 	}
			// }
			const doTry = (where)=>{
				if (where && where.file_reference) {
					apiObject.file_reference = where.file_reference;
					return true;
				}
			}
			doTry(m.media.photo);
			doTry(m.media.document);
			doTry(m.media.webpage.photo);
		} catch(e) { return false; };

		return false;
	}

	async loadPreviewAndReturnBlobURL(photoApiObject, size, peerMessage, dcShift) {
		let cacheKey = 'message_photo_'+photoApiObject.id;
		if (size) {
			cacheKey += ('_'+size);
		}

		let params = {
			"precise": 0,
			"limit": 512 * 1024,
			"offset": 0,
		};

		let options = {};

		if (photoApiObject._ == 'photo') {
			params.location = {
				"_": "inputPhotoFileLocation",
				"access_hash": photoApiObject.access_hash,
				"thumb_size": 'm', // https://core.telegram.org/constructor/photoSize
				"file_reference": photoApiObject.file_reference,
				"id": photoApiObject.id
			};
		} else if (photoApiObject._ == 'document') {
			params.location = {
				"_": "inputDocumentFileLocation",
				"access_hash": photoApiObject.access_hash,
				"thumb_size": 'm', // https://core.telegram.org/constructor/photoSize
				"file_reference": photoApiObject.file_reference,
				"id": photoApiObject.id
			};
		}

		if (size) {
			params.location.thumb_size = size;
		}

		options.dcId = photoApiObject.dc_id;
		if (dcShift) {
			// console.error('shifting dc');
			options.dcId += (1000 * (dcShift % this._parallelC + 1)); // shifting datacenter to media one
		}

		let blobURL = await this._user._protocol.loadImageAndReturnBlobURL({url: './tg/'+cacheKey+'.jpg', params: params, options: options});
		if (blobURL === false && peerMessage) { // file reference error and we have peerMessage to update it
			await this.updateFileReferences(peerMessage, photoApiObject);
			return await this.loadPreviewAndReturnBlobURL(photoApiObject, size);
		}

		if (!blobURL) {
			params.location.thumb_size = 'm';
			blobURL = await this._user._protocol.loadImageAndReturnBlobURL({url: './tg/'+cacheKey+'.jpg', params: params, options: options});
		}

		return blobURL;
	}

	async flushPeerAvatar(peer) {
		let cacheKey = 'avatar_peer_'+peer._id;
		if (peer._type == 'user') {
			// cache user avatar as user's dialog avatar
			cacheKey = 'avatar_peer_dialog_'+peer._id;
		}

		if (this._downloadPromises[cacheKey]) {
			delete this._downloadPromises[cacheKey];
		}

		await this._user._protocol.removeCache('./tg/'+cacheKey+'.png');

		return true;
	}

	async getPeerAvatarAndReturnBlobURL(peer) {
		let cacheKey = 'avatar_peer_'+peer._id;
		if (peer._type == 'user') {
			// cache user avatar as user's dialog avatar
			cacheKey = 'avatar_peer_dialog_'+peer._id;
		}

		if (this._downloadPromises[cacheKey]) {
			return await this._downloadPromises[cacheKey];
		}

		this._downloadPromises[cacheKey] = new Promise((res)=>{
			this._downloadPromiseResolvers[cacheKey] = res;
		});

		const inCache = await this._user._protocol.getCachedResources([{url: './tg/'+cacheKey+'.png'}]);
		if (inCache && inCache[0] && inCache[0].blobURL) {
			this._downloadPromiseResolvers[cacheKey](inCache[0].blobURL);
			return inCache[0].blobURL;
		}

		const options = {};

		const params = {
			location: {
				"_": "inputFileLocation",
				"volume_id": 0,
				"local_id": 0
			},
			"precise": 0,
			"limit": 512 * 1024,
			"offset": 0
		};

		params.location = {
			"_": "inputPeerPhotoFileLocation",
			"big": 0,
			"peer": null,
			"volume_id": 0,
			"local_id": 0
		};

		if (peer._apiObject.photo && peer._apiObject.photo.photo_small) {
			if (peer._type == 'chat') {
				params.location.volume_id = peer._apiObject.photo.photo_small.volume_id;
				params.location.local_id = peer._apiObject.photo.photo_small.local_id;
				params.location.peer = {
					"_": "inputPeerChat",
					"chat_id": peer._apiObject.id
				};

				options.dcId = peer._apiObject.photo.dc_id;
			} else if (peer._type == 'channel') {
				params.location.volume_id = peer._apiObject.photo.photo_small.volume_id;
				params.location.local_id = peer._apiObject.photo.photo_small.local_id;
				params.location.peer = {
					"_": "inputPeerChannel",
					"channel_id": peer._apiObject.id,
					"access_hash": peer._apiObject.access_hash
				};

				options.dcId = peer._apiObject.photo.dc_id;
			} else if (peer._apiObject && peer._apiObject._ == 'user') {
				params.location.volume_id = peer._apiObject.photo.photo_small.volume_id;
				params.location.local_id = peer._apiObject.photo.photo_small.local_id;
				params.location.peer = {
					"_": "inputPeerUser",
					"user_id": peer._apiObject.id,
					"access_hash": peer._apiObject.access_hash
				};

				options.dcId = peer._apiObject.photo.dc_id;
			}
		} else {
			// console.log(peer._peerUser._apiObject);
			if (peer._type == 'dialog' && peer._peerUser && peer._peerUser._apiObject && peer._peerUser._apiObject.photo) {
				params.location.volume_id = peer._peerUser._apiObject.photo.photo_small.volume_id;
				params.location.local_id = peer._peerUser._apiObject.photo.photo_small.local_id;
				params.location.peer = {
					"_": "inputPeerUser",
					"user_id": peer._peerUser._apiObject.id,
					"access_hash": peer._peerUser._apiObject.access_hash
				};

				options.dcId = peer._peerUser._apiObject.photo.dc_id;
			}
		}

		if (!params.location.peer) {
			this._downloadPromiseResolvers[cacheKey](null);
			return null;
		}

		let blobURL = await this._user._protocol.loadImageAndReturnBlobURL({url: './tg/'+cacheKey+'.png', params: params, options: options});
		this._downloadPromiseResolvers[cacheKey](blobURL);

		return blobURL;
	}

}

module.exports = MediaManager;
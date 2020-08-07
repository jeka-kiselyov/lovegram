class FileCacher {
	constructor(options) {
		this._db = null;
		this._cacheName = 'lovegram-0.0.1';
	}

	async open() {
		if (!this._db) {
			this._db = await this.initDB();

			// let store = this.store();
			// await this.matchFromStore(store, '/tg/avatar_peer_channel_1174185578.png');
		}
	}

	// async test() {
	// 	let store = this.store();
	// 	await this.matchFromStore(store, '/tg/avatar_peer_channel_1174185578.png');
	// }

	initDB() {
		return new Promise((res, rej)=>{
			let request = indexedDB.open(this._cacheName, 4);
			request.onerror = function() {
				rej();
			};
		    request.onupgradeneeded = ()=>{
		        const db = request.result;
		        try { db.createObjectStore('files', { keyPath: "url" }); } catch(e){}
				// objectStore.createIndex("data", "data", { unique: false });


		    };
		    request.onsuccess = function() {
		    	const db = request.result;
		    	res(db);
				// const tx = db.transaction(['files'], 'readwrite');
				// const store = tx.objectStore('files');
				// // .then((store)=>{
				// // 	res(store);
				// // });
				// res(store);
		    };
		});
	}

	store() {
		const tx = this._db.transaction(['files'], 'readwrite');
		return tx.objectStore('files');
	}

	async matchFromStore(store, url, ra) {
		let murl = '/tg/'+url.split('/tg/')[1];

		return new Promise((res,rej)=>{
			// console.error((new Date).getTime(), ' store get '+url);

			const request = store.get(murl);
			request.onerror = function() {
				res(undefined);
			};
			request.onsuccess = function(event) {
				const record = request.result;
				// console.error('matched', "-"+murl+"-", record, event, request);

				if (!record) {
					res(undefined);
					return;
				}
				let ret = new Response(
					record.data,
					{
						status: 200
					});
				if (ra) {
					ret = [url, ret];
				}
				res(ret);
			};
		});
	}

	async matchAll(urls) {
		// await this.initDB();
		let uurls = Array.from(new Set(urls));

		// await this.test();

		const store = this.store();
		const promises = [];


		// let res = [];
		for (let url of uurls) {
			// res.push(await this.matchFromStore(store, url, true));
			promises.push(this.matchFromStore(store, url, true));
		}
		// return res;

		return Promise.all(promises);
	}

	async match(url) {
		// await this.initDB();
		const store = this.store();
		return await this.matchFromStore(store, url);

		// // console.error('match', url);
		// url = '/tg/'+url.split('/tg/')[1];

		// return new Promise((res,rej)=>{

		// 	console.error((new Date).getTime(), ' store get '+url);
		// 	const request = store.get(url);
		// 	request.onerror = function() {
		// 		res(undefined);
		// 	};
		// 	request.onsuccess = function(event) {
		// 		const record = request.result;

		// 		// console.error(url, record);

		// 		if (!record) {
		// 			res(undefined);
		// 			return;
		// 		}

		// 		const response = new Response(
		// 			record.data,
		// 			{
		// 				status: 200
		// 			});
		// 		res(response);
		// 	};
		// });
		// const response = await this._theCache.match(url, {ignoreSearch: true});
		// return response;
	}

	async deleteUrl(url) {
		let murl = '/tg/'+url.split('/tg/')[1];
		const store = this.store();

		await new Promise((res,rej)=>{
			const request = store.delete(murl);
			request.onerror = function() {
				res(undefined);
			};
			request.onsuccess = function(event) {
				res(true);
			};
		});
	}

	delete() {
		return new Promise((res, rej)=>{
			this.open()
				.then(()=>{
					const tx = this._db.transaction(['files'], 'readwrite');
					const store = tx.objectStore('files');

					const r = store.clear();
					r.onsuccess = function(event) { res(); };
				});
		});
	}

	put(url, response) {
		let murl = '/tg/'+url.split('/tg/')[1];

		return new Promise((res, rej)=>{
			response.blob().then((blob)=>{

				const tx = this._db.transaction(['files'], 'readwrite');
				const store = tx.objectStore('files');

				const item = {
					url: murl,
					data: blob,
				};

				try {
					tx.onerror = function(e) {
						// console.error(e);
						// may be because of duplicate
						// console.error(e);
						res(true);
					};
					tx.oncomplete = function(event) {
						console.error('cached ok', murl);
					// console.error('putting2 ', item, event);
						res(true);
					};

					// console.error('putting', item);
					const addRequest = store.add(item);

					addRequest.onerror = function(e) {
						// console.error(e);
						// may be because of duplicate
						// console.error(e);
						res(true);
					};
					// addRequest.onsuccess = function(e) {
					// 	console.error(e);
					// 	// may be because of duplicate
					// 	// console.error(e);
					// 	res(true);
					// };
				} catch(e) {
					console.error(e);
				}
			});
		});
	}
}


// class FileCacher {
// 	constructor(options) {
// 		this._theCache = null;
// 		this._cacheName = 'lovegram-0.0.1';
// 	}

// 	async open() {
// 		this._theCache = await caches.open(this._cacheName);
// 	}

// 	async match(url) {
// 		const response = await this._theCache.match(url, {ignoreSearch: true});
// 		return response;
// 	}

// 	async delete() {
// 		await caches.delete(this._cacheName);
// 	}

// 	async put(url, response) {
// 		return await this._theCache.put(url, response);
// 	}
// }

module.exports = new FileCacher();

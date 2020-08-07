const EventTarget = window.classes.EventTarget;
const Storage = window.classes.Storage;
const StickerSet = require('./StickerSet.js');
const MessageSticker = require('./MessageSticker.js');

class Stickers extends EventTarget {
	constructor(params = {}) {
	    super();

		this._app = params.app;
		this._storage = params.storage;
		this._user = params.app._user;
		this._media = params.media;
		this._peerManager = params.peerManager;

		this._stickers = [];
		this._stickersImageData = {};

		this._stickerSetsIds = {};

		this._featured = [];

		this._stickersIds = {};
		this._recentStickers = [];

		this._installed = {};
		this._installedIds = {};

		// this._stickersInitializedResolve = null;
		// this._stickersInitialized = new Promise((res)=>{
		// 	this._stickersInitializedResolve = res;
		// });

		// if (this._app.config.get('loadStickersInBackground')) {
		// 	this._loadingIdleSlow = 500;
		// } else {
		// 	this._loadingIdleSlow = 500000;
		// }
		// this._loadingIdleFast = 50;
		// this._curLoadingIdle = this._loadingIdleSlow;

		this._stickersCache = {};
	}

	byId(id) {
		return this._stickerSetsIds[id];
		// for (let thisStickerSet of this._stickers) {
		// 	if (thisStickerSet._id == id) {
		// 		return thisStickerSet;
		// 	}
		// }
	}

	// setLoadingMode(mode) {
	// 	if (mode == 'fast') {
	// 		this._curLoadingIdle = this._loadingIdleFast;
	// 	} else {
	// 		this._curLoadingIdle = this._loadingIdleSlow;
	// 	}
	// }

	// async getStickers() {
	// 	await this._stickersInitialized;
	// 	return this._stickers;
	// }

	// async load() {
	// 	let json = await this._storage.get('stickers');
	// 	try {
	// 		this._stickers = JSON.parse(json);
	// 	} catch(e) {
	// 		this._stickers = [];
	// 	}
	// }

	installToggle(stickerSetId) {
		const stickerSet = this.byId(stickerSetId);
		if (stickerSet) {
			if (this.isStickerSetInstalled(stickerSet)) {
				this.uninstallStickerSet(stickerSet);
				return false;
			} else {
				this.installStickerSet(stickerSet);
				return true;
			}
		}
	}

	async installStickerSet(stickerSet) {
		if (this.isStickerSetInstalled(stickerSet)) {
			return true;
		}

		// this._stickers.push(stickerSet);
		this._installed[stickerSet._id] = stickerSet;
		this._installedIds[stickerSet._id] = stickerSet._id;

		stickerSet.installed = true;
		await stickerSet.loadImagesFromCache();
		await stickerSet.load();
		this.emit('installed', stickerSet);

		this._user.invoke('messages.installStickerSet', {stickerset: {_:'inputStickerSetID', id: stickerSet._apiObject.set.id, access_hash: stickerSet._apiObject.set.access_hash}});
	}

	uninstallStickerSet(stickerSet) {
		delete this._installedIds[stickerSet._id];
		delete this._installed[stickerSet._id];
		// for (let i = 0; i < this._installed.length; i++) {
		// 	if (this._installed[i]._id == stickerSet._id) {
		// 		this._stickersCache[stickerSet._id] = stickerSet;
		// 		this._installed.splice(i, 1);
		this.emit('uninstalled', stickerSet);
		this._user.invoke('messages.uninstallStickerSet', {stickerset: {_:'inputStickerSetID', id: stickerSet._apiObject.set.id, access_hash: stickerSet._apiObject.set.access_hash}});
		return true;
	}

	isStickerSetInstalled(stickerSet) {
		return ( (!!this._installed[stickerSet._id]) || this._installedIds[stickerSet._id]);
	}

	async getStickerSetBySticker(mediaSticker) {
		let id = null;
		let accessHash = null;

		if (mediaSticker._apiObject && mediaSticker._apiObject.attributes) {
			for (let attr of mediaSticker._apiObject.attributes) {
				if (attr._ == 'documentAttributeSticker') {
					if (attr.stickerset) {
						id = attr.stickerset.id;
						accessHash = attr.stickerset.access_hash;

						break;
					}
				}
			}
		}

		if (id) {
			const bid = this.byId(id);
			if (bid) {
				return bid;
			}
			if (this._stickersCache[id]) {
				return this._stickersCache[id];
			}
		}

		if (id && accessHash) {
			const sdata = await this._user.invoke('messages.getStickerSet', {"stickerset":
							{"_":"inputStickerSetID", "id": id, "access_hash": accessHash}
						});

			if (sdata && sdata.data && sdata.data.documents) {
				let stickerSet = new StickerSet({apiObject: sdata.data, peerManager: this._peerManager });
				this._stickersCache[stickerSet._id] = stickerSet;
				return stickerSet;
			}
		}

		return null;
	}

	async loadRespData(data, maxSets, cb) {
		const ret = [];
		const retIds = {};

		if (maxSets) {
			// if max is set, lets try to fell ret with cached items first
			for (let apiSet of data.sets) {
				if (maxSets > ret.length) {
					if (apiSet.set) apiSet = apiSet.set;
					if (this._stickerSetsIds[apiSet.id]) {
						ret.push(this._stickerSetsIds[apiSet.id]);
						retIds[apiSet.id] = true;
					}
				}
			}

			if (ret.length) {
				if (cb) {
					cb(ret);
				}
			}
		}
		for (let apiSet of data.sets) {
			if (!maxSets || maxSets > ret.length) {
				if (apiSet.set) apiSet = apiSet.set;
				if (retIds[apiSet.id]) continue;

				console.error('featured', apiSet);

				try {
					if (this._stickerSetsIds[apiSet.id]) {
						ret.push(this._stickerSetsIds[apiSet.id]);
						retIds[apiSet.id] = true;
 					} else {
						const sdata = await this._user._protocol.invokeAndCache('messages.getStickerSet', {"stickerset":
										{"_":"inputStickerSetID", "id": apiSet.id, "access_hash": apiSet.access_hash}
									}, {max: 10});

						if (sdata && sdata.documents) {
							let stickerSet = new StickerSet({apiObject: sdata, peerManager: this._peerManager });
							for (let sticker of stickerSet._stickers) {
								this._stickersIds[sticker._id] = sticker;
							}
							this._stickerSetsIds[stickerSet._id] = stickerSet;
							if (this._installedIds[stickerSet._id]) {
								this._installed[stickerSet._id] = stickerSet;
							}

							await stickerSet.loadImagesFromCache(maxSets);

							ret.push(stickerSet);
							retIds[stickerSet._id] = true;
						}
					}

					if (cb) {
						cb(ret);
					}
					// await new Promise((res)=>{setTimeout(res, 1000)});
				} catch(e) {}
			}
		}
		return ret;
	}

	async getFeatured() {
		// if (this._featured.length) return this._featured;
		return await this._user._protocol.invokeAndCache('messages.getFeaturedStickers', {}, {max: 10});
		// this._featured = await this.loadRespData(sdata.data, 6);

		// return this._featured;
	}

	async search(q) {
		return await this._user._protocol.invokeAndCache('messages.searchStickerSets', {q: q}, {max: 10});
		// return await this.loadRespData(sdata.data);
	}

	async getAll() {
		if (this._allData) {
			return this._allData;
		}

		let data =  await this._user.invoke('messages.getAllStickers', {}, {max: 10});
		data = data.data;
		if (data && data.sets) {
			data.sets.forEach((aset)=>{
				this._installedIds[aset.id] = true;
			});
		}
		this._allData = data;
		return data;
	}

	async getRecent() {
		if (this._recentStickers.length) {
			return this._recentStickers;
		}

		const sdata = await this._user.invoke('messages.getRecentStickers');
		if (sdata && sdata.data && sdata.data.stickers) {
			let addedC = 0;
			for (let recentStickerAPIObj of sdata.data.stickers) {
				if (addedC < 10) {
					if (this._stickersIds[recentStickerAPIObj.id]) { // todo: waste code
						this._recentStickers.push(this._stickersIds[recentStickerAPIObj.id]);
					} else {
						const mSticker = new MessageSticker({apiObject: recentStickerAPIObj, peerManager: this._peerManager});
						this._recentStickers.push(mSticker);
						this._stickersIds[mSticker._id] = mSticker;
					}
					addedC++;
				}
			}
		}

		await this._peerManager._user._protocol.getCachedResources(this._recentStickers);

		return this._recentStickers;
	}

	// async getAllStickers() {
	// 	if (this._stickers && this._stickers.length) {
	// 		this._stickersInitializedResolve();
	// 		this.emit('loaded', null);
	// 		this.preloadStickers();
	// 		return this._stickers;
	// 	}

	// 	let sdata = await this._user.invoke('messages.getAllStickers');
	// 	this._stickers = await this.loadRespData(sdata.data);

	// 	// const stickerSets = [];
	// 	// let resp = await this._user.invoke('messages.getAllStickers');
	// 	// if (resp.data && resp.data.sets) {
	// 	// 	for (let apiSet of resp.data.sets) {
	// 	// 		let sdata = null;
	// 	// 		try {
	// 	// 			sdata = await this._user._protocol.invokeAndCache('messages.getStickerSet', {"stickerset":
	// 	// 					{"_":"inputStickerSetID", "id": apiSet.id, "access_hash": apiSet.access_hash}
	// 	// 				});
	// 	// 		} catch(e) {

	// 	// 		}
	// 	// 		if (sdata && sdata.data && sdata.data.documents) {
	// 	// 			let stickerSet = new StickerSet({apiObject: sdata.data, peerManager: this._peerManager });
	// 	// 			for (let sticker of stickerSet._stickers) {
	// 	// 				this._stickersIds[sticker._id] = sticker;
	// 	// 			}
	// 	// 			stickerSets.push(stickerSet);
	// 	// 		}
	// 	// 	}
	// 	// }

	// 	// this._stickers = stickerSets;

	// 	sdata = await this._user.invoke('messages.getRecentStickers');
	// 	if (sdata && sdata.data && sdata.data.stickers) {
	// 		let addedC = 0;
	// 		for (let recentStickerAPIObj of sdata.data.stickers) {
	// 			if (addedC < 10 && this._stickersIds[recentStickerAPIObj.id]) {
	// 				this._recentStickers.push(this._stickersIds[recentStickerAPIObj.id]);
	// 				addedC++;
	// 			}
	// 		}
	// 	}

	// 	await this._peerManager._user._protocol.getCachedResources(this._recentStickers);

	// 	this._stickersInitializedResolve();

	// 	this.emit('loaded');

	// 	this.preloadStickers();

	// 	return this._stickers;
	// }

	free(id) {
		const bid = this.byId(id);
		if (bid) {
			bid.free();
		}
	}

	// async getAnimatedStickersData(stickerSet) {
	// 	if (!stickerSet._stickers) {
	// 		// maybe stickerSet is id?
	// 		stickerSet = this.byId(stickerSet);
	// 	}


	// 	let animatedData = {};
	// 	let items = [];
	// 	for (let i = 0; i < stickerSet._stickers.length; i++) {
	// 		if (stickerSet._stickers[i].tgs) {
	// 			if (!stickerSet._stickers[i].json) {
	// 				items.push({url: stickerSet._stickers[i].url, i: i});
	// 			} else {
	// 				animatedData[stickerSet._stickers[i].id] = stickerSet._stickers[i].json;
	// 			}
	// 		}
	// 	}
	// 	items = await this._peerManager._user._protocol.getCachedResources(items);


	// 	for (let i = 0; i < stickerSet._stickers.length; i++) {
	// 		for (let item of items) {
	// 			if (item.i == i && item.json) {
	// 				animatedData[stickerSet._stickers[i].id] = item.json;
	// 			}
	// 		}
	// 	}

	// 	return animatedData;
	// }

	// async preloadStickers() {
	// 	let preloadedSomething = false;
	// 	do {
	// 		preloadedSomething = false;
	// 		for (let i = 0; i < this._stickers.length; i++) {
	// 			let stickerSet = this._stickers[i];
	// 			if (stickerSet) {
	// 				if (!stickerSet._preloadedInMainThread) {
	// 					let wasCached = await stickerSet.loadImagesFromCache();

	// 					if (!wasCached) {
	// 						let i = 0;
	// 						let lastWorkDate = new Date();
	// 						do {
	// 							if ((new Date()).getTime() - lastWorkDate.getTime() > this._curLoadingIdle) {
	// 								let messageSticker = stickerSet._stickers[i];
	// 								if (!messageSticker.blobURL && !messageSticker.json) {
	// 									await messageSticker.load();
	// 								}
	// 								lastWorkDate = new Date();
	// 								i++;
	// 								await new Promise((res)=>{setTimeout(res, 1)});
	// 							} else {
	// 								await new Promise((res)=>{setTimeout(res, 200)});
	// 							}
	// 						} while(i < stickerSet._stickers.length);
	// 					}

	// 					// for (let messageSticker of stickerSet._stickers) {
	// 					// 	if (!messageSticker.blobURL && !messageSticker.json) {
	// 					// 		await messageSticker.load();
	// 					// 		await new Promise((res)=>{setTimeout(res, this._curLoadingIdle)});
	// 					// 	}
	// 					// 	// await new Promise((res)=>{setTimeout(res, 10)});
	// 					// }
	// 					stickerSet._preloadedInMainThread = true;
	// 					await stickerSet.composeSprite();
	// 					this.emit('loaded', stickerSet);
	// 					preloadedSomething = true;

	// 					break;
	// 				}
	// 			}
	// 		}
	// 	} while(preloadedSomething);
	// }
}

module.exports = Stickers;
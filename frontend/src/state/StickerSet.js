const MessageSticker = require('./MessageSticker.js');

class StickerSet {
	constructor(params = {}) {
		this._peerManager = params.peerManager;
		this._apiObject = params.apiObject; // object returned from TG api
		this._id = this._apiObject.set ? this._apiObject.set.id : null;

		this._stickers = [];
		this._name = '';

		this._hasAnimated = false;

		this.processApiData();

		this._imagesLoaded = false;
		// this._spriteBlobURL = false;
	}

	/**
	 * Free memory
	 * @return {[type]} [description]
	 */
	free() {
		console.error('Free stickers memory', this);
		for (let ms of this._stickers) {
			ms.json = null;
			ms.cached = null;
		}
	}

	get id() {
		return this._id;
	}

	get name() {
		return this._name;
	}

	get count() {
		return this._stickers.length;
	}

	get documents() {
		return this._stickers;
	}

	async load() {
		await this.loadImages();
		// await this.composeSprite();

		return this;
	}

	processApiData() {
		for (let doc of this._apiObject.documents) {
			const mSticker = new MessageSticker({apiObject: doc, peerManager: this._peerManager});
			this._stickers.push(mSticker);

			if (!this._hasAnimated && mSticker.isAnimated()) {
				this._hasAnimated = true;
			}
		}

		if (this._apiObject.set && this._apiObject.set.title) {
			this._name = ''+this._apiObject.set.title;
		}
	}

	// getCanvasCacheURL() {
	// 	let cacheKey = 'stickersetcanvas_'+this.id;
	// 	return './tg/'+cacheKey+'.png';
	// }

	/**
	 * Load all sticker set data from cache and return boolean if everything needed is cached
	 * @return {Boolean} was resource cached
	 */
	async loadImagesFromCache(max) {
		// console.error('StickerSet', this._id, 'loadImagesFromCache', new Date());

		/// load from cache @todo
		await this._peerManager._user._protocol.getCachedResources((max ? this._stickers.slice(0, max) : this._stickers));

		// console.error('StickerSet', this._id, 'loadImagesFromCache 2', new Date());

		// let spriteItem = {
		// 	cached: false,
		// 	url: this.getCanvasCacheURL(),
		// };
		// await this._peerManager._user._protocol.getCachedResources([spriteItem]);

		// // console.error('StickerSet', this._id, 'loadImagesFromCache 3', new Date(), spriteItem.blobURL);
		// if (spriteItem.cached && !this._hasAnimated) {
		// 	this._spriteBlobURL = spriteItem.blobURL;
		// 	return true;
		// } else if (this._hasAnimated) {
		// 	let hasNotCached = false;
		// 	for (let mSticker of this._stickers) {
		// 		if (!mSticker.json) {
		// 			hasNotCached = true;
		// 		}
		// 	}

		// 	return !hasNotCached;
		// } else {
		// 	return false;
		// }
	}

	async loadImages() {
		await this.loadImagesFromCache();
		for (let sticker of this._stickers) {
			await sticker.load();
		}
		this._imagesLoaded = true;
	}

	// async composeSprite() {
	// 	if (this._spriteBlobURL) {
	// 		return this._spriteBlobURL;
	// 	}

	// 	console.warn('Composing sprite for sticker set ', this);

	// 	let stickersCount = this._stickers.length;

	// 	let canvasWidth = (75+5)*5 - 5; // 65 with, 10 margin, - last margin
	// 	let canvasHeight = Math.ceil(stickersCount / 5) * 80 - 5; // - last margin

	// 	let canvas = document.createElement('canvas');
	//     canvas.width = canvasWidth;
	//     canvas.height = canvasHeight;

	//     let ctx = canvas.getContext("2d");
	//     ctx.imageSmoothingEnabled = true;
	//     let col = 0;
	//     let row = 0;
	//     for (let sticker of this._stickers) {
	//     	if (!sticker.isAnimated()) {
	//     		let x = col*80;
	//     		let y = row*80;
	// 			// let binary = '';
	// 			// for (var i = 0; i < this._stickersImageData[doc.id].length; i++) {
	// 			// 	binary += String.fromCharCode(this._stickersImageData[doc.id][i]); /// yeah, looks as simple stupid, but surprisingly good in benchmarks
	// 			// }
	// 			// let data = 'data:image/png;base64,'+btoa(binary);

	// 			let drawImage = new Promise((res)=>{
	// 				let image = new Image();
	// 				image.onload = function() {
	// 					let imgWidth = image.width;
	// 					let imgHeight = image.height;

	// 					if (imgWidth >= imgHeight) {
	// 						let ar = imgHeight / imgWidth;
	// 						let canvy = y + (75 - (75*ar))/2;
	// 						let canvh = 75 * ar;
	// 						// ctx.drawImage(image, x, y, 75, 75);
	// 						ctx.drawImage(image, x, canvy, 75, canvh);
	// 					} else {
	// 						let ar = imgWidth / imgHeight;
	// 						let canvx = x + (75 - (75*ar))/2;
	// 						let canvw = 75 * ar;
	// 						// ctx.drawImage(image, x, y, 75, 75);
	// 						ctx.drawImage(image, canvx, y, canvw, 75);
	// 					}
	// 					// image.style.filter = 'blur(10px)';
	// 					res();
	// 				};
	// 				image.onerror = function() {
	// 					res();
	// 				};
	// 				image.src = sticker.blobURL;
	// 			});

	// 			await drawImage;
	// 			await new Promise((res)=>{setTimeout(res, 10)});

	// 					// ctx.drawImage(this._img, this._cX - maxim, this._cY - maxim, area, area, 0, 0, this._data.canvasDim, this._data.canvasDim); // Or at whatever offset you like

	//     	}

	//     	col++;
	//     	if (col == 5) {
	//     		row++;
	//     		col = 0;
	//     	}

	//     }

	//     let blobPromise = new Promise((res)=>{
	// 		canvas.toBlob((blob)=>{
	// 				this._peerManager._user._protocol.putToCacheAndReturnBlob({binary: blob, url: this.getCanvasCacheURL()}); // no wait
	// 			    let blobURL = URL.createObjectURL(blob);

	// 			    res(blobURL);
	// 		    },"image/png", 0.7);
	//     });

	//     this._spriteBlobURL = await blobPromise;
	//     return this._spriteBlobURL;
	// }
}

module.exports = StickerSet;
const EmojiDialogItem = require('./EmojiDialogItem.js');

class GIFs extends EmojiDialogItem {
	constructor(params) {
		super(params);

		this._itemHeight = 105; // 100 + 5 padding
		this._minWidth = 50;
		this._maxWidth = 250;

		this._overflowBefore = 0;
		this._overflowAfter = 0;

		this._lastOffsetY = null;
		this._overflowFirstItemI = null;
		this._overflowLastItemI = null;
		this._containerHeight = 373;

		this._lastScrollTime = new Date();

		this._lastItemToDisplay = null;

		this._visibleItems = {};
		this._loadedToPlay = {};

		this._slept = {};
	}

	show() {
		this.init();
	}

	onGifClick(e) {
		const base = this.$('#gifsList');
		let closest = e.target.closest('.gif');
		if (closest && base.contains(closest)) {
			const items = this._app._peerManager._gifs._gifs;
			for (let item of items) {
				if (item._id == closest.dataset.id) {
					this._parent._parent._components.Panel.onGIF(item);
					this._parent.hide();
				}
			}
		}
	}

	async init() {
		if (await this.sureSingle('init')) return false;

		await this._app._peerManager._gifs.load(true);
		// this._peerManager._user._protocol.on('sw', (data)=>{
		// 	this.asked(data);
		// });
		this.calcItemsPoss();

		this._events = [
			['nodebouncescroll', 'gifsList', 'onScroll'],
			['mouseover', 'gifsList', 'onOver'],
			['click', 'gifsList', 'onGifClick'],
		];

		this._data.initialized = true;

		this.render();

		this.setItems();
		this.initScrollbar();
		this.fulfilSingle('init', true);
	}

	onOver(e) {
		const base = this.$('#gifsList');
		const closest = e.target.closest('.gif');
		if (closest && base.contains(closest)) {
			closest.querySelector('video').play();
		}
	}

	async calcItemsPoss() {
		const items = this._app._peerManager._gifs._gifs;
		let y = 0;

		const sI = (i, y, width) => {
			items[i].pos = {
				y,
				width,
			};
		};

		for (let i = 0; i < items.length - 3; i++) {
			let curAr = items[i].getInfo('aspectRatio');
			let nAr = items[i+1] ? items[i+1].getInfo('aspectRatio') : 0;

			if (curAr > 1 && nAr > 1) {
				// line of 2
				sI(i, y, '50%');
				sI(i+1, y, '50%');
				i++;
			} else {
				// line of 3
				sI(i, y, '33%');
				sI(i+1, y, '33%');
				sI(i+2, y, '34%');
				i+=2;
			}
			y+=this._itemHeight;
		}
	}

	onScroll(e) {
		this.setItems(e.target.scrollTop);
	}

	async setItems(offsetY) {
		const items = this._app._peerManager._gifs._gifs;
		const cont = this.$('.gifsOverflowItems');

		const inView = (item)=>{
			if (item && item.pos && (item.pos.y + this._itemHeight) >= offsetY && item.pos.y < (this._containerHeight + offsetY)) {
				return true;
			}
		};

		if (offsetY === undefined) {
			offsetY = 0;
			let html = '';
			for (let i = 0; i < items.length; i++) {
				if (items[i].pos) {
					html+=`<div class="gif" id="gif_${items[i]._id}" data-id="${items[i]._id}" style="width: ${items[i].pos.width};"><div class="cssload-zenith onDark videoLoading"></div></div>`;
					if (inView(items[i])) {
						(this._overflowFirstItemI == null) && (this._overflowFirstItemI = i);
						this._overflowLastItemI = i;
					} else {
						this._lastItemToDisplay = items[i];
					}
				}
			}
			cont.innerHTML = html + "<div style='clear:both'></div>";
			this.setItems(200);
			this.setItems(1);
		} else {
			if (offsetY != this._lastOffsetY) {

				this._lastScrollTime = new Date();
				// console.error(offsetY, this._overflowFirstItemI, this._overflowLastItemI)

				// const fv = (ioffset, dir, stopat, ini)=>{
				// 	let v = ini;
				// 	for (let i = ioffset; i!=stopat; i+=dir) {
				// 		if (inView(items[i])) {
				// 			v = i;
				// 		} else {
				// 			break;
				// 		}
				// 	}
				// 	return v;
				// };

				// // scrolling
				// console.error('fu', fv(this._overflowFirstItemI, -1, -1, Infinity));
				// console.error('fd', fv(this._overflowFirstItemI, 1, items.length, Infinity));
				// console.error('fd2', fv(this._overflowLastItemI, -1, -1, Infinity));

				// let newfirst = Math.min(fv(this._overflowFirstItemI, -1, -1, Infinity), fv(this._overflowFirstItemI, 1, items.length, Infinity), fv(this._overflowLastItemI, -1, -1, Infinity));
				// let newlast = Math.max(fv(this._overflowLastItemI, 1, items.length, -1), fv(this._overflowLastItemI, -1, -1, -1), fv(this._overflowFirstItemI, 1, items.length, -1));

				// if (newfirst == Infinity || newlast == -1) {
				// 	console.error('deeper');
				let newfirst = null;
				let newlast = null;
					for (let i = 0; i<items.length; i++) {
						if (inView(items[i])) {
							if (newfirst == null) newfirst = i; // change to Infinity if uncomment above
							newlast = i;
						}
					}
				// }

				this._lastOffsetY = offsetY;
				if (newfirst != this._overflowFirstItemI || newlast != this._overflowLastItemI) {
					let was = [];
					let add = [];
					for (let i = this._overflowFirstItemI; i <= this._overflowLastItemI; i++) {
						if (i < newfirst || i > newlast) was.push(i);
					}
					for (let i = newfirst; i <= newlast; i++) {
						if (was.indexOf(i) == -1) add.push(i);
					}

					this._overflowFirstItemI = newfirst;
					this._overflowLastItemI = newlast;
					// console.error('changed line', newfirst, newlast, was, add);
					for (let w of was) {
						let d = Math.min(Math.abs(newfirst - w),Math.abs(newlast - w));
						if (d <= 3) {
							this.sleep(w);
						} else {
							this.freeze(w);
						}
					}
					for (let i in this._slept) {
						if (i < newfirst - 3 || i > newlast + 3) {
							this.freeze(i);
						}
					}
					for (let w of add) {
						this.wakeup(w);
					}

					clearTimeout(this._tickTimeout);
					this._tickTimeout = setTimeout(()=>{
						this.tick();
					}, 100);
				}
			}
		}
	}

	async freeze(i) {
		let item = this._app._peerManager._gifs._gifs[i];

		const cont = this.$('#gif_'+item._id);
		delete this._visibleItems[item._id];
		delete this._slept[i];

		const vTag = cont.querySelector('video');
		item.tagSet = false;
		item.sleep = false;
		if (vTag) {
			vTag.removeEventListener('canplay', item.vTagListener);
			vTag.pause();
			vTag.removeAttribute('src');
			vTag.load();
			vTag.remove();
			cont.classList.remove('loaded');
			// this._app._peerManager._user._protocol.fulfillSWStream(item._id, 0);
		}
	}

	async sleep(i) {
		console.error('sleep'+i);
		this._slept[i] = true;
		let item = this._app._peerManager._gifs._gifs[i];
		delete this._visibleItems[item._id];
		if (item.tagSet) {
			item.tagSet.pause();
			item.sleep = true;
		}
	}

	async wakeup(i) {
		let item = this._app._peerManager._gifs._gifs[i];
		delete this._slept[i];

		if (!item.tagSet) {
			const cont = this.$('#gif_'+item._id);
			if (!item.cBlobUrlSet) {
				const b64 = item.getPreviewBase64();
				(b64 && (cont.style.backgroundImage = "url('"+b64+"')"));
			} else {
				cont.classList.add('loaded');
			}

			// console.error(p64);
			cont.innerHTML += `<video src="${item.getStreamURL()}?r${Math.random()}" muted autoplay title="${item._id}"></video>`;
			const v = cont.querySelector('video');

			item.vTagListener = () => {
				cont.classList.add('loaded');
				// console.
				this._loadedToPlay[item._id] = true;

				try {
					let canvas = document.createElement('canvas');
				    canvas.height = 100;
				    canvas.width = 100 * item.getInfo('aspectRatio');
				    let ctx = canvas.getContext("2d");
			    // ctx.imageSmoothingEnabled = true;
				    ctx.drawImage(v, 0, 0, canvas.width, 100);
				    canvas.toBlob((canvasBlob)=>{
							// let canvasBlobUrl = URL.createObjectURL(canvasBlob);
							// console.error()
							cont.style.backgroundImage = "url('"+URL.createObjectURL(canvasBlob)+"')";
							item.cBlobUrlSet = true;
				    	});
				} catch(e) {}
			};

			v.addEventListener('canplay', item.vTagListener);
			v.load();

			item.tagSet = v;
			if (!item.askedD) {
				item.scheduleDownload();
				item.askedD = true;

				await item.checkCache();
			}
		}
		if (item.sleep) {
			item.tagSet.play();
		}
		this._visibleItems[item._id] = item;

		// item.scheduleDownload();
		// do {
		// 	await item.downloadNextPart();
		// } while(!item._isDownloaded);

				// videoEl.onloadeddata = () => {
				// 	videoEl.style.display = 'block';
				// 	this.$('.videoLoading').style.display = 'none';

				// 	if (this._mediaPlaying) {
				// 		videoEl.play();
				// 	}
				// };
				// videoEl.src = this._media.getStreamURL(); // + '?r=' + Math.random();
				// videoEl.load();
	}

	// asked(data) {
	// 	if (data.documentId && this._visibleItems[data.documentId]) {
	// 		// service worker asked us to load some chunk
	// 	}
	// }

	async tick() {
		console.error('tick');
		if (await this.sureSingle('tick')) return;
		console.error('tick run');

		let promises = [];
		do {
			console.error('asked tick');
			promises = [];
			for (let key in this._visibleItems) {
				if (this._visibleItems[key]._isDownloaded) {
					delete this._visibleItems[key];
				} else {
					if (!this._loadedToPlay[key]) {
						// prioritize not loaded
						console.error('gif downloading', key);
						promises.push(this._visibleItems[key].downloadNextPart());
					}
					// do {
					// 	await this._visibleItems[key].downloadNextPart();
					// } while (this._visibleItems[key] && !this._visibleItems[key]._isDownloaded);
					// down = true;
				}
				if (promises.length > 1) break; // 2 in parallel
			}
			console.error('promises start');
			await Promise.all(promises);
			console.error('promises start 2');
		} while(promises.length);

		this.fulfilSingle('tick', true, true); // can run again
	}

};

GIFs.template = `
		{{if (options.initialized)}}
		<div class="gifsList active emojiScroll" id="gifsList">
			<div class="gifsOveflow" id="gifsOveflowBefore"></div>
			<div class="gifsOverflowItems">

			</div>
			<div class="gifsOveflow" id="gifsOveflowAfter"></div>
		</div>
		{{#else}}
		<div class="appLoading">
			<div class="cssload-zenith dark"></div>
		</div>
		{{/if}}
		`;

module.exports = GIFs;
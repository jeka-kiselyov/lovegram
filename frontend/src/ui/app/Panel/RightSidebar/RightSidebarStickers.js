const RightSidebarAbstract = require('./RightSidebarAbstract.js');
const TGS = window.classes.TGS;

class RightSidebarStickers extends RightSidebarAbstract {
	constructor(params) {
		super(params);

		this._lastDataWithResults = null;
		this._lastSearch = null;

		this._inDOMids = {};
		this._initsids = {};

		this._slept = {};

		this._tgss = {};
		this._cachedSearched = {};

		this._keepInDOM = 50;

		this._events = [
			['mouseover', 'rssStickersList', 'onStickersOver'],
			['click', 'rssStickersList', 'onClick'],
		];

		this._data.isLoading = true;
	}

	onClick(e) {
		const base = this.$('#rssStickersList');
		const closest = e.target.closest('.rsssButton');

		if (closest && base.contains(closest)) {
			let now = this._peerManager._stickers.installToggle(closest.dataset.id);
			closest.classList[(now ? 'add' : 'remove')]('added');
		}
	}

	onStickersOver(e) {
		const base = this.$('#rssStickersList');
		const closest = e.target.closest('.animated');

		if (closest && base.contains(closest)) {
			if (closest.dataset && closest.dataset.id && this._lastStickerToAnimate != closest.dataset.id) {
				if (this._tgss[closest.dataset.id]) {
					this._lastStickerToAnimate = closest.dataset.id;
					if (this._playStickerTimeout) {
						clearTimeout(this._playStickerTimeout);
					}
					this._playStickerTimeout = setTimeout(()=>{
						this._tgss[closest.dataset.id].playOnce();
					}, 200);
				}
			}
		}
	}

	// reinitScrollBar(forceReInit) {
	// 	let container = this.$('.sidebarSearchScroll');
	// 	let topContainer = this.$('#rightSidebarSearch');

	// 	if (container && topContainer) {
	// 		container.style.height = '' +(topContainer.offsetHeight - container.offsetTop) + 'px';
	// 		this.initScrollBarOn(container, forceReInit);
	// 	}
	// }

	async setActive(active = true) {
		this._data.active = active;
		this.$('.rightSidebarBlock').classList[active ? 'add' : 'remove']('active');

		if (active) {
			let data = await this._peerManager._stickers.getFeatured();
			console.error('_featured', data);
			if (data && data.sets) {
				await this._peerManager._stickers.loadRespData(data, 6, (searched)=>{
			console.error('_featured searched', searched);

					this._featured = searched;
					if (this._data.isLoading) {
						this._data.isLoading = false;
						this.render();
					}

					if (!this._lastSearch) {
						this._data.sets = searched;
						this.updateDom();
					}
				}, 5);
			}
			// this._featured = this._data.sets;

			// this._data.isLoading = false;
			// this.render();
			// console.error(this._data.sets);
		}
	}

	updateDom() {
		const cont = this.$('.rssStickersList');
		let html = '';
		let ids = [];
		let updated = false;
		console.error(this._data);
		console.error(this._data.sets);
		for (let set of this._data.sets) {
			if (ids.length < 6) {
				if (!this._inDOMids[set._id]) {
					html+=this.getSetHTML(set);
					this._inDOMids[set._id] = true;
					console.error('added', set._id);
					updated = true;
				} else {
					if (this._slept[set._id] || !this._initsids[set._id]) {
						this.$('#rssSet_'+set._id).style.display = 'block';
						delete this._slept[set._id];
						this._tgss[set._stickers[0]._id] && this._tgss[set._stickers[0]._id].playOnce();

						if (!this._initsids[set._id]) {
							updated = true;
						}
					}
				}
				ids.push(set._id);
			}
		}

		if (html) {
			cont.insertAdjacentHTML('beforeend', html);
		}

		let ac = ids.length;
		let r = 0;
		let keys = Object.keys(this._inDOMids).reverse();
		for (let id of keys) {
			// ids in reverse added order
			if (ids.indexOf(id) == -1) {
				// not displaying
				const cont = this.$('#rssSet_'+id);
				if (ac + r < this._keepInDOM) {
					// sleep some relatively recent stickersets
					// console.error('sleeping', id);

					(cont && (cont.style.display = 'none'));
					this._slept[id] = true;
					r++;
				} else {
					// remove older stickerset
					console.error('removing', id);
					cont && cont.remove();
					delete this._inDOMids[id];
					delete this._initsids[id];
					delete this._slept[id];
					updated = true;
				}
			}
		}

		if (updated) {
			this.tick();
		}
	}

	getSetHTML(stickerSet) {
		let stHTML = '';
		for (let i = 0; i < 5; i++) {
			stHTML+='<div class="rsssSticker"></div>';
		}
		let added = (this._peerManager._stickers.isStickerSetInstalled(stickerSet) ? 'added' : '');
		return `<div class="rssSet" id="rssSet_${stickerSet._id}" data-id="${stickerSet._id}">
			<div class="rsssHeader">
				<div class="rsssButton ${added}" data-id="${stickerSet._id}"></div>
				<h3>${this.escapeHTML(stickerSet._name)}</h3>
				<span>${stickerSet._stickers.length} stickers</span>
			</div>
			<div class="rsssStickers">
				${stHTML}
			</div>
		</div>`;
	}

	async tick() {
		if (await this.sureSingle('tick')) return;

		let fw = 1; // do not run parallel called by default
		for (let set of this._data.sets) {
			if (this._inDOMids[set._id] && !this._initsids[set._id] && !this._slept[set._id]) {
				this._initsids[set._id] = true;
				for (let i = 0; i < 5; i++) {
						// console.error('laod tgs');
					try {
						const cont = this.$('#rssSet_'+set._id).querySelector('.rsssSticker:nth-child('+(i+1)+')');
						const data = await set._stickers[i].load();
						if (set._stickers[i]._isAnimated) {
							const tgs = new TGS(cont);
							// console.error('create tgs');
							this._tgss[set._stickers[i]._id] = tgs;
							tgs.setJSON(data, true, true, set._stickers[i], (i == 0));
							cont.classList.add('animated');
							cont.dataset.id = set._stickers[i]._id;
						} else {
							cont.style.backgroundImage = "url('"+data+"')";
						}
						await new Promise((res)=>setTimeout(res,5));
					} catch(e) { break; }

					if (this._slept[set._id]) {
						console.error('added animation but goes to sleep', set._id);
						delete this._inDOMids[set._id];
						delete this._initsids[set._id];
						delete this._slept[set._id];
						this.$('#rssSet_'+set._id).remove();
						fw = 0; // run this function call if called parallel
						break;
					}
				}
			}
		}

		this.fulfilSingle('tick',fw,1);
	}

	afterRender() {
		console.error('stickers afterRender ');
		// this.reinitScrollBar(true);
		this._inDOMids = {};
		this._initsids = {};
		this._slept = {};
	}

	doSearch(q) {
		clearTimeout(this._typeTimeout);
		this._typeTimeout = setTimeout(()=>{
			this.search(q);
		}, 100);
	}

	async search(q) {
		console.error('Searched ', q);
		this._lastSearch = q;

		if (!q) {
			console.error('disp _featured');
			this._data.sets = this._featured;
			this.updateDom();
			return clearTimeout(this._searchTimeout);
		}

		if (this._cachedSearched[q]) {
			this._data.sets = this._cachedSearched[q];
			this.updateDom();
			return clearTimeout(this._searchTimeout);
		}

		let data = await this._peerManager._stickers.search(q);
		console.error(data);
		console.error(this._lastDataWithResults);
		try {
			if (!data.sets.length) {
				data = this._lastDataWithResults;
			} else {
				this._lastDataWithResults = data;
			}
		} catch(e) {
			data = this._lastDataWithResults;
		}
		console.log('p', data);

		if (this._searchTimeout) {
			clearTimeout(this._searchTimeout);
		}
		this._searchTimeout = setTimeout(async()=>{
			if (data) {
				await this._peerManager._stickers.loadRespData(data, 6, (searched)=>{
					console.error('searched', searched)
					this._cachedSearched[q] = searched;
					if (searched.length && q == this._lastSearch) {
						this._data.sets = searched;
						this.updateDom();
					}
				});
			}
		}, 500);
	}

	template() {
		return `
			<div class="rightSidebarStickers rightSidebarBlock {{if (options.active)}} active{{/if}}" id="rightSidebarStickers">
				{{if (options.isLoading)}}
				<div class="appLoading">
					<div class="cssload-zenith dark"></div>
				</div>
				{{#else}}
				<div class="rssStickersList" id="rssStickersList">

				</div>
				{{/if}}
			</div>
		`;
	}
};

module.exports = RightSidebarStickers;
const EmojiDialogItem = require('./EmojiDialogItem.js');
const AppIcon = require('../../icons/AppIcon.js');
const TGS = window.classes.TGS;

class Stickers extends EmojiDialogItem {
	constructor(params) {
		super(params);
		this.isVisible = false;
	}

	send(sticker) {
		this._parent._parent._components.Panel.onSticker(sticker);
		this.addStickerToRecent(sticker);
		this._parent.hide();
	}

	onStickerClick(e) {
		const base = this.$('#stickersList');
		let closest = e.target.closest('span');
		if (!closest) {
			closest = e.target.closest('.animated');
		}

		if (closest && base.contains(closest)) {
			let sticker = this._app._peerManager._stickers._stickersIds[closest.dataset.id];
			console.error(sticker);
			(sticker && this.send(sticker));

			// if (closest.dataset.set == 'Recent') {
			// 	let recentStickers = this._app._peerManager._stickers._recentStickers;
			// 	for (let recentSticker of recentStickers) {
			// 		if (recentSticker.id == closest.dataset.id) {
			// 			this.send(recentSticker);
			// 			return;
			// 		}
			// 	}
			// } else {
			// 	for (let set of this._data.stickers) {
			// 		if (set.id == closest.dataset.set) {
			// 			for (let doc of set.documents) {
			// 				if (doc.id == closest.dataset.id) {
			// 					this.emit('sticker', doc);
			// 					this.addStickerToRecent(doc);
			// 					this.hide();
			// 					return;
			// 				}
			// 			}
			// 		}
			// 	}
			// }

		}
	}

	show() {
		this.isVisible = true;
		this.init()
			.then(()=>{
				this.doAdded();
			});
	}

	hidden() {
		this.isVisible = false;
	}

	async init() {
		if (await this.sureSingle('init')) return false;


		this._components['IconRecent'] = this.newC(AppIcon, {icon: 'recent'});
		this._events = [
			['nodebouncescroll', 'stickersList', 'onStickersScroll'],
			['click', 'stickersList', 'onStickerClick'],
			['click', 'stickersCats', 'onStickerCatClick'],
			['mouseover', 'stickersList', 'onStickersOver'],
		];

		this._data.stickers = [];

		this.__stickersDivReady = {};
		this.__animationsStarted = {};

		this._animatedStickersToInit = {};   /// need to keep ids to initialize lottie when divs are visible
		this._animatedStickersIniting = {};

		this._tgss = {};  /// refs to TGS objects

		this._recentTGSs = {};  /// refs to TGS objects of recent stickers
		this._recentTGSsAsked = {}; /// is recent TGS asked to initialize

		this._lastStickerToAnimate = null;

		this.__setAdded = {};


		this._app._peerManager._stickers.on('uninstalled', (stickerSet)=>{
				this.stickerSetUninstalled(stickerSet);
			});
		this._app._peerManager._stickers.on('installed', (stickerSet)=>{
				this.stickerSetInstalled(stickerSet);
			});
		// this._app._peerManager._stickers.on('loaded', (what)=>{
		// 		this.stickersUpdated(what);
		// 	}); // fired when stickers or some sticker pack is loaded
		// this._app._peerManager._stickers.on('uninstalled', (stickerSet)=>{
		// 		this.stickerSetUninstalled(stickerSet);
		// 	});
		// this._app._peerManager._stickers.on('installed', (stickerSet)=>{
		// 		this.stickerSetInstalled(stickerSet);
		// 	});
		// await this._app._peerManager._stickers.getAllStickers();

		let recent = await this._app._peerManager._stickers.getRecent();
		console.error(recent);

		console.error(1);
		console.error(2);
		console.error(3);
		// await this._peerManager._stickers.loadRespData(data, 6, (searched)=>{
		// 			console.error('searched', searched)
		// 			this._cachedSearched[q] = searched;
		// 			if (searched.length && q == this._lastSearch) {
		// 				this._data.sets = searched;
		// 				this.updateDom();
		// 			}
		// 		});

		this._data.initialized = true;

		this.render();
		this.rerenderStickers();
		this.isVisible = true;
		this.initScrollbar();

		let all = await this._app._peerManager._stickers.getAll();
		await this._app._peerManager._stickers.loadRespData(all, null, ()=>{
			this.doAdded();
			// for (let set of sets) {
			// 	if (!this.__setAdded[set._id]) {
			// 		this.fillStickerSetDOM(set);
			// 		this.__setAdded[set._id] = true;
			// 		await this.setCatHTML(set);
			// 		this.fillSetImages(set);
			// 	}
			// }
		});

		this.fulfilSingle('init', true);

		// this.nextTick(()=>{
		// 	this.stickersUpdated(null);
		// 	this.startAnimationsOnRecent();
		// });
	}

	async doAdded() {
		await this.sureSingle('doAdded');

		for (let id in this._app._peerManager._stickers._installed) {
			if (!this.__setAdded[id] && this.isVisible) {
				let set = this._app._peerManager._stickers._installed[id];
				this.__setAdded[set._id] = true;
				console.error('filling dom for', set);
				this.fillStickerSetDOM(set, !!set.installed);
				await this.setCatHTML(set);
				if (!this.isVisible) {
					this.__setAdded[set._id] = false;
					break;
				}


				this.fillSetImages(set);

				this.calcStickersScrollOffsets(true);
				this.onStickersScroll('force');
			}
		}

		this.calcStickersScrollOffsets(true);
		this.onStickersScroll('force');

		this.fulfilSingle('doAdded', true, true);
	}

	async stickerSetUninstalled(stickerSet) {
		let stickersDivs = this.$$('.stickersDiv');
		for (let stickersDiv of stickersDivs) {
			if (stickersDiv.dataset && stickersDiv.dataset.id == stickerSet._id) {
				stickersDiv.parentNode.removeChild(stickersDiv);
			}
		}
		let stickersCats = this.$$('.stickersCat');
		for (let stickersCat of stickersCats) {
			if (stickersCat.dataset && stickersCat.dataset.id == stickerSet._id) {
				stickersCat.parentNode.removeChild(stickersCat);
			}
		}

		for (let mSticker of stickerSet._stickers) {
			if (this._tgss[mSticker._id]) {
				this._tgss[mSticker._id].destroy();
				delete this._tgss[mSticker._id];
			}
		}
		this.__stickersDivReady[stickerSet._id] = false;
		this.__animationsStarted[stickerSet._id] = false;
		delete this._animatedStickersToInit[stickerSet._id];
		delete this._animatedStickersIniting[stickerSet._id];
		delete this.__setAdded[stickerSet._id];

		this.calcStickersScrollOffsets(true);
		this.onStickersScroll('force');
	}

	async stickerSetInstalled(stickerSet) {
		if (this.isVisible) {
			// let html = this.getStickerSetHTML(stickerSet);
			let insertBefore = this.$('.stickersDiv');

			// if (insertBefore) {
			// 	/// after the recent
			// 	insertBefore.insertAdjacentHTML('afterend', html);
			// } else {
			// 	this.$('#stickersList').innerHTML = html;
			// }

			this.fillStickerSetDOM(stickerSet, true);
			this.fillSetImages(stickerSet);
			this.setCatHTML(stickerSet);
			this.calcStickersScrollOffsets(true);
			this.onStickersScroll('force');
		}
	}

	async fillSetImages(stickerSet) {
		const spans = {};
		for (let sticker of stickerSet._stickers) {
			if (!sticker._isAnimated) {
				spans[sticker._id] = this.$('#notanimated_'+sticker._id);
				if (!sticker.blobURL) {
					await sticker.load();
				}
				spans[sticker._id].style.backgroundImage = "url('"+sticker.blobURL+"')";
			}
		}
	}

	fillStickerSetDOM(stickerSet, toTheStart) {
		let stickersDiv = this.$('#stickersDiv_'+stickerSet.id);
		let stickersVisibleDiv = this.$('#stickerVisible_'+stickerSet.id);

		if (!stickersVisibleDiv) {
			const html = this.getStickerSetHTML(stickerSet);
			if (toTheStart) {
				let insertBefore = this.$('.stickersDiv');
				insertBefore.insertAdjacentHTML('afterend', html);
			} else {
				this.$('#stickersList').insertAdjacentHTML('beforeend', html);
			}

			stickersDiv = this.$('#stickersDiv_'+stickerSet.id);
			stickersVisibleDiv = this.$('#stickerVisible_'+stickerSet.id);
		}

		let html = '';
		let navigationHTML = '';
		let row = 0;
		let col = 0;

		let height = Math.ceil(stickerSet.count / 5) * 80;
		let hasAnimated = false;

		html+='<div class="stickersHandler" data-set="'+stickerSet.id+'" style="height: '+height+'px;">';

			for (let sticker of stickerSet._stickers) {
				if (sticker.tgs) {
					// animated sticker
					html += '<div class="animated '+(col == 4 ? 'animatedNoPadd' : '')+'" id="animated_'+sticker._id+'" data-set="'+stickerSet.id+'" data-id="'+sticker._id+'"></div>';
				} else {
					html += '<span class="'+(col == 4 ? 'animatedNoPadd' : '')+'" id="notanimated_'+sticker._id+'" data-set="'+stickerSet.id+'" data-id="'+sticker._id+'"></span>';
				}
				if (!navigationHTML) {
					if (sticker.tgs) {
						navigationHTML = '<div class="stickersCat stickersCat_'+stickerSet.id+'" data-id="'+stickerSet.id+'" data-target="'+this.escapeHTML(stickerSet.name)+'" id="animatedCat_'+stickerSet.id+'"></div>';
						hasAnimated = true;
						// this.nextTick(()=>{
						// 	this.startAnimationsOn(stickerSet.id);
						// });
					} else {
						navigationHTML = '<div class="stickersCat stickersCat_'+stickerSet.id+'" data-id="'+stickerSet.id+'" data-target="'+this.escapeHTML(stickerSet.name)+'"></div>';
					}
				}

				col++;
				if (col == 5) {
					col = 0;
					row++;
				}
			}

		html+='</div>';

		stickersVisibleDiv.innerHTML = html;
		// stickersVisibleDiv.style.display = 'block';

		this.__stickersDivReady[stickerSet.id] = true;

		/// also add sticker button to navigation
		const catsDiv = this.$('#stickersCatsScrollContainer');
		const alreadyCat = this.$('.stickersCat_'+stickerSet.id);

		if (hasAnimated) {
			this._animatedStickersToInit[stickerSet.id] = true;
		}

		if (!alreadyCat) {
			if (toTheStart) {
				catsDiv.insertAdjacentHTML('afterbegin', navigationHTML);
			} else {
				// try to find prev stickerset it
				let foundSibling = false;
				if (stickersDiv.previousSibling && stickersDiv.previousSibling.dataset && stickersDiv.previousSibling.dataset.id) {
					let prevSiblingCatEl = this.$('.stickersCat_'+stickersDiv.previousSibling.dataset.id);
					if (prevSiblingCatEl) {
						prevSiblingCatEl.insertAdjacentHTML('afterend', navigationHTML);
						foundSibling = true;
					}
				}
				if (!foundSibling) {
					catsDiv.insertAdjacentHTML('beforeend', navigationHTML);
				}
			}
		}

		// EmojiDialog.__stickersHTML = this.$('#stickersList').innerHTML;

		this.calcStickersScrollOffsets(true);
		if (hasAnimated && this.isVisible) {
			this.startAnimationsOn(stickerSet.id);
		}
	}

	rerenderStickers(what) {
		/// what - loaded stickerSet or null if all stickers loaded
		// if (!what) {
			let html = this.getRecentStickerSetHTML();
			// let i = 0;
			// for (let stickerSet of this._data.stickers) {
			// 	i++;
			// 	html+=this.getStickerSetHTML(stickerSet);
			// }
			this.$('#stickersList').innerHTML = html;
			// EmojiDialog.__stickersHTML = html;
			this.calcStickersScrollOffsets(true);

			this.nextTick(()=>{
				this.startAnimationsOnRecent();
			});
		// } else {
		// 	this.fillStickerSetDOM(what);
		// }

		this.onStickersScroll();
	}


	onStickersOver(e) {
		const base = this.$('#stickersList');
		const closest = e.target.closest('.animated');

		if (closest && base.contains(closest)) {
			if (closest.dataset && closest.dataset.id && this._lastStickerToAnimate != closest.dataset.id) {
				let tgss = this._tgss;
				if (closest.dataset.set == 'Recent') {
					tgss = this._recentTGSs;
				}

				console.error(closest.dataset);

				if (tgss[closest.dataset.id]) {
					this._lastStickerToAnimate = closest.dataset.id;
					if (this._playStickerTimeout) {
						clearTimeout(this._playStickerTimeout);
					}
					this._playStickerTimeout = setTimeout(()=>{
						console.error(tgss[closest.dataset.id], 'once');
						tgss[closest.dataset.id].playOnce();
					}, 200);
				}
			}
		}
	}

	async stickersUpdated(what) {
		this._data.stickers = await this._app._peerManager._stickers.getStickers();
		this.rerenderStickers(what);
	}

	addStickerToRecent(sticker) {
		// if already there - skip
		let recentStickers = this._app._peerManager._stickers._recentStickers;
		for (let recentSticker of recentStickers) {
			if (recentSticker.id == sticker.id) {
				return true;
			}
		}

		recentStickers.push(sticker);

		let toAddHTML = '';
		if (sticker.tgs) {
			toAddHTML = '<div class="animated recentSticker" id="recentAnimated_'+sticker._id+'" data-set="Recent" data-id="'+sticker._id+'"></div>';
		} else {
			toAddHTML = '<span id="recentSticker_'+sticker._id+'" class="recentSticker" data-set="Recent" data-id="'+sticker._id+'"></span>';
			sticker.load()
				.then((blobURL)=>{
					if (blobURL) {
						const el = this.$('#recentSticker_'+sticker.id);
						if (el) {
							el.style.backgroundImage = "url('"+blobURL+"')";
						}
					}
				});
		}

		const recentContainer = this.$('#stickersDiv_Recent');
		if (recentContainer && recentContainer.querySelector('h5')) {
			recentContainer.querySelector('h5').insertAdjacentHTML('afterend', toAddHTML);
		}

		/// update dom
		let countToHeight = recentStickers.length;
		if (countToHeight > 10) {
			countToHeight = 10;
		}
		let height = Math.ceil(countToHeight / 5) * 80;
		this.$('#stickerInVisible_Recent').style.height = ''+height+'px';

		/// get rid of >10 items
		let els = this.$$('.recentSticker');
		if (els.length > 10) {
			for (let i = 10; i < els.length; i++) {
				if (els[i].dataset && els[i].dataset.id && this._recentTGSs[els[i].dataset.id]) {
					// this._recentTGSs[els[i].dataset.id].destroy();
					delete this._recentTGSs[els[i].dataset.id];
					delete this._recentTGSsAsked[els[i].dataset.id];
				}
				els[i].parentNode.removeChild(els[i]);
			}
		}

		this.calcStickersScrollOffsets(true);

		this.startAnimationsOnRecent();
	}

	getRecentStickerSetHTML() {
		if (!this._recentTGSs) {
			this._recentTGSs = {};
		}
		let html = '';

		html += '<div data-name="Recent" data-id="Recent" class="stickersDiv" id="stickersDiv_Recent">';
		html += '<h5>Recent</h5>';

		// calculate height based on expected stickers count
		// 5 per row, 65px height + 10px margin
		let recentStickers = this._app._peerManager._stickers._recentStickers;
		let height = Math.ceil(recentStickers.length / 5) * 80;
		html += '<div id="stickerInVisible_Recent" style="height: '+height+'px;" class="stickerInVisible">';
		html += '<div id="stickerVisible_Recent" class="stickerVisible" style="display: none; height: '+height+'px;">';

		let row = 0;
		let col = 0;
		for (let recentSticker of recentStickers) {
			if (recentSticker.tgs) {
				// animated sticker
				html += '<div class="animated '+(col == 4 ? 'animatedNoPadd' : '')+' recentSticker" id="recentAnimated_'+recentSticker._id+'" data-set="Recent" data-id="'+recentSticker._id+'"></div>';
			} else {
				html += '<span id="recentSticker_'+recentSticker._id+'" class="recentSticker '+(col == 4 ? 'animatedNoPadd' : '')+'" data-set="Recent" data-id="'+recentSticker._id+'"></span>';
				recentSticker.load()
					.then((blobURL)=>{
						if (blobURL) {
							const el = this.$('#recentSticker_'+recentSticker.id);
							if (el) {
								el.style.backgroundImage = "url('"+blobURL+"')";
							}
						}
					});
			}

			col++;
			if (col == 5) {
				col = 0;
				row++;
			}
		}

		html += '</div>'; // stickerVisible_
		html += '</div>'; // stickerInVisible_

		html += '</div>'; // stickersDiv_

		return html;

	}

	getStickerSetHTML(stickerSet) {
		let html = '';

		html += '<div data-name="'+this.escapeHTML(stickerSet.name)+'" data-id="'+stickerSet.id+'" class="stickersDiv" id="stickersDiv_'+stickerSet.id+'">';
		html += '<h5>'+this.escapeHTML(stickerSet.name)+'</h5>';

		// calculate height based on expected stickers count
		// 5 per row, 65px height + 10px margin
		let height = Math.ceil(stickerSet.count / 5) * 80;
		html += '<div id="stickerInVisible_'+stickerSet.id+'" style="height: '+height+'px;" class="stickerInVisible">';
		html += '<div id="stickerVisible_'+stickerSet.id+'" class="stickerVisible">';

		let loadingOffset = Math.floor(height / 2);
		html += '<div class="cssload-zenith dark" style="margin-top: '+loadingOffset+'px;"></div>';

		html += '</div>'; // stickerVisible_
		html += '</div>'; // stickerInVisible_

		html += '</div>'; // stickersDiv_

		return html;
	}


	async startAnimationsOnRecent() {
		if (!this.isVisible) {
			// we don't want to start animation when div is hidden
			return false;
		}

		let recentStickers = this._app._peerManager._stickers._recentStickers;
		for (let recentSticker of recentStickers) {
			if (recentSticker.tgs && !this._recentTGSs[recentSticker.id] && !this._recentTGSsAsked[recentSticker.id]) {
				const el = this.$('#recentAnimated_'+recentSticker._id);

				if (el && this.isVisible) {

					this._recentTGSsAsked[recentSticker.id] = true;
					const json = await recentSticker.load();

					this._recentTGSs[recentSticker.id] = new TGS(el);
					this._recentTGSs[recentSticker.id].setJSON(json, true, true, recentSticker);
				}

			}
		}
	}

	async setCatHTML(set) {
		let sticker = set._stickers[0];
		let data = await sticker.load();
		if (sticker._isAnimated) {
			const tgs = new TGS(this.$('#animatedCat_'+set._id));
			tgs.setJSON(data, true, true); // do not start
		} else {
			// alert(data)
			(this.$('.stickersCat_'+set._id) && (this.$('.stickersCat_'+set._id).style.backgroundImage = "url('"+data+"')"));
		}
	}

	async startAnimationsOn(stickerSetId) {
		if (this._animatedStickersIniting[stickerSetId]) {
			return false;
		}
		this._animatedStickersIniting[stickerSetId] = true;
		let r = ()=>{
			delete this._animatedStickersIniting[stickerSetId];
		};
		if ((!this._animatedStickersToInit[stickerSetId]) ||
			(!this.isVisible) ||
			(!this.__stickersDivReady || !this.__stickersDivReady[stickerSetId])) {
			r(); return false;
		}

		let isContentVisible = false;

		/// determine if div with content is visible
		const vDiv = this.$('#stickerVisible_'+stickerSetId);
		if (vDiv && vDiv.style.display == 'block') {
			isContentVisible = true;
		} else {
			isContentVisible = false;
		}
		///
		if (!isContentVisible) {
			r(); return false;
		}

		let stickerSet = this._app._peerManager._stickers.byId(stickerSetId);
		console.error('animation on', stickerSet);
		if (stickerSet) {
			for (let sticker of stickerSet._stickers) {
				if (vDiv && vDiv.style.display == 'block') {
					isContentVisible = true;
				} else {
					isContentVisible = false;
				}

				if (!isContentVisible) {
					r(); return false;
				}

				const json = await sticker.load();

				if (json && !this._tgss[sticker._id] && this.isVisible) {
					try {
						// animatedCat_
						const tgs = new TGS(this.$('#animated_'+sticker._id));
						tgs.setJSON(json, true, true, sticker); // do not start
					// .setJSON(json, true, true, async()=>{
					// 					// function to restore sticker data in case it's freed from  memory
					// 					let json = await recentSticker.load();
					// 					return json;
					// 				});
						this._tgss[sticker._id] = tgs;
					} catch(e) {
						console.error(e);
					}

					await new Promise((res)=>{ setTimeout(res, 150); });
				}
			}
		}

		// free stickerset memory
		// this._app._peerManager._stickers.free(stickerSetId);

		if (this._animatedStickersToInit[stickerSetId] && isContentVisible && this.isVisible) {
			delete this._animatedStickersToInit[stickerSetId];
		} else {
			r(); return false;
		}
	}

	onStickersScroll(e) {
		let scrollTop = 0;
		if (e && e.target) {
			scrollTop = e.target.scrollTop;
		} else {
			if (e == 'force') {
				this._lastStickersScrollTop = null;
			}
			scrollTop = this.$('#stickersList').scrollTop;
		}

		if (this._lastStickersScrollTop && Math.abs(this._lastStickersScrollTop - scrollTop) < 20) {
			return;
		}
		this._lastStickersScrollTop = scrollTop;

		let offsets = this.calcStickersScrollOffsets();
		let containerHeight = 400;
		let set = false;

		let setOffsetI = 0;
		let i = 1;

		for (let offset of offsets) {
			// current stickerSet
			if (scrollTop >= offset.offsetTop && !set) {
				if (offset.cat) {
					offset.cat.classList.add('active');
					setOffsetI = i;
				}
				set = true;
			} else {
				if (offset.cat) {
					offset.cat.classList.remove('active');
				}
			}

			if (scrollTop + containerHeight >= offset.offsetTop &&  scrollTop  <= (offset.offsetTop + offset.height) ) {
				// show block
				this.$('#stickerVisible_'+offset.id).style.display = 'block';
				if (this.__stickersDivReady[offset.id] && this._animatedStickersToInit[offset.id]) {
					this.startAnimationsOn(offset.id);
				}
			} else {
				// hide block
				this.$('#stickerVisible_'+offset.id).style.display = 'none';
				// this.stopAnimationOn(offset.id);
			}

			i++;
		}
		if (!set) {
			if (offsets[offsets.length-1] && offsets[offsets.length-1].cat) {
				offsets[offsets.length-1].cat.classList.add('active');
				setOffsetI = offsets.length;
			}
		}

		/// scroll cats div based on current set
		let catItemWidth = 62;
		let expectedScroll = catItemWidth * (offsets.length - setOffsetI);
		expectedScroll = expectedScroll - catItemWidth * 3;
		if (expectedScroll < 0) {
			expectedScroll = 0;
		}

		if (setOffsetI) {
			document.querySelector('#stickersCatsScroll').scrollLeft = expectedScroll;
		}
	}

	calcStickersScrollOffsets(forceRecalc) {
		if (this.__stickersDivOffsets && !forceRecalc) {
			return this.__stickersDivOffsets;
		}

		let offsets = [];
		// let parentEl = this.$('#stickersList');
		// let parentOffset = parentEl ? parentEl.offsetTop : 0;
		let stickersDivs = this.$$('.stickersDiv');

		let parentOffset = 0; // if position: relative;

		for (let stickersDiv of stickersDivs) {
			let offset = {
				targetName: stickersDiv.dataset.name,
				id: stickersDiv.dataset.id,
				offsetTop: stickersDiv.offsetTop - parentOffset,
				height: stickersDiv.offsetHeight,
			};

			offsets.push(offset);
		}

		let stickersCats = this.$$('.stickersCat');
		for (let stickersCat of stickersCats) {
			for (let offset of offsets) {
				if (stickersCat.dataset.target == offset.targetName) {
					offset.cat = stickersCat;
				}
			}
		}

		offsets.reverse();
		this.__stickersDivOffsets = offsets;

		return this.__stickersDivOffsets;
	}

	onStickerCatClick(e) {
		const base = this.$('#stickersCats');
		const closest = e.target.closest('.stickersCat');

		if (closest && base.contains(closest)) {
			let targetName = closest.dataset.target;
			let contentDiv = this.$('.stickersList');
			let targetDiv = null;
			let stickersDivs = this.$$('.stickersDiv');

			for (let stickersDiv of stickersDivs) {
				if (stickersDiv.dataset && stickersDiv.dataset.name == targetName) {
					targetDiv = stickersDiv;
				}
			}

			if (targetDiv && contentDiv) {
				// let parentEl = this.$('#stickersList');
				// let parentOffset = parentEl ? parentEl.offsetTop : 0;
				let parentOffset = 0;

				contentDiv.scrollTop = targetDiv.offsetTop - parentOffset;
			}
		}
	}



};

Stickers.template = `
		{{if (options.initialized)}}
		<div class="stickersCats active" id="stickersCats">
			<div data-target="Recent" class="stickersCat stickersCatRecent">{{component(options.components.IconRecent)}}{{/component}}</div>
			<div class="stickersCatsScroll" id="stickersCatsScroll">
				<div class="stickersCatsScrollContainer" id="stickersCatsScrollContainer">
				</div>
			</div>
		</div>
		<div class="stickersList active emojiScroll" id="stickersList"></div>
		{{#else}}
		<div class="appLoading">
			<div class="cssload-zenith dark"></div>
		</div>
		{{/if}}
		`;

module.exports = Stickers;
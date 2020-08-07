const UI = window.classes.UI;
const AppIcon = require('../icons/AppIcon.js');
const TGS = window.classes.TGS;

const AppUI = require('../../utils/AppUI.js');

alert('remove me');

class EmojiDialog extends AppUI {
	constructor(params) {
		super(params);

		this._components['IconSmile'] = this.newC(AppIcon, {icon: 'smile'});

		this._components['IconRecent'] = this.newC(AppIcon, {icon: 'recent'});
		this._components['IconAnimal'] = this.newC(AppIcon, {icon: 'animal'});
		this._components['IconEats'] = this.newC(AppIcon, {icon: 'eats'});
		this._components['IconCar'] = this.newC(AppIcon, {icon: 'car'});
		this._components['IconSport'] = this.newC(AppIcon, {icon: 'sport'});
		this._components['IconLamp'] = this.newC(AppIcon, {icon: 'lamp'});
		this._components['IconFlag'] = this.newC(AppIcon, {icon: 'flag'});

		this._events = [
			['click', 'emojiNav', 'onNavClick'],

			['scroll', 'emojiList', 'onScroll'],
			['click', 'emojiList', 'onClick'],
			['click', 'emojiCats', 'onCatClick'],

			['nodebouncescroll', 'stickersList', 'onStickersScroll'],
			['click', 'stickersList', 'onStickerClick'],
			['click', 'stickersCats', 'onStickerCatClick'],
			['mouseover', 'stickersList', 'onStickersOver'],

			['mouseenter', 'emojiTop', 'onMouseEnter'],
			['mouseleave', 'emojiTop', 'onMouseLeave'],

		];

		this._data.what = 'emoji';
		this._data.initialized = false;

		this.isVisible = false; // just getter, we need to know if it's visible to initialize tgs animations only when it is.

		this._data.stickers = [];

		this._data.mostRecentEmoji = [];
		this._data.emojiData = {};

		this._animatedStickersToInit = {};   /// need to keep ids to initialize lottie when divs are visible
		this._animatedStickersCatToInit = {};
		this._animatedStickersIniting = {};

		this._tgss = {};  /// refs to TGS objects

		this._recentTGSs = {};  /// refs to TGS objects of recent stickers
		this._recentTGSsAsked = {}; /// is recent TGS asked to initialize

		this._lastStickerToAnimate = null;

		// setTimeout(()=>{
		// 	this.init();
		// }, 1000);
		// this.init(); // do not wait @todo: switch on
	}

	async init() {
		if (await this.sureSingle('init')) return false;

		this._data.emojiData = await this.loadJSON('./assets/data/emoji.json');

		this._app._peerManager._stickers.on('loaded', (what)=>{
				this.stickersUpdated(what);
			}); // fired when stickers or some sticker pack is loaded
		this._app._peerManager._stickers.on('uninstalled', (stickerSet)=>{
				this.stickerSetUninstalled(stickerSet);
			});
		this._app._peerManager._stickers.on('installed', (stickerSet)=>{
				this.stickerSetInstalled(stickerSet);
			});

		this._app._peerManager._stickers.getAllStickers();

		this._data.initialized = true;
		this.render();
		this.fulfilSingle('init', true);
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

	initializeSidebars() {
		if (!this._emojiPs) {
			this._emojiPs = new window.classes.PerfectScrollbar(this.$('#emojiList'), {
				wheelSpeed: 1,
				wheelPropagation: false,
				minScrollbarLength: 40,
				suppressScrollX: true,
			});
		}
		if (!this._stickersPs) {
			this._stickersPs = new window.classes.PerfectScrollbar(this.$('#stickersList'), {
				wheelSpeed: 1,
				wheelPropagation: false,
				minScrollbarLength: 40,
				suppressScrollX: true,
			});
		}
	}

	async show(atX, atY) {
		if (this.__leaveInterval) {
			clearInterval(this.__leaveInterval);
		}
		if (atX && atY) {
			await this.init();

			this.$('#emojiTop').style.display = 'block';
			this.$('.emojiBubble').style.left = atX+'px';
			this.$('.emojiBubble').style.top = atY+'px';

			this.calcStickersScrollOffsets(true);
			this.initializeSidebars();

			setTimeout(()=>{
				this.onStickersScroll('force');
			}, 500);
		}
		this.$('.emojiBubble').classList.add('active');

		this.isVisible = true;
		this._app._peerManager._stickers.setLoadingMode('fast');
	}

	hide() {
		this.$('.emojiBubble').classList.remove('active');

		this.isVisible = false;
		this._app._peerManager._stickers.setLoadingMode('slow');
	}

	onMouseLeave() {
		if (this.__leaveInterval) {
			clearInterval(this.__leaveInterval);
		}
		this.__leaveInterval = setInterval(()=>{
			this.hide();
		}, 1000);
	}

	onMouseEnter() {
		if (this.__leaveInterval) {
			clearInterval(this.__leaveInterval);
		}
		this.show(true);
	}


	async stickerSetUninstalled(stickerSet) {
		if (!this.__stickersDivReady) {
			this.__stickersDivReady = {};
		}
		if (!this.__animationsStarted) {
			this.__animationsStarted = {};
		}

		// this.stopAnimationOn(stickerSet._id);

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

		delete this._animatedStickersCatToInit[stickerSet._id];
		delete this._animatedStickersToInit[stickerSet._id];

		this.calcStickersScrollOffsets(true);
		this.onStickersScroll();
	}

	async stickerSetInstalled(stickerSet) {
		if (!this.__stickersDivReady) {
			this.__stickersDivReady = {};
		}

		let html = this.getStickerSetHTML(stickerSet);
		let insertBefore = this.$('.stickersDiv');

		if (insertBefore) {
			/// after the recent
			insertBefore.insertAdjacentHTML('afterend', html);
		} else {
			this.$('#stickersList').innerHTML = html;
		}

		this.fillStickerSetDOM(stickerSet, true);
		this.calcStickersScrollOffsets(true);
	}

	addStickerToRecent(sticker) {
		if (!this._recentTGSs) {
			this._recentTGSs = {};
		}

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
					this._recentTGSs[els[i].dataset.id].destroy();
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
		html += '<div id="stickerVisible_Recent" class="stickerVisible" style="display: none;">';

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

	fillStickerSetDOM(stickerSet, toTheStart) {
		const stickersDiv = this.$('#stickersDiv_'+stickerSet.id);
		const stickersVisibleDiv = this.$('#stickerVisible_'+stickerSet.id);

		if (stickersVisibleDiv) {
			let html = '';
			let navigationHTML = '';
			let row = 0;
			let col = 0;

			let height = Math.ceil(stickerSet.count / 5) * 80;
			let hasAnimated = false;

			html+='<div class="stickersHandler" data-set="'+stickerSet.id+'" style="background-position top left; background-repeat: no-repeat; background-image: url('+stickerSet._spriteBlobURL+'); height: '+height+'px;">';

				for (let sticker of stickerSet._stickers) {
					if (sticker.tgs) {
						// animated sticker
						html += '<div class="animated '+(col == 4 ? 'animatedNoPadd' : '')+'" id="animated_'+sticker._id+'" data-set="'+stickerSet.id+'" data-id="'+sticker._id+'"></div>';
					} else {
						html += '<span class="'+(col == 4 ? 'animatedNoPadd' : '')+'" data-set="'+stickerSet.id+'" data-id="'+sticker._id+'"></span>';
					}
					if (!navigationHTML) {
						if (sticker.tgs) {
							navigationHTML = '<div class="stickersCat stickersCat_'+stickerSet.id+'" data-id="'+stickerSet.id+'" data-target="'+this.escapeHTML(stickerSet.name)+'" id="animatedCat_'+stickerSet.id+'"></div>';
							hasAnimated = true;
							// this.nextTick(()=>{
							// 	this.startAnimationsOn(stickerSet.id);
							// });
						} else {
							navigationHTML = '<div class="stickersCat stickersCat_'+stickerSet.id+'" data-id="'+stickerSet.id+'" data-target="'+this.escapeHTML(stickerSet.name)+'" style="background-image: url('+sticker.blobURL+');"></div>';
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

				if (hasAnimated) {
					this._animatedStickersCatToInit[stickerSet.id] = true;
				}
			}

			// EmojiDialog.__stickersHTML = this.$('#stickersList').innerHTML;

			this.calcStickersScrollOffsets(true);
			if (hasAnimated) {
				this.startAnimationsOn(stickerSet.id);
			}
		}
	}

	async stickersUpdated(what) {
		this._data.stickers = await this._app._peerManager._stickers.getStickers();
		this.rerenderStickers(what);
	}

	rerenderStickers(what) {
		if (!this.__stickersDivReady) {
			this.__stickersDivReady = {};
		}
		/// what - loaded stickerSet or null if all stickers loaded


		if (!what) {
			let html = '';
			html+=this.getRecentStickerSetHTML();
			let i = 0;
			for (let stickerSet of this._data.stickers) {
				i++;
				html+=this.getStickerSetHTML(stickerSet);
			}
			this.$('#stickersList').innerHTML = html;
			// EmojiDialog.__stickersHTML = html;
			this.calcStickersScrollOffsets(true);
			this.startAnimationsOnRecent();
		} else {
			this.fillStickerSetDOM(what);
		}

		if (what) {
			this.onStickersScroll();
		}
	}

	async startAnimationsOnRecent() {
		if (!this.isVisible || this._data.what != 'stickers') {
			// we don't want to start animation when div is hidden
			return false;
		}

		let recentStickers = this._app._peerManager._stickers._recentStickers;
		for (let recentSticker of recentStickers) {
			if (recentSticker.tgs && !this._recentTGSs[recentSticker.id] && !this._recentTGSsAsked[recentSticker.id]) {
				const el = this.$('#recentAnimated_'+recentSticker._id);

				this._recentTGSsAsked[recentSticker.id] = true;
				const json = await recentSticker.load();

				this._recentTGSs[recentSticker.id] = new TGS(el);
				this._recentTGSs[recentSticker.id].setJSON(json, true, true, async()=>{
					// function to restore sticker data in case it's freed from  memory
					let json = await recentSticker.load();
					return json;
				});
			}
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
		if ((!this._animatedStickersToInit[stickerSetId] && !this._animatedStickersCatToInit[stickerSetId]) ||
			(!this.isVisible || this._data.what != 'stickers') ||
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
		if (!this._animatedStickersCatToInit[stickerSetId] && !isContentVisible) {
			r(); return false;
		}

		let animationData = await this._app._peerManager._stickers.getAnimatedStickersData(stickerSetId);

		let catInitialized = false;

		for (let id in animationData) {
			if (vDiv && vDiv.style.display == 'block') {
				isContentVisible = true;
			} else {
				isContentVisible = false;
			}

			if (!isContentVisible) {
				r(); return false;
			}

			if (this._animatedStickersToInit[stickerSetId] && !this._tgss[id]) {
				try {
					// animatedCat_
					const tgs = new TGS(this.$('#animated_'+id));
					const sticker = this._app._peerManager._stickers._stickersIds[id];

					tgs.setJSON(animationData[id], true, true, async()=>{
						return await sticker.load();
					}); // do not start
				// .setJSON(json, true, true, async()=>{
				// 					// function to restore sticker data in case it's freed from  memory
				// 					let json = await recentSticker.load();
				// 					return json;
				// 				});
					this._tgss[id] = tgs;
				} catch(e) {
					console.error(e);
				}

				await new Promise((res)=>{ setTimeout(res, 250); });
			}

			if (!catInitialized) {
				if (this._animatedStickersCatToInit[stickerSetId]) {
					const tgs = new TGS(this.$('#animatedCat_'+stickerSetId));
					tgs.setJSON(animationData[id], true, true); // do not start
					delete this._animatedStickersCatToInit[stickerSetId];
				}
				catInitialized = true;
			}

		}

		// free stickerset memory
		this._app._peerManager._stickers.free(stickerSetId);

		if (this._animatedStickersToInit[stickerSetId] && isContentVisible) {
			delete this._animatedStickersToInit[stickerSetId];
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
		expectedScroll = expectedScroll - catItemWidth * 2;
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



	switchType(what) {
		this._data.what = what;
		let types = ['emoji', 'stickers'];
		for (let type of types) {
			if (type == what) {
				this.$('#'+what+'List').classList.add('active');
				this.$('#'+what+'Cats').classList.add('active');
			} else {
				this.$('#'+type+'List').classList.remove('active');
				this.$('#'+type+'Cats').classList.remove('active');
			}
		}

		let navItems = this.$$('.emojiNavItem');
		for (let navItem of navItems) {
			if (navItem.dataset && navItem.dataset.what == what) {
				navItem.classList.add('active');
			} else {
				navItem.classList.remove('active');
			}
		}

		if (what == 'emoji') {
			this.calcScrollOffsets(true);
		} else if (what == 'stickers') {
			this.calcStickersScrollOffsets(true);

			this.startAnimationsOnRecent();

			this.onStickersScroll('force');

			// start animations on visible divs
			let f = async ()=>{
				for (let key in this._animatedStickersToInit) {
					await this.startAnimationsOn(key);
				}

				this.onStickersScroll('force');
			};

			f();
		}
	}


	onNavClick(e) {
		const base = this.$('#emojiNav');
		const closest = e.target.closest('.emojiNavItem');

		if (closest && base.contains(closest)) {
			let what = closest.dataset.what;
			this.switchType(what);
		}
	}

	addToMostRecent(emoji) {
		if (this._data.mostRecentEmoji.indexOf(emoji) === -1) {
			this._data.mostRecentEmoji.unshift(emoji);
			this._data.mostRecentEmoji = this._data.mostRecentEmoji.slice(0, 18);
		}

		let html = '';
		for (let re of this._data.mostRecentEmoji) {
			html+='<span>'+re+'</span>';
		}
		this.$('#recentEmoji').innerHTML = html;
		this.calcScrollOffsets(true);
	}

	onClick(e) {
		const base = this.$('#emojiList');
		const closest = e.target.closest('span');

		if (closest && base.contains(closest)) {
			this.emit('emoji', closest.innerHTML);
			this.addToMostRecent(closest.innerHTML);
		}
	}

	onStickerClick(e) {
		const base = this.$('#stickersList');
		let closest = e.target.closest('span');
		if (!closest) {
			closest = e.target.closest('.animated');
		}

		if (closest && base.contains(closest)) {
			if (closest.dataset.set == 'Recent') {
				let recentStickers = this._app._peerManager._stickers._recentStickers;
				for (let recentSticker of recentStickers) {
					if (recentSticker.id == closest.dataset.id) {
						this.emit('sticker', recentSticker);
						this.hide();
						return;
					}
				}
			} else {
				for (let set of this._data.stickers) {
					if (set.id == closest.dataset.set) {
						for (let doc of set.documents) {
							if (doc.id == closest.dataset.id) {
								this.emit('sticker', doc);
								this.addStickerToRecent(doc);
								this.hide();
								return;
							}
						}
					}
				}
			}

		}
	}

	calcScrollOffsets(forceRecalc) {
		if (this.__emojiDivOffsets && !forceRecalc) {
			return this.__emojiDivOffsets;
		}

		let offsets = [];
		// let parentEl = this.$('#emojiList');
		// let parentOffset = parentEl ? parentEl.offsetTop : 0;
		let parentOffset = 0; // if position: relative

		let emojiDivs = this.$$('.emojiDiv');
		for (let emojiDiv of emojiDivs) {
			let offset = {
				targetName: emojiDiv.dataset.name,
				offsetTop: emojiDiv.offsetTop - parentOffset,
			};

			offsets.push(offset);
		}

		let emojiCats = this.$$('.emojiCat');
		for (let emojiCat of emojiCats) {
			for (let offset of offsets) {
				if (emojiCat.dataset.target == offset.targetName) {
					offset.cat = emojiCat;
				}
			}
		}

		offsets.reverse();
		this.__emojiDivOffsets = offsets;

		return offsets;
	}


	onScroll(e) {
		this.initializeSidebars();
		if (e && e.target) {
			let scrollTop = e.target.scrollTop;

			let offsets = this.calcScrollOffsets();
			let set = false;
			for (let offset of offsets) {
				if (scrollTop >= offset.offsetTop && !set) {
					offset.cat.classList.add('active');
					set = true;
				} else {
					offset.cat.classList.remove('active');
				}
			}

			if (!set) {
				offsets[offsets.length-1].cat.classList.add('active');
			}
		}
	}


	onCatClick(e) {
		const base = this.$('#emojiCats');
		const closest = e.target.closest('.emojiCat');

		if (closest && base.contains(closest)) {
			let targetName = closest.dataset.target;
			let contentDiv = this.$('.emojiList');
			let targetDiv = null;
			let emojiDivs = this.$$('.emojiDiv');

			for (let emojiDiv of emojiDivs) {
				if (emojiDiv.dataset && emojiDiv.dataset.name == targetName) {
					targetDiv = emojiDiv;
				}
			}

			if (targetDiv && contentDiv) {
				// let parentEl = this.$('#emojiList');
				// let parentOffset = parentEl ? parentEl.offsetTop : 0;
				let parentOffset = 0;

				contentDiv.scrollTop = targetDiv.offsetTop - parentOffset;
			}
		}
	}


};

EmojiDialog.template = `
			<div id="emojiTop" style="display: none;">
				{{if (options.initialized)}}
				<div class="emojiBubble">
					<div class="emojiBubbleContainer">
						<div class="emojiNav" id="emojiNav">
							<div class="emojiNavItem {{if (options.what == 'emoji')}}active{{/if}}" data-what="emoji">Emoji</div>
							<div class="emojiNavItem {{if (options.what == 'stickers')}}active{{/if}}" data-what="stickers">Stickers</div>
							<div class="emojiNavItem {{if (options.what == 'gifs')}}active{{/if}}">GIFs</div>
						</div>
						<div class="emojiList {{if (options.what == 'emoji')}}active{{/if}}" id="emojiList">
								<div data-name="Recent" class="emojiDiv">
									<h5>Recent</h5>

									<div id="recentEmoji">
									{{each(options.mostRecentEmoji)}}
										<span>{{@this}}</span>
									{{/each}}
									</div>
								</div>
							{{foreach(options.emojiData)}}
								<div data-name="{{@key}}" class="emojiDiv">
									<h5>{{@key}}</h5>
									{{each(@this)}}<span>{{@this}}</span>{{/each}}
								</div>
							{{/foreach}}
						</div>
						<div class="stickersList {{if (options.what == 'stickers')}}active{{/if}}" id="stickersList">

						</div>

						<div class="emojiCats {{if (options.what == 'emoji')}}active{{/if}}" id="emojiCats">
							<div data-target="Recent" class="emojiCat">{{component(options.components.IconRecent)}}{{/component}}</div>
							<div data-target="Smileys & Emotion" class="emojiCat">{{component(options.components.IconSmile)}}{{/component}}</div>
							<div data-target="Animals & Nature" class="emojiCat">{{component(options.components.IconAnimal)}}{{/component}}</div>
							<div data-target="Food & Drink" class="emojiCat">{{component(options.components.IconEats)}}{{/component}}</div>
							<div data-target="Travel & Places" class="emojiCat">{{component(options.components.IconCar)}}{{/component}}</div>
							<div data-target="Activities" class="emojiCat">{{component(options.components.IconSport)}}{{/component}}</div>
							<div data-target="Objects" class="emojiCat">{{component(options.components.IconLamp)}}{{/component}}</div>
							<div data-target="Flags" class="emojiCat">{{component(options.components.IconFlag)}}{{/component}}</div>
						</div>

						<div class="stickersCats {{if (options.what == 'stickers')}}active{{/if}}" id="stickersCats">
							<div data-target="Recent" class="stickersCat stickersCatRecent">{{component(options.components.IconRecent)}}{{/component}}</div>
							<div class="stickersCatsScroll" id="stickersCatsScroll">
								<div class="stickersCatsScrollContainer" id="stickersCatsScrollContainer">
								</div>
							</div>
						</div>

					</div>
					<div class="emojiOver">

					</div>
				</div>
				{{/if}}
			</div>
		`;

module.exports = EmojiDialog;




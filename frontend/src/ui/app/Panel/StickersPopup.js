const UI = window.classes.UI;
const AppIcon = require('../../icons/AppIcon.js');
const Button = window.classes.Button;
const UIInput = window.classes.UIInput;
const TGS = window.classes.TGS;

class StickersPopup extends UI {
	constructor(params) {
		super(params);

		this._components.CloseIcon = this.newC(AppIcon, {icon: 'close'});
		this._components.Button = this.newC(Button, {title: 'Add', loadingTitle: 'Adding...'});

		this._events = [
			['click', 'stickersPopupClose', 'onClose'],
			['click', 'emojiPopupTop', 'onClickOut'],
			['mouseover', 'stickersPreviewItems', 'onMouseOver']
		];

		this._componentEvents = [
			['click', 'Button', 'onButtonClick'],
		];

		this._files = [];
		this._tgss = {};
		this._uploadingMedia = false;

		this._isStickerSetInstalled = false;

		this._playStickerTimeout = null;
		this._lastStickerId = null;
	}

	onMouseOver(e) {
		const base = this.$('#stickersPreviewItems');
		const closest = e.target.closest('.previewStickerItem');

		if (closest && base.contains(closest)) {
			if (closest.dataset && closest.dataset.id && this._lastStickerId != closest.dataset.id) {
				if (this._tgss[closest.dataset.id]) {
					this._lastStickerId = closest.dataset.id;
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

	onClickOut(e) {
		let thingsToMiss = ['.popup'];
		for (let thingToMiss of thingsToMiss) {
			if (e.target.closest(thingToMiss)) {
				return false;
			}
		}

		this.hide();
	}

	onButtonClick() {
		if (this._stickerSet) {
			if (this._isStickerSetInstalled) {
				this._peerManager._stickers.uninstallStickerSet(this._stickerSet);
				this.hide();
			} else {
				this._peerManager._stickers.installStickerSet(this._stickerSet);
				this.hide();
			}
		}
	}

	reinitScrollBar(forceReInit) {
		let container = this.$('.stickersPreview');
		this.initScrollBarOn(container, forceReInit);
	}

	afterRender() {
		this.reinitScrollBar(true);
	}

	buttonLoading(loading) {
	}

	onClose() {
		this.hide();
	}

	async initializeNextAnimation() {
		if (!this._initializedAnimationOn) {
			this._initializedAnimationOn = {};
		}
		for (let doc of this._stickerSet._stickers) {
			if (doc.tgs && !this._initializedAnimationOn[''+doc._id]) {
				if (doc.json) {
					if (this.$('#animated_'+doc.id)) {
						const tgs = new TGS(this.$('#animated_'+doc.id));
						tgs.setJSON(doc.json, true);
						this._tgss[doc.id] = tgs;
					}
				}

				this._initializedAnimationOn[''+doc._id] = true;

				await new Promise((res)=>{ setTimeout(res, 50); });
			}
		}
	}

	updatePreview() {
		if (this._stickerSet && this._stickerSet._imagesLoaded) {
			let height = Math.ceil(this._stickerSet.count / 5) * 80;

			// this.$('.stickerSetDiv').style.backgroundImage = "url('"+this._stickerSet._spriteBlobURL+"')";
			this.$('.stickerSetDiv').style.height = ''+height+'px';
			this.$('.stickerSetDiv').style.display = 'block';
			this.$('.stickersLoading').style.display = 'none';

			let html = '';
			let row = 0;
			let col = 0;

			for (let doc of this._stickerSet._stickers) {
				if (doc.tgs) {
					// animated sticker
					html += '<div class="animated '+(col == 4 ? 'animatedNoPadd' : '')+' previewStickerItem" id="animated_'+doc.id+'" data-set="'+this._stickerSet.id+'" data-id="'+doc.id+'"></div>';
				} else {
					html += '<span class="'+(col == 4 ? 'animatedNoPadd' : '')+' previewStickerItem" style="background-image: url('+doc.blobURL+')" data-set="'+this._stickerSet.id+'" data-id="'+doc.id+'"></span>';
				}

				col++;
				if (col == 5) {
					col = 0;
					row++;
				}
			}

			this.$('.stickerSetDiv').innerHTML = html;
			this.nextTick(()=>{
				// initialize animation
				this.initializeNextAnimation();
			});
		} else {
			this.$('.stickerSetDiv').style.display = 'none';
			this.$('.stickersLoading').style.display = 'block';
		}

		if (this._stickerSet) {
			this.$('.uploadTitle').innerHTML = this.escapeHTML(this._stickerSet.name);
			if (this._isStickerSetInstalled) {
				this._components.Button._data.title = 'Remove stickers';
			} else {
				this._components.Button._data.title = 'Add '+this._stickerSet.count+' stickers';
			}
			this.$('.buttonTitle').innerHTML = this.escapeHTML(this._components.Button._data.title);


			this.$('.button').style.display = 'block';
		} else {
			this.$('.uploadTitle').innerHTML = "&nbsp;";
		}

		this.reinitScrollBar(true);
	}

	async loadStickerSet() {
		await this._stickerSet.load();
		this._isStickerSetInstalled = await this._peerManager._stickers.isStickerSetInstalled(this._stickerSet);
		this.updatePreview();
	}

	async loadSticker() {
		this._stickerSet = await this._peerManager._stickers.getStickerSetBySticker(this._sticker);
		await this.loadStickerSet();
	}

	show(params) {
		// if (window.lottie) {
		// 	window.lottie.setQuality('low');
		// }

		this._peerManager = params.peerManager;

		if (params.stickerSet) {
			this._stickerSet = params.stickerSet;
		} else {
			this._stickerSet = null;
		}
		if (params.sticker) {
			this._sticker = params.sticker;
		} else {
			this._sticker = null;
		}

		this.$('#emojiPopupTop').style.display = 'block';
		this.$('.popupOverlay').classList.add('active');

		this.$('.button').style.display = 'none';

		this.updatePreview();
		this._initializedAnimationOn = {};

		if (params.stickerSet) {
			this.loadStickerSet();
		} else if (params.sticker) {
			this.loadSticker();
		}


		// this._stickerSet.load()
		// 	.then((stickerSet)=>{
		// 		if (stickerSet._id == this._stickerSet._id) {
		// 			this.updatePreview();
		// 		}
		// 	});
	}

	hide() {
		this.$('.popupOverlay').classList.remove('active');
		this.$('.popupOverlay').classList.add('fading');
		setTimeout(()=>{
			this.$('.stickersPreview').scrollTop = 0;
			this.$('.popupOverlay').classList.remove('fading');
			this.$('#emojiPopupTop').style.display = 'none';
			this.buttonLoading(false);

			for (let key in this._tgss) {
				this._tgss[key].destroy();
			}
			this._tgss = {};

			this.$('.stickerSetDiv').innerHTML = '';

		}, 500);
	}


	updateTitle() {
	}

	template() {
		return `
			<div id="emojiPopupTop">
				<div class="popupOverlay">
					<div class="popup">
						<div class="uploadPanel">
							<div class="uploadClose" id="stickersPopupClose">{{component(options.components.CloseIcon)}}{{/component}}</div>
							<div class="uploadTitle"></div>
						</div>

						<div class="stickersPreview">
							<div class="stickersLoading"><div class="cssload-zenith dark" style="margin-top: 80px;"></div></div>
							<div class="stickerSetDiv" id="stickersPreviewItems"></div>
						</div>

						<div class="stickersButton">
							{{component(options.components.Button)}}{{/component}}
						</div>

					</div>
				</div>
			</div>
		`;
	}
};

module.exports = StickersPopup;

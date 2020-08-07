const UI = window.classes.UI;
const AppIcon = require('../icons/AppIcon.js');
const TGS = window.classes.TGS;

const AppUI = require('../../utils/AppUI.js');
const Emoji = require('./EmojiDialog/Emoji.js');
const Stickers = require('./EmojiDialog/Stickers.js');
const GIFs = require('./EmojiDialog/GIFs.js');

class EmojiDialog extends AppUI {
	constructor(params) {
		super(params);

		this._events = [
			['click', 'emojiNavBlocks', 'onNavClick'],
			['click', 'search', 'onSearch'],
			// ['mouseenter', 'emojiTop', 'onMouseEnter'],
			// ['mouseleave', 'emojiTop', 'onMouseLeave'],
		];

		this._components = {
			emoji: this.newC(Emoji),
			stickers: this.newC(Stickers),
			gifs: this.newC(GIFs),
			icons: {
				smile: this.newC(AppIcon, {icon: 'smile'}),
				stickers: this.newC(AppIcon, {icon: 'stickers'}),
				gifs: this.newC(AppIcon, {icon: 'gifs'}),
				search: this.newC(AppIcon, {icon: 'search'}),
			}
		};

		this._types = ['emoji', 'stickers', 'gifs'];

		this._data.what = 'emoji';
		this._data.initialized = false;

		this.isVisible = false; // just getter, we need to know if it's visible to initialize tgs animations only when it is.

		// setTimeout(()=>{
		// 	this.show(500,500)
		// },500);
	}

	async init() {
		if (await this.sureSingle('init')) return false;
		this._data.initialized = true;
		this.render();
		this.fulfilSingle('init', true);
	}

	async show(atX, atY) {
		// if (this.__leaveInterval) {
		// 	clearInterval(this.__leaveInterval);
		// }
		if (atX && atY) {
			await this.init();

			this.$('#emojiTop').style.display = 'block';
			this.$('.emojiBubble').style.left = atX+'px';
			this.$('.emojiBubble').style.top = atY+'px';
		}
		this.$('.emojiBubble').classList.add('active');

		// console.error(this._components)
		// this._components[this._data.what].show();

		this.isVisible = true;
		this.switchType(this._data.what);

		document.querySelector('.panelNewMessage').classList.add('emojiOn');

		this.mouseupUpG(()=>{
			this.hide();
		});
		// this._app._peerManager._stickers.setLoadingMode('fast');
	}

	hide() {
		this.$('.emojiBubble').classList.remove('active');
		this.isVisible = false;
		// this._app._peerManager._stickers.setLoadingMode('slow');

		this._types.forEach((t)=>{ this._components[t].hidden(); });

		document.querySelector('.panelNewMessage').classList.remove('emojiOn');
	}

	// onMouseLeave() {
	// 	if (this.__leaveInterval) {
	// 		clearInterval(this.__leaveInterval);
	// 	}
	// 	this.__leaveInterval = setInterval(()=>{
	// 		this.hide();
	// 	}, 1000);
	// }

	// onMouseEnter() {
	// 	if (this.__leaveInterval) {
	// 		clearInterval(this.__leaveInterval);
	// 	}
	// 	this.show(true);
	// }

	switchType(what) {
		this._data.what = what;
		this._types.forEach((t)=>{
			this.$('#'+t+'Block').classList[(t == what ? 'add' : 'remove')]('active');
			(this.$('.emojiNavItem'+t) && this.$('.emojiNavItem'+t).classList['add']('active'));

			if (t !== what) this._components[t].hidden();
			// this.$('.emojiNavItemstickers').classList['add']('active')
		});
		this.$$('.emojiNavItem').forEach((i)=>{ i.classList[(i.dataset.what == what ? 'add' : 'remove')]('active'); });
		this._components[what].show();
	}

	onSearch() {
		this._parent._components.RightSidebar.showBlock('Stickers');
		this._parent._components.RightSidebar.show();
		this.hide();
	}

	onNavClick(e) {
		const base = this.$('#emojiNavBlocks');
		const closest = e.target.closest('.emojiNavItem');

		if (closest && base.contains(closest)) {
			let what = closest.dataset.what;
			this.switchType(what);
		}
	}


};

EmojiDialog.template = `
			<div id="emojiTop" style="display: none;">
				{{if (options.initialized)}}
				<div class="emojiBubble">
					<div class="emojiBubbleContainer">
						<div class="emojiBlock" id="emojiBlock">
							{{component(options.components.emoji)}}{{/component}}
						</div>
						<div class="emojiBlock" id="stickersBlock">
							{{component(options.components.stickers)}}{{/component}}
						</div>
						<div class="emojiBlock" id="gifsBlock">
							{{component(options.components.gifs)}}{{/component}}
						</div>

						<div class="emojiNav">
							<div class="emojiNavItem emojiNavItemLeft" data-what="stickers" id="search">{{component(options.components.icons.search)}}{{/component}}</div>
							<div class="emojiNavBlocks" id="emojiNavBlocks">
								<div class="emojiNavItem" data-what="emoji">{{component(options.components.icons.smile)}}{{/component}}</div>
								<div class="emojiNavItem" data-what="stickers">{{component(options.components.icons.stickers)}}{{/component}}</div>
								<div class="emojiNavItem" data-what="gifs">{{component(options.components.icons.gifs)}}{{/component}}</div>
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




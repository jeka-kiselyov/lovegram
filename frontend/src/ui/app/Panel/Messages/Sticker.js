const AbstractMessage = require('./AbstractMessage.js');
const TGS = window.classes.TGS;

class Sticker extends AbstractMessage {
	constructor(params) {
		super(params);

		this._events = [
			['mouseenter', 'sticker_'+this._data.message._id, 'onMouseEnter'],
		];

		this._wasRecent = false; // added most recently, so we need to play animation of it
	}

	wasRecent() {
		this._wasRecent = true;
	}

	async onMouseEnter() {
		if (this._tgs) {
			if (await this.sureSingle('play')) return;
			await this._tgs.playOnce();
			this.fulfilSingle('play', true, true); // can run many times
		}
	}

	stickerLoaded(messageSticker) {
		if (!this._data.message._sticker || this._stickerAttached) {
			return false;
		}
		this._stickerAttached = true;

		if (!messageSticker._isAnimated) {
			/// blob url
			const html = "<img src=\""+messageSticker.blobURL+"\">";
			const mediaEl = this.$('.messageSticker');
			if (mediaEl) {
				mediaEl.innerHTML = html;
			}
		} else {
			// json
			this._tgs = new TGS(this.$('.messageSticker'));
			this._tgs.setJSON(messageSticker.json, true, true, messageSticker,this._wasRecent);
		}
	}

};

Sticker.template = `
			<div id="message_{{message._id}}" data-id="{{message._id}}"
				class="panelMessageSticker
					{{if (options.message._sticker.isAnimated())}}panelMessageAnimatedSticker{{/if}}
					panelMessageSticker{{viewType}}
					{{if (options.sameAsNext)}}sameAsNext{{/if}}
					{{if (options.fromMe)}} stickerFromMe{{#else}} stickerFromThem{{/if}}
					messageAction
				">
				<div id="sticker_{{message._id}}" class="messageSticker"></div>

				{{self.avHTML(options.message, 'avatarSmall')|safe}}
			</div>

			<div style="clear: both"></div>
		`;


module.exports = Sticker;
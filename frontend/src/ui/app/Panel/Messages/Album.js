const AbstractMessage = require('./AbstractMessage.js');
const Layouter = require('../../utils/Layouter.js');

class Album extends AbstractMessage {
	constructor(params) {
		super(params);

		this.calcData();
	}

	photoLoaded(blobURL) {
		// we are not using this.$, as image may be under different message (where isMain is true)
		const el = document.querySelector('#messageAlbumItem_'+this._data.message._id);
		// console.error('appeding to #messageAlbumItem_'+this._data.message._id);
		if (el && !el.dataset.loaded) {
			const url = "url('"+blobURL+"')";
			el.style.backgroundImage = url + ',' + el.style.backgroundImage;
			el.dataset.loaded = 1;
		}
	}

	rerender() {
		this.calcData();
		this.render();
	}

	calcData() {
		this._data.isMain = (!this._data.message.getGroupId() || this._data.message.isMainInGroup()); // we need to render only the main one

		if (this._data.isMain) {
			// this._data.mediaSize = this.getSizeForTheMedia();
			let gm = [];
			try {
				gm = this._data.message.getGroupMedias();
			} catch(e) {
				gm = [{media: this._data.message._media, message: this._data.message}];
			}
			// const gm = this._data.message.getGroupMedias();
			// if (!gm.length && this._data.message._media) {
			// 	// single photo message
			// 	gm = [{media: this._data.message._media, message: this._data.message}];
			// }

			const toLay = [];
			for (let gmi of gm) {
				let background = null;
				let loaded = false;

				if (gmi.media.blobURL) {
					console.error('loading has blob');
					loaded = true;
					background = "url('"+gmi.media.blobURL+"'),url('"+gmi.media.getPreviewBase64()+"')";
				} else {
					console.error('loading has no blob');
					background = "url('"+gmi.media.getPreviewBase64()+"')";
				}

				toLay.push({
					loaded: loaded,
					width: gmi.media.getInfo('width'),
					height: gmi.media.getInfo('height'),
					id: gmi.message._id,
					media: gmi.media,
					background: background,
				});
			}

			toLay.sort((a, b) => (a.id > b.id) ? 1 : -1);

			this._layouter = new Layouter(toLay);
			this._data.items = this._layouter.layout();

			this._data.albumWidth = this._layouter._width;
			this._data.albumHeight = this._layouter._height;

			// console.error('displaying album', this._data.items);

			this._data.messageBody = this._data.message.formatMessageBody();

			// console.error(this._layouter);

			if (this._data.fromMe) {
				// should take bottom right image
				this._data.cornerBackground = this._layouter._bottomRightItem.media.getPreviewBase64();
			} else {
				// bottom left
				this._data.cornerBackground = this._layouter._bottomLeftItem.media.getPreviewBase64();
			}

			// console.error('calcs data for album');
		}
	}
};

Album.template = `
	{{if (!options.isMain)}}

	{{#else}}
			<div id="message_{{message._id}}" data-id="{{message._id}}"
				class="
					panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}} panelMessageAlbum

					{{if (options.sameAsNext)}} sameAsNext{{/if}}
				"
				title="{{message._id}}"
				style="
				{{if (!options.messageBody)}}--brImage: url('{{cornerBackground}}');{{/if}}
				width: {{js(options.albumTopWidth = options.albumWidth - 28)/}}{{albumTopWidth}}px"
				>

				<div id="messageAlbum_{{message._id}}" class="messageAlbum {{if (!options.messageBody)}}messageAlbumOnly{{/if}}" style="width: {{albumWidth}}px; height: {{albumHeight}}px;">
					{{each(options.items)}}
						<div title="message {{@this.id}}" data-id="{{@this.id}}" {{if (@this.loaded)}}data-loaded="1"{{/if}}  id="messageAlbumItem_{{@this.id}}" class="messageAlbumItem messageAction" style="background-image: {{@this.background|safe}}; width: {{@this.pos.width}}px; height: {{@this.pos.height}}px; left: {{@this.pos.left}}px; top: {{@this.pos.top}}px;"></div>
					{{/each}}

					{{if (!options.messageBody)}}
					<div class="messageMeta onMediaMeta">{{self.getMetaHTML() | safe}}</div>
					{{/if}}
				</div>

				{{if (options.messageBody)}}
				<div class="messageContent"
					style=""
					>

					<span class="messageBody">{{messageBody|safe}}</span>

					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
				</div>
				<div class="messageMeta">{{self.getMetaHTML() | safe}}</div>
				{{/if}}

				{{self.avHTML(options.message, 'avatarSmall')|safe}}

			</div>

			<div style="clear: both"></div>
	{{/if}}
`;


module.exports = Album;
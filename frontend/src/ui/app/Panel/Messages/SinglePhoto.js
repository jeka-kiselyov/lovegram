const AbstractMessage = require('./AbstractMessage.js');

class SinglePhoto extends AbstractMessage {
	constructor(params) {
		super(params);

		this._data.mediaSize = this.getSizeForTheMedia();
	}

	photoLoaded(blobURL) {
		const el = this.$('#message_'+this._data.message._id);
		if (el) {
			const url = "url('"+blobURL+"')";
			// if (el.classList.contains('withPhotoOnly')) {
				el.style.backgroundImage = url + ',' + el.style.backgroundImage;
				// el.style.setProperty('--brImage', url);

				// el.style.setProperty('--brImage', 'url("https://static.toiimg.com/thumb/msid-44945488,width-748,height-499,resizemode=4,imgsize-291921/Nice-in-pictures.jpg")');
			// }

			//  else {
			// 	const mediaEl = this.$('#messageMedia_'+this._data.message._id);
			// 	if (mediaEl) {
			// 		mediaEl.style.backgroundImage = url;
			// 	}
			// }
		}

		// this.resizeToPhotoRatio();
	}
};

SinglePhoto.template = `
					<div id="message_{{message._id}}" data-id="{{message._id}}"
						class="
							panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
							withPhoto
							withPhotoOnly
							{{if (options.sameAsNext)}} sameAsNext{{/if}}
							messageAction
						"
						style="
							--brImage: url('{{message._media.getPreviewBase64()}}');
							background-image: url('{{message._media.getPreviewBase64()}}');
							min-width: {{mediaSize.width}}px;
						"
						>

						<div class="messageContent messageMediaOnly"
							style="max-width: {{mediaSize.width}}px;"
							>
						</div>
						<div class="messageMeta">{{self.getMetaHTML() | safe}}</div>

						{{self.avHTML(options.message, 'avatarSmall')|safe}}

					</div>

			<div style="clear: both"></div>
		`;


module.exports = SinglePhoto;
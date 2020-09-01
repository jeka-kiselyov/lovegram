const AbstractMessage = require('./AbstractMessage.js');

class SingleVideo extends AbstractMessage {
	constructor(params) {
		super(params);

		this._data.mediaSize = this.getSizeForTheMedia();
		this._data.previewBase64 = params.message._media.getPreviewBase64();
	}

	photoLoaded(blobURL) {
		const el = this.$('#message_'+this._data.message._id);
		if (el) {
			const url = "url('"+blobURL+"')";
			if (this._data.previewBase64) {
				el.style.backgroundImage = url + ',' + el.style.backgroundImage;
			} else {
				el.style.backgroundImage = url;
				el.style.setProperty('--brImage', url);
			}
			// if (el.classList.contains('withPhotoOnly')) {
				// el.style.backgroundImage = url;
				// el.style.backgroundImage = url + ',' + el.style.backgroundImage;
				// el.style.setProperty('--brImage', url);

				// el.style.setProperty('--brImage', 'url("https://static.toiimg.com/thumb/msid-44945488,width-748,height-499,resizemode=4,imgsize-291921/Nice-in-pictures.jpg")');
			// } else {
			// 	const mediaEl = this.$('#messageMedia_'+this._data.message._id);
			// 	if (mediaEl) {
			// 		mediaEl.style.backgroundImage = url;
			// 	}
			// }
		}

		// this.resizeToPhotoRatio();
	}
};

SingleVideo.template = `
					<div id="message_{{message._id}}" data-id="{{message._id}}" data-moveaction="heat"
						class="
							panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
							withVideo
							withVideoOnly
							{{if (options.sameAsNext)}} sameAsNext{{/if}}
							messageAction messageMove
						"
						title="{{message._id}}"
						style="
							{{if (options.previewBase64)}}
							--brImage: url('{{previewBase64}}'); background-image: url('{{previewBase64}}');
							{{/if}}
							min-width: {{mediaSize.width}}px;
						"
						>

						<div class="messageContent messageMediaOnly"
							style="max-width: {{mediaSize.width}}px;"
							>
									<div id="messageMedia_{{message._id}}" class="messageMedia" style=""><div class="duration">{{message._media.getInfo('videoDurationHuman')}}</div><div class=playIcon></div></div>

						</div>
						<div class="messageMeta">{{self.getMetaHTML() | safe}}</div>

						{{self.avHTML(options.message, 'avatarSmall')|safe}}

					</div>

			<div style="clear: both"></div>
		`;


module.exports = SingleVideo;
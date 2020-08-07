const AbstractMessage = require('./AbstractMessage.js');

class PhotoWithText extends AbstractMessage {
	constructor(params) {
		super(params);

		this._data.mediaSize = this.getSizeForTheMedia();
	}

	photoLoaded(blobURL) {
		const mediaEl = this.$('#messageMedia_'+this._data.message._id);
		if (mediaEl) {
			const url = "url('"+blobURL+"')";
			mediaEl.style.backgroundImage = url + ',' + mediaEl.style.backgroundImage;;
		}
		// this.resizeToPhotoRatio();
	}
};

PhotoWithText.template = `
			<div id="message_{{message._id}}" data-id="{{message._id}}"
				class="
					panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
					{{if (options.sameAsNext)}} sameAsNext{{/if}}
				"
				title="{{message._id}}"
				style="
				"
				>

				<div id="messageMedia_{{message._id}}" data-id="{{message._id}}" class="messageMedia messageAction" style="background-image: url('{{message._media.getPreviewBase64()}}');
					min-width: {{mediaSize.width}}px;">
				</div>


				<div class="messageContent"
					style=""
					>

					<span class="messageBody">{{message.formatMessageBody()|safe}}</span>

					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
				</div>
				<div class="messageMeta">{{self.getMetaHTML() | safe}}</div>

				{{self.avHTML(options.message, 'avatarSmall')|safe}}

			</div>

			<div style="clear: both"></div>
		`;


module.exports = PhotoWithText;
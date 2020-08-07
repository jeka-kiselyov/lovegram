const AbstractMessage = require('./AbstractMessage.js');

class Text extends AbstractMessage {
	constructor(params) {
		super(params);

		this._data.buttons = this._data.message.getButtons();
		// this._data.mediaSize = this.getSizeForTheMedia();
	}

	photoLoaded(blobURL) {
		const el = this.$('#message_'+this._data.message._id);
		if (el) {
			const url = "url('"+blobURL+"')";
			if (el.classList.contains('withPhotoOnly')) {
				el.style.backgroundImage = url;
				el.style.setProperty('--brImage', url);

				// el.style.setProperty('--brImage', 'url("https://static.toiimg.com/thumb/msid-44945488,width-748,height-499,resizemode=4,imgsize-291921/Nice-in-pictures.jpg")');
			} else {
				const mediaEl = this.$('#messageMedia_'+this._data.message._id);
				if (mediaEl) {
					mediaEl.style.backgroundImage = url;
				}
			}
		}

		// this.resizeToPhotoRatio();
	}

	webpagePhotoLoaded(messageWebpage) {
		const el = this.$('.webpagePhoto');
		if (el) {
			// const url = "url('data:image/jpeg;base64,"+data+"')";
			const html = "<img src=\""+messageWebpage.blobURL+"\" style=\"max-height: "+this._data.message._webpage.getInfo('photoHeight')+"px; width: auto;\">";
			el.innerHTML = html;
		}
	}
};
//
Text.template = `
			<div id="message_{{message._id}}" data-id="{{message._id}}"
				class="
					panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
					{{if (options.sameAsNext)}} sameAsNext{{/if}}
					{{if (options.buttons.length)}}withButtons{{buttons.length}}{{/if}}
				"
				title="{{message._id}}"
				style="
				"
				>

				<div class="messageAuthor messageAction" data-action="gotouser" data-id="{{message._id}}">{{authorName}}</div>
				{{if (options.reply)}}
					<div class="messageReply messageAction" data-action="jump" data-id="{{reply.id}}">
						<div class="author">{{reply.author}}</div>
						<div class="replyBody">{{reply.message}}</div>
					</div>
					<div style="clear: both"></div>
				{{/if}}


				{{if (options.forwardedInfo)}}<div class="fowardedHeader">Forwarded message</div>{{/if}}
				<div class="messageContent {{if (options.forwardedInfo)}}messageForwarded{{/if}}"
					style=""
					>
					{{if (options.forwardedInfo)}}
						<div class="author messageAction high" data-action="gotoforw" data-id="{{message._id}}">{{forwardedInfo.name}}</div>
					{{/if}}

					<span class="messageBody">{{message.formatMessageBody()|safe}}</span>

					{{if (options.message._webpage)}}
						<a href="{{message._webpage.getInfo('url')|safe}}" class="messageWebpage" target="_blank">
							{{if (options.message._webpage.getInfo('hasPhoto'))}}
							<div class="webpagePhoto {{if (options.message._webpage.getInfo('photoIsSquare'))}}webpagePhotoSquare{{/if}}" id="messageWebpagePhoto_{{message._id}}"
								style="
									{{if (options.message._webpage.getInfo('previewBase64'))}}
										background-image: url('{{message._webpage.getInfo('previewBase64')}}');
									{{/if}}
									{{if (!options.message._webpage.getInfo('photoIsSquare'))}}
									height: {{message._webpage.getInfo('photoHeight')}}px;
									max-width: {{message._webpage.getInfo('photoWidth')}}px;
									{{/if}}
								"
							>
							</div>
							{{/if}}
							<div class="webpageSitename high">{{message._webpage.getInfo('siteName')}}</div>
							<div class="webpageTitle high">{{message._webpage.getInfo('title')}}</div>
							{{if (options.message._webpage.getInfo('description'))}}
							<div class="webpageDescription high">{{message._webpage.getInfo('description')}}</div>
							{{/if}}
						</a>
					{{/if}}

					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
				</div>
				<div class="messageMeta">{{self.getMetaHTML() | safe}}</div>

				{{self.avHTML(options.message, 'avatarSmall')|safe}}

				{{if (options.buttons.length)}}
				<div class="messageButtons"><div class="messageButtonsCont">
					{{each(options.buttons)}}
						<div class="messageButton messageAction" data-action="button" data-id="{{message._id}}" data-n={{@index}}>{{@this.title}}</div>
					{{/each}}
				</div></div>
				{{/if}}

			</div>

			<div style="clear: both"></div>
		`;


module.exports = Text;
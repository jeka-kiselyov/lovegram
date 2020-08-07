// const UI = window.classes.UI;

// const Icon = window.classes.Icon;
// const AppIcon = require('../../../icons/AppIcon.js');

const AppUI = require('../../../../utils/AppUI.js');
const Format = require('../../../../utils/Format.js');

class AbstractMessage extends AppUI {
	constructor(params) {
		super(params);

		this.AppUI = AppUI;
		this._data.message = params.message;


		// this._components.IconViews = this.newC(Icon, {icon: 'eye'});

		this._data.avatarUserId = this._data.message.getAuthorId();
		this._data.avatarInitials = this._data.message.getAvatarInitials();
		this._data.authorName = this._data.message.getAuthorFirstName();


		this._data.viewType = params.message._peer.getDisplayType();

		this._data.sameAsNext = false;
		if (params.nextMessage && (params.nextMessage.getAuthorId() == params.message.getAuthorId())) {
			this._data.sameAsNext = true;
		}

		this._data.fromMe = false;
		if (this._data.viewType !== 'channel' && params.message.isFromMe()) {
			this._data.fromMe = true;
		}

		if (params.prevMessage) {
			// determine if we need to show date on this message
			if ((new Date(params.message._date)).getDay() != (new Date(params.prevMessage._date)).getDay()) {
				this._data.showDate = true;
			}
		}
		this._data.showDate = true;

		let replyMessage = params.message.getReplyMessage();
		if (replyMessage) {
			this._data.reply = {
				'message': replyMessage.getDisplayMessage(),
				'author': replyMessage.getAuthorFirstName(),
				'id': replyMessage._id,
			}
		}

		this._data.forwardedInfo = params.message.getForwardedInfo();

		// setTimeout(()=>{
		// 	this.$().style.backgroundColor = 'green';
		// }, 1000);
	}

	markAsRead() {
		if (this._ricon) return;
		const ricon = this.$('.readicon');
		if (ricon) {
			ricon.innerHTML = AppUI.getIconHTML('2checks');
		}
		this._ricon = true;
	}

	/**
	 * Hightlight searched text
	 */
	highText(text, noGuess) {
		console.error(this._data.message._id);

		const alldoc = document.querySelectorAll('.highlight');
		alldoc.forEach((el)=>{
			let parent = el.parentNode;
			// move all children out of the element
			while (el.firstChild) parent.insertBefore(el.firstChild, el);
			// remove the empty element
			parent.removeChild(el);
		});


		const bconts = this.$$('.messageBody, .high');
		if (!text || !bconts.length) return;

		let wasHigh = false;
		let nhText = '';
		for (let bcont of bconts) {
			let innerHTML = bcont.innerHTML;
			let index = innerHTML.toLowerCase().indexOf(text.toLowerCase());
			if (index >= 0) {
				innerHTML = innerHTML.substring(0,index) + "<span class='highlight'>" + innerHTML.substring(index,index+text.length) + "</span>" + innerHTML.substring(index + text.length);
				bcont.innerHTML = innerHTML;

				wasHigh = true;
			} else {
				nhText+=bcont.innerText;
			}
		}

		if (!wasHigh && !noGuess) {
			let guess = Format.guessWord(nhText, text);
			if (guess) {
				return this.highText(guess, true);
			}
		}
	}

	setSameAsNext(same) {
		this._data.sameAsNext = same;
		const cl = this.$('#message_'+this._data.message._id).classList;
		if (same) {
			cl.add('sameAsNext');
		} else {
			cl.remove('sameAsNext');
		}
	}

	getMetaHTML() {
		let html = this._data.message.getDisplayTime();
		if (this._data.viewType == 'channel') {
			html = Format.numberToDecims(this._data.message._apiObject.views || 0)+' '+AppUI.getIconHTML('eye')+'&nbsp;&nbsp;&nbsp;'+html;
		} else {
			if (this._data.message.isFromMe()) {
				if (this._data.message.seenByPeer()) {
					html+=' <span class="readicon">'+AppUI.getIconHTML('2checks')+'</span>';
				} else {
					html+=' <span class="readicon">'+AppUI.getIconHTML('check')+'</span>';
				}
			}
		}

		return html;
	}

	getSizeForTheMedia() {
		let maxWidth = 360;
		let windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
		if (windowWidth < maxWidth) {
			maxWidth = windowWidth;
		}

		let ratioChanged = false;
		let ratio = 360/240;

		let mediaObj = this._data.message._apiObject.media;
		if (mediaObj) {
			if (mediaObj.document && mediaObj.document.attributes) {
				// size for the photo
				for (let attribute of mediaObj.document.attributes) {
					if (attribute._ == 'documentAttributeVideo') {
						ratio = attribute.w / attribute.h;
						ratioChanged = true;
					}
				}
			}
			if (mediaObj.photo && mediaObj.photo.sizes) {
				// size for the photo
				for (let size of mediaObj.photo.sizes) {
					if (size.type == 'm' || size.type == 'y') {
						ratio = size.w / size.h;
						ratioChanged = true;
					}
				}
			}
		}


		let newWidth = 240 * ratio;
		if (newWidth > maxWidth) {
			newWidth = maxWidth;
		}
		if (newWidth*1.5 > windowWidth) {
			newWidth = 120 * ratio;
		}

		return {
			width: newWidth,
			height: 240
		};
	}

	cleanUp() {
		if (this._tgs) {
			this._tgs.destroy();
		}
	}

	/**
	 * Destroy the dom element
	 * @return {Number} removed element height
	 */
	destroy() {
		this.cleanUp();
		const height = this.$().offsetHeight;
		this.$().remove();

		return height;
	}

	messageIdChanged(from) {
		const el = this.$('#message_'+from);
		if (el) {
			el.id = 'message_'+this._data.message._id;
			el.setAttribute('data-id', this._data.message._id);
		}
	}


	updateContent() {
		this.$('.messageBody') && (this.$('.messageBody').innerHTML = this._data.message.formatMessageBody());
	}
};

AbstractMessage.AppUI = AppUI;

// AbstractMessage.template = `
// 			{{if (options.message._doc)}}
// 				<div id="message_{{message._id}}" data-id="{{message._id}}"
// 					class="panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}} {{if (options.sameAsNext)}} sameAsNext{{/if}}"
// 					title="{{message._id}}"
// 					>

// 					<div class="rsDoc panelRsDoc rsDoc_{{message._doc.id}}" data-id="{{message._doc.id}}">
// 						<div class="rsDocIcon avatarC{{message._doc.getInfo('color')}}"><div class="progress"><div></div></div>{{message._doc.getInfo('ext')}}</div>
// 						<div class="rsDocName">{{message._doc.getInfo('filename')}}</div>
// 						<div class="rsDocMeta">{{message._doc.getInfo('sizeHuman')}}</div>
// 					</div>

// 					<div class="avatar avatarSmall">
// 						{{if (options.message.hasAvatar())}}
// 						<div class="avatarBack" style="background-image: url('{{ message.getAvatarBlobURLSync() }}');"></div>
// 						{{#else}}
// 						<div class="avatarBack panelTopAvatarBack"></div>
// 						<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
// 						{{/if}}
// 					</div>
// 				</div>
// 			{{#else}}
// 				{{if (options.message._sticker)}}
// 					<div id="message_{{message._id}}" data-id="{{message._id}}" class="panelMessageSticker {{if (options.message._sticker.isAnimated())}}panelMessageAnimatedSticker{{/if}} panelMessageSticker{{viewType}} {{if (options.sameAsNext)}}sameAsNext{{/if}} {{if (options.fromMe)}} stickerFromMe{{#else}} stickerFromThem{{/if}}">
// 						<div id="sticker_{{message._id}}" class="messageSticker"></div>

// 						<div class="avatar avatarSmall">
// 							{{if (options.message.hasAvatar())}}
// 							<div class="avatarBack" style="background-image: url('{{ message.getAvatarBlobURLSync() }}');"></div>
// 							{{#else}}
// 							<div class="avatarBack panelTopAvatarBack"></div>
// 							<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
// 							{{/if}}
// 						</div>
// 					</div>
// 				{{#else}}

// 					{{if (options.message._media && options.message._media.isRoundVideo())}}

// 							<div id="message_{{message._id}}" data-id="{{message._id}}"
// 								class="
// 									panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
// 									withVideo withVideoOnly
// 									panelRoundVideo
// 								"
// 								title="{{message._id}}"
// 								style="
// 									{{if (options.message._media)}}
// 										min-width: {{mediaSize.width}}px;
// 									{{/if}}
// 								"
// 								>

// 								<div class="duration">{{message._media.getInfo('videoDurationHuman')}} <div class="nosound">{{component(options.components.NoSound)}}{{/component}}</div></div>

// 								<div id="messageMedia_{{message._id}}" class="messageMedia" style="background-image: url('{{message._media.getPreviewBase64()}}');
// 									min-width: {{mediaSize.width}}px;">
// 									<div class=playIcon></div>
// 								</div>
// 								<div id="messageMediaPlaying_{{message._id}}" class="messageMedia messageMediaPlaying" style="display: none;">
// 									<video muted id="messageVideo_{{message._id}}" autoplay></video>
// 								</div>

// 								<div class="messageMeta">{{message.getDisplayTime()}} {{if (options.viewedByPeer)}}{{component(options.components.Icon)}}{{/component}}{{/if}}</div>


// 								<div class="avatar avatarSmall">
// 									{{if (options.message.hasAvatar())}}
// 									<div class="avatarBack" style="background-image: url('{{ message.getAvatarBlobURLSync() }}');"></div>
// 									{{#else}}
// 									<div class="avatarBack panelTopAvatarBack"></div>
// 									<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
// 									{{/if}}
// 								</div>

// 							</div>

// 					{{#else}}


// 							<div id="message_{{message._id}}" data-id="{{message._id}}"
// 								class="
// 									panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
// 									{{if (options.message._media)}}
// 										{{if (options.message._media.isVideo())}}withVideo{{#else}}withPhoto{{/if}}
// 										{{if (!options.message._message)}}
// 											{{if (options.message._media.isVideo())}}withVideoOnly{{#else}}withPhotoOnly{{/if}}
// 										{{/if}}
// 									{{/if}}
// 									{{if (options.sameAsNext)}} sameAsNext{{/if}}
// 								"
// 								title="{{message._id}}"
// 								style="
// 									{{if (options.message._media)}}
// 										{{if (!options.message._message)}}
// 											--brImage: url('{{message._media.getPreviewBase64()}}'); background-image: url('{{message._media.getPreviewBase64()}}');
// 										{{/if}}
// 										min-width: {{mediaSize.width}}px;
// 									{{/if}}
// 								"
// 								>

// 								{{if (options.message._media && options.message._message)}}
// 									<div id="messageMedia_{{message._id}}" class="messageMedia" style="background-image: url('{{message._media.getPreviewBase64()}}');
// 										min-width: {{mediaSize.width}}px;">
// 									{{if (options.message._media.isVideo())}}
// 										<div class="duration">{{message._media.getInfo('videoDurationHuman')}}</div><div class=playIcon></div>
// 									{{/if}}
// 									</div>
// 								{{/if}}

// 								{{if (!options.message._media)}}
// 									<div class="messageAuthor">{{authorName}}</div>
// 									{{if (options.reply)}}
// 										<div class="messageReply">
// 											<div class="author">{{reply.author}}</div>
// 											<div class="replyBody">{{reply.message}}</div>
// 										</div>
// 									{{/if}}
// 								{{/if}}

// 								<div class="messageContent {{if (options.message._media && !options.message._message)}}messageMediaOnly{{/if}}"
// 									style="max-width: {{mediaSize.width}}px;"
// 									>
// 									{{if (options.message._media && options.message._media.isVideo())}}
// 										{{if (options.message._media && !options.message._message)}}
// 											<div id="messageMedia_{{message._id}}" class="messageMedia" style="background-image: url('{{message._media.getPreviewBase64()}}');"><div class="duration">{{message._media.getInfo('videoDurationHuman')}}</div><div class=playIcon></div></div>
// 										{{/if}}
// 										{{if (0)}}
// 										<div class="messageVideoContainer">
// 											<video muted id="messageVideo_{{message._id}}" autoplay loop></video>
// 										</div>
// 										{{/if}}
// 										{{if (options.message.formatMessageBody())}}
// 											<div class="messageText">{{message.formatMessageBody()|safe}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
// 										{{/if}}
// 									{{#else}}

// 										{{message.formatMessageBody()|safe}}

// 										{{if (options.message._webpage)}}
// 											<a href="{{message._webpage.getInfo('url')|safe}}" class="messageWebpage" target="_blank">
// 												{{if (options.message._webpage.getInfo('hasPhoto'))}}
// 												<div class="webpagePhoto {{if (options.message._webpage.getInfo('photoIsSquare'))}}webpagePhotoSquare{{/if}}" id="messageWebpagePhoto_{{message._id}}"
// 													style="
// 														{{if (!options.message._webpage.getInfo('photoIsSquare'))}}height: {{message._webpage.getInfo('photoHeight')}}px;{{/if}}
// 													"
// 												>
// 												</div>
// 												{{/if}}
// 												<div class="webpageSitename">{{message._webpage.getInfo('siteName')}}</div>
// 												<div class="webpageTitle">{{message._webpage.getInfo('title')}}</div>
// 												{{if (options.message._webpage.getInfo('description'))}}
// 												<div class="webpageDescription">{{message._webpage.getInfo('description')}}</div>
// 												{{/if}}
// 											</a>
// 										{{/if}}

// 										&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
// 									{{/if}}
// 								</div>
// 								<div class="messageMeta">{{message.getDisplayTime()}} {{if (options.viewedByPeer)}}{{component(options.components.Icon)}}{{/component}}{{/if}}</div>


// 								<div class="avatar avatarSmall">
// 									{{if (options.message.hasAvatar())}}
// 									<div class="avatarBack" style="background-image: url('{{ message.getAvatarBlobURLSync() }}');"></div>
// 									{{#else}}
// 									<div class="avatarBack panelTopAvatarBack"></div>
// 									<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
// 									{{/if}}
// 								</div>

// 							</div>

// 					{{/if}}

// 				{{/if}}
// 			{{/if}}

// 			<div style="clear: both"></div>
// 		`;

module.exports = AbstractMessage;

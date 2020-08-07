const UI = window.classes.UI;
const AppIcon = require('../../icons/AppIcon.js');
const TGS = window.classes.TGS;

class Message extends UI {
	constructor(params) {
		super(params);

		this._components.Icon = this.newC(AppIcon, {icon: '2checks'});
		this._components.NoSound = this.newC(AppIcon, {icon: 'nosound'});

		this._data.message = params.message;
		this._data.viewType = params.message._peer.getDisplayType();
		this._data.viewedByPeer = true;

		this._data.isMediaOnly = false;
		if (this._data.message.isMediaOnly()) {
			this._data.isMediaOnly = true;
		}
		this._data.hasMedia = false;
		if (this._data.message.hasMedia()) {
			this._data.hasMedia = true;
		}
		this._data.hasVideo = false;
		if (this._data.message.hasVideo()) {
			this._data.hasMedia = true;
			this._data.hasVideo = true;
		}
		this._data.isSticker = false;
		if (this._data.message.hasSticker()) {
			this._data.isSticker = true;
			this._data.isAnimatedSticker = this._data.message.hasAnimatedSticker();
		}

		// this._data.brUrl = this._data.message.getPreviewMediaCacheURL();
		// if (this._data.brUrl) {
		// 	console.error(this._data.brUrl);
		// 	// alert(this._data.brUrl);
		// }

		this._data.avatarUserId = this._data.message.getAuthorId();
		this._data.avatarInitials = this._data.message.getAvatarInitials();
		this._data.authorName = this._data.message.getAuthorFirstName();

		this._data.sameAsNext = false;
		if (params.nextMessage && (params.nextMessage.getAuthorId() == params.message.getAuthorId())) {
			this._data.sameAsNext = true;
		}

		let replyMessage = params.message.getReplyMessage();
		if (replyMessage) {
			this._data.reply = {
				'message': replyMessage.getDisplayMessage(),
				'author': replyMessage.getAuthorFirstName(),
				'id': replyMessage._id,
			}
		}

		this._data.fromMe = false;
		if (this._data.viewType !== 'channel' && params.message.isFromMe()) {
			this._data.fromMe = true;
		}

		this._data.downloadableInfo = params.message.getDownloadableInfo();

		this._stickerAttached = false;

		this._data.mediaSize = this.getSizeForTheMedia();

		// setTimeout(()=>{
		// 	this.resizeToPhotoRatio();
		// }, 1000);
		//

		if (this._data.message.hasAvatar() === null) {
			this._data.message.getAvatarBlobURL()
				.then((blobURL)=>{
					if (blobURL) {
						this.$('.avatarBack').style.backgroundImage = "url('"+blobURL+"')";
					}
				});
		}

		this._videoPlayingBlobURL = null;
		this._videoPlayingSrcSet = false;
		this._videoPlayingState = 'undefined';

		if (this._data.message._media && this._data.message._media.isRoundVideo()) {
			this._roundVideoDate = this._data.message._date;
		}

		this.playRoundVideo();

		this._tgs = null;
	}

	clickHandler() {
		console.error(this._videoPlayingState);

		if (this._videoPlayingState == 'undefined' || this._videoPlayingState == 'pause') {
			this.playRoundVideo();
		} else if (this._videoPlayingState == 'muted') {
			this.muteRoundVideo(false);
		} else if (this._videoPlayingState == 'play') {
			this.pauseRoundVideo();
		}
	}

	pauseRoundVideo() {
		if (this._data.message._media && this._data.message._media.isRoundVideo()) {
			let videoEl = this.$('#messageVideo_'+this._data.message._id);
			if (videoEl) {
				videoEl.pause();
				videoEl.muted = true;

				this._videoPlayingState = 'pause';
				this.$('.nosound').style.display = 'block';
			}
		}
	}

	muteRoundVideo(muted) {
		let videoEl = this.$('#messageVideo_'+this._data.message._id);
		if (videoEl) {
			if (muted) {
				videoEl.muted = true;
				this.$('.nosound').style.display = 'block';
				this._videoPlayingState = 'muted';
			} else {
				videoEl.muted = false;
				this.$('.nosound').style.display = 'none';
				this._videoPlayingState = 'play';

				this.pauseOthers();
			}
		}
	}

	pauseOthers() {
		for (let mc of this._parent._components.messages) {
			if (mc != this && mc._roundVideoDate) {
				mc.pauseRoundVideo();
			}
		}
	}

	roundLoopEnded() {
		if (this._videoPlayingState == 'play') {
			// try to find the next round video
			let foundMC = null;
			let foundDateDiff = Infinity;
			for (let mc of this._parent._components.messages) {
				if (mc != this && mc._roundVideoDate) {
					if (mc._roundVideoDate > this._roundVideoDate && (mc._roundVideoDate - this._roundVideoDate) < foundDateDiff) {
						foundDateDiff = (mc._roundVideoDate - this._roundVideoDate);
						foundMC = mc;
					}
				}
			}

			if (foundMC) {
				foundMC.playRoundVideo(true);
			} else {
				this.muteRoundVideo(true);
				let videoEl = this.$('#messageVideo_'+this._data.message._id);
				if (videoEl) {
					videoEl.play();
				}
			}
		} else {
			this._videoPlayingState = 'pause';
		}
	}

	playRoundVideo(playLoud) {
		if (this._data.message._media && this._data.message._media.isRoundVideo()) {
			let doPlay = ()=>{
				let videoEl = this.$('#messageVideo_'+this._data.message._id);
				if (videoEl) {
					if (!this._videoPlayingSrcSet) {
						videoEl.onloadeddata = () => {
							if (playLoud) {
								videoEl.muted = false;
								this.$('.nosound').style.display = 'none';
								this._videoPlayingState = 'play';
							} else {
								videoEl.muted = true;
								this.$('.nosound').style.display = 'block';
								this._videoPlayingState = 'muted';
							}

							this.$('#messageMediaPlaying_'+this._data.message._id).style.display = 'block';
							this.$('#messageMedia_'+this._data.message._id).style.display = 'none';
						};
						videoEl.onended = () => {
							this.roundLoopEnded();
						};
						videoEl.src = this._videoPlayingBlobURL;
						this._videoPlayingSrcSet = true;

						this.pauseOthers();
					} else {
						if (playLoud) {
							try {
								videoEl.currentTime = 0;
							} catch(e) {}
							videoEl.muted = false;
							this.$('.nosound').style.display = 'none';
							this._videoPlayingState = 'play';
						} else {
							videoEl.muted = true;
							this.$('.nosound').style.display = 'block';
							this._videoPlayingState = 'muted';
						}

						videoEl.play();
						this.$('#messageMediaPlaying_'+this._data.message._id).style.display = 'block';
						this.$('#messageMedia_'+this._data.message._id).style.display = 'none';

						this.pauseOthers();
					}
				}
			};

			if (this._videoPlayingBlobURL) {
				doPlay();
			} else {
				this._data.message._media.getPlayableBlobURL()
					.then((blobURL)=>{
						this._videoPlayingBlobURL = blobURL;
						doPlay();
					});
			}


			// let videoEl = this.$('#messageVideo_'+this._data.message._id);
			// if (!videoEl) {
			// 	return;
			// }
			// videoEl.onloadeddata = () => {
			// 	videoEl.play();
			// };

			// setTimeout(()=>{
			// 	this._data.message._media.getPlayableBlobURL()
			// 		.then((blobURL)=>{
			// 			alert(blobURL);
			// 			this.$('#messageVideo_'+this._data.message._id).src = blobURL;
			// 		});
			// }, 500);
		}
	}

	cleanUp() {
		if (this._tgs) {
			this._tgs.destroy();
		}
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

	messageIdChanged(from) {
		// console.error('m id changed', from, this._data.message._id);

		const el = this.$('#message_'+from);
		if (el) {
			el.id = 'message_'+this._data.message._id;
			el.setAttribute('data-id', this._data.message._id);
		}
	}

	resizeToPhotoRatio() {
		console.log("resizing the message item");

		let maxWidth = 360;
		let windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

		const el = this.$('#message_'+this._data.message._id);
		const mediaEl = this.$('#messageMedia_'+this._data.message._id);

		if (el) {
			const windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
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


			if (ratioChanged) {
				el.style.minWidth = ''+(newWidth)+'px';
				// el.style.width = ''+newWidth+'px';
				if (mediaEl) {
					mediaEl.style.minWidth = ''+newWidth+'px';
					// mediaEl.style.width = ''+newWidth+'px';
				}

				const contentEl = this.$('.messageContent');
				if (contentEl) {
					el.style.maxWidth = ''+(newWidth)+'px';
				}
			}



			// console.log('res to ratio', ratio);
		}
	}

	webpagePhotoLoaded(messageWebpage) {
		const el = this.$('.webpagePhoto');
		if (el) {
			// const url = "url('data:image/jpeg;base64,"+data+"')";
			const html = "<img src=\""+messageWebpage.blobURL+"\">";
			el.innerHTML = html;
		}
	}

	// setPhotoAsCacheURL() {
	// 	return true;

	// 	const el = this.$('#message_'+this._data.message._id);
	// 	console.error('setPhotoAsCacheURL', el);
	// 	if (el) {
	// 		const url = "url('/tg/message_photo_"+this._data.message._apiObject.media.photo.id+".jpg')";
	// 		if (el.classList.contains('withPhoto')) {
	// 			el.style.backgroundImage = url;
	// 			el.style.setProperty('--brImage', url);
	// 			// el.style.setProperty('--brImage', 'url("https://static.toiimg.com/thumb/msid-44945488,width-748,height-499,resizemode=4,imgsize-291921/Nice-in-pictures.jpg")');
	// 		} else {
	// 			const mediaEl = this.$('#messageMedia_'+this._data.message._id);
	// 			if (mediaEl) {
	// 				mediaEl.style.backgroundImage = url;
	// 			}
	// 		}
	// 	}

	// 	this.resizeToPhotoRatio();
	// }

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

	// videoLoaded(data) {
	// 	/// loaded small video (gifs) for inline display
	// 	const el = this.$('#message_'+this._data.message._id);
	// 	if (!el) {
	// 		return false;
	// 	}

	// 	// hide preview if there's any
	// 	const mediaEl = this.$('#messageMedia_'+this._data.message._id);
	// 	if (mediaEl) {
	// 		mediaEl.style.display = 'none';
	// 	}

	// 	const videoContainer = this.$('.messageVideoContainer');
	// 	const videoEl = this.$('#messageVideo_'+this._data.message._id);
	// 	if (videoEl && videoContainer) {
	// 		let src = "data:video/mp4;base64,"+data;
	// 		videoEl.src = src;

	// 		videoContainer.classList.add('loaded');

	// 		setTimeout(()=>{
	// 			videoEl.play();
	// 		}, 100);
	// 	}

	// 	this.resizeToPhotoRatio();
	// }
	//
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
			this._tgs.setJSON(messageSticker.json);
		}

		// if (this._data.isAnimatedSticker) {
		// 	// json
		// 	const tgs = new TGS(this.$('.messageSticker'));
		// 	tgs.setJSON(data);
		// } else {
		// 	// base64 string
		// 	const html = "<img src=\"data:image/webp;base64,"+data+"\">";
		// 	const mediaEl = this.$('.messageSticker');
		// 	if (mediaEl) {
		// 		mediaEl.innerHTML = html;
		// 	}
		// }
	}
};
//<div class="messageDownIcon avatarC{{downloadableInfo.color}}">{{downloadableInfo.ext}}</div>
					// <div class="messageDownFname">{{downloadableInfo.filename}}</div>
					// <div class="messageDownSize">{{downloadableInfo.sizeHuman}}</div>
					// <div class="messageMeta">{{message.getDisplayTime()}} {{if (options.viewedByPeer)}}{{component(options.components.Icon)}}{{/component}}{{/if}}</div>

Message.template = `
			{{if (options.message._doc)}}
				<div id="message_{{message._id}}" data-id="{{message._id}}"
					class="panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}} {{if (options.sameAsNext)}} sameAsNext{{/if}}"
					title="{{message._id}}"
					>

					<div class="rsDoc panelRsDoc rsDoc_{{message._doc.id}}" data-id="{{message._doc.id}}">
						<div class="rsDocIcon avatarC{{message._doc.getInfo('color')}}"><div class="progress"><div></div></div>{{message._doc.getInfo('ext')}}</div>
						<div class="rsDocName">{{message._doc.getInfo('filename')}}</div>
						<div class="rsDocMeta">{{message._doc.getInfo('sizeHuman')}}</div>
					</div>

					<div class="avatar avatarSmall">
						{{if (options.message.hasAvatar())}}
						<div class="avatarBack" style="background-image: url('{{ message.getAvatarBlobURLSync() }}');"></div>
						{{#else}}
						<div class="avatarBack panelTopAvatarBack"></div>
						<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
						{{/if}}
					</div>
				</div>
			{{#else}}
				{{if (options.message._sticker)}}
					<div id="message_{{message._id}}" data-id="{{message._id}}" class="panelMessageSticker {{if (options.message._sticker.isAnimated())}}panelMessageAnimatedSticker{{/if}} panelMessageSticker{{viewType}} {{if (options.sameAsNext)}}sameAsNext{{/if}} {{if (options.fromMe)}} stickerFromMe{{#else}} stickerFromThem{{/if}}">
						<div id="sticker_{{message._id}}" class="messageSticker"></div>

						<div class="avatar avatarSmall">
							{{if (options.message.hasAvatar())}}
							<div class="avatarBack" style="background-image: url('{{ message.getAvatarBlobURLSync() }}');"></div>
							{{#else}}
							<div class="avatarBack panelTopAvatarBack"></div>
							<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
							{{/if}}
						</div>
					</div>
				{{#else}}

					{{if (options.message._media && options.message._media.isRoundVideo())}}

							<div id="message_{{message._id}}" data-id="{{message._id}}"
								class="
									panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
									withVideo withVideoOnly
									panelRoundVideo
								"
								title="{{message._id}}"
								style="
									{{if (options.message._media)}}
										min-width: {{mediaSize.width}}px;
									{{/if}}
								"
								>

								<div class="duration">{{message._media.getInfo('videoDurationHuman')}} <div class="nosound">{{component(options.components.NoSound)}}{{/component}}</div></div>

								<div id="messageMedia_{{message._id}}" class="messageMedia" style="background-image: url('{{message._media.getPreviewBase64()}}');
									min-width: {{mediaSize.width}}px;">
									<div class=playIcon></div>
								</div>
								<div id="messageMediaPlaying_{{message._id}}" class="messageMedia messageMediaPlaying" style="display: none;">
									<video muted id="messageVideo_{{message._id}}" autoplay></video>
								</div>

								<div class="messageMeta">{{message.getDisplayTime()}} {{if (options.viewedByPeer)}}{{component(options.components.Icon)}}{{/component}}{{/if}}</div>


								<div class="avatar avatarSmall">
									{{if (options.message.hasAvatar())}}
									<div class="avatarBack" style="background-image: url('{{ message.getAvatarBlobURLSync() }}');"></div>
									{{#else}}
									<div class="avatarBack panelTopAvatarBack"></div>
									<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
									{{/if}}
								</div>

							</div>

					{{#else}}


							<div id="message_{{message._id}}" data-id="{{message._id}}"
								class="
									panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}}
									{{if (options.message._media)}}
										{{if (options.message._media.isVideo())}}withVideo{{#else}}withPhoto{{/if}}
										{{if (!options.message._message)}}
											{{if (options.message._media.isVideo())}}withVideoOnly{{#else}}withPhotoOnly{{/if}}
										{{/if}}
									{{/if}}
									{{if (options.sameAsNext)}} sameAsNext{{/if}}
								"
								title="{{message._id}}"
								style="
									{{if (options.message._media)}}
										{{if (!options.message._message)}}
											--brImage: url('{{message._media.getPreviewBase64()}}'); background-image: url('{{message._media.getPreviewBase64()}}');
										{{/if}}
										min-width: {{mediaSize.width}}px;
									{{/if}}
								"
								>

								{{if (options.message._media && options.message._message)}}
									<div id="messageMedia_{{message._id}}" class="messageMedia" style="background-image: url('{{message._media.getPreviewBase64()}}');
										min-width: {{mediaSize.width}}px;">
									{{if (options.message._media.isVideo())}}
										<div class="duration">{{message._media.getInfo('videoDurationHuman')}}</div><div class=playIcon></div>
									{{/if}}
									</div>
								{{/if}}

								{{if (!options.message._media)}}
									<div class="messageAuthor">{{authorName}}</div>
									{{if (options.reply)}}
										<div class="messageReply">
											<div class="author">{{reply.author}}</div>
											<div class="replyBody">{{reply.message}}</div>
										</div>
									{{/if}}
								{{/if}}

								<div class="messageContent {{if (options.message._media && !options.message._message)}}messageMediaOnly{{/if}}"
									style="max-width: {{mediaSize.width}}px;"
									>
									{{if (options.message._media && options.message._media.isVideo())}}
										{{if (options.message._media && !options.message._message)}}
											<div id="messageMedia_{{message._id}}" class="messageMedia" style="background-image: url('{{message._media.getPreviewBase64()}}');"><div class="duration">{{message._media.getInfo('videoDurationHuman')}}</div><div class=playIcon></div></div>
										{{/if}}
										{{if (0)}}
										<div class="messageVideoContainer">
											<video muted id="messageVideo_{{message._id}}" autoplay loop></video>
										</div>
										{{/if}}
										{{if (options.message.formatMessageBody())}}
											<div class="messageText">{{message.formatMessageBody()|safe}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
										{{/if}}
									{{#else}}

										{{message.formatMessageBody()|safe}}

										{{if (options.message._webpage)}}
											<a href="{{message._webpage.getInfo('url')|safe}}" class="messageWebpage" target="_blank">
												{{if (options.message._webpage.getInfo('hasPhoto'))}}
												<div class="webpagePhoto {{if (options.message._webpage.getInfo('photoIsSquare'))}}webpagePhotoSquare{{/if}}" id="messageWebpagePhoto_{{message._id}}"
													style="
														{{if (!options.message._webpage.getInfo('photoIsSquare'))}}height: {{message._webpage.getInfo('photoHeight')}}px;{{/if}}
													"
												>
												</div>
												{{/if}}
												<div class="webpageSitename">{{message._webpage.getInfo('siteName')}}</div>
												<div class="webpageTitle">{{message._webpage.getInfo('title')}}</div>
												{{if (options.message._webpage.getInfo('description'))}}
												<div class="webpageDescription">{{message._webpage.getInfo('description')}}</div>
												{{/if}}
											</a>
										{{/if}}

										&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
									{{/if}}
								</div>
								<div class="messageMeta">{{message.getDisplayTime()}} {{if (options.viewedByPeer)}}{{component(options.components.Icon)}}{{/component}}{{/if}}</div>


								<div class="avatar avatarSmall">
									{{if (options.message.hasAvatar())}}
									<div class="avatarBack" style="background-image: url('{{ message.getAvatarBlobURLSync() }}');"></div>
									{{#else}}
									<div class="avatarBack panelTopAvatarBack"></div>
									<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
									{{/if}}
								</div>

							</div>

					{{/if}}

				{{/if}}
			{{/if}}

			<div style="clear: both"></div>
		`;

module.exports = Message;


			// {{if (options.message.isDownloadable())}}
			// {{#else}}
			// 	{{if (options.isSticker)}}
			// 	<div id="message_{{message._id}}" data-id="{{message._id}}" class="panelMessageSticker {{if (options.isAnimatedSticker)}}panelMessageAnimatedSticker{{/if}} panelMessageSticker{{viewType}} {{if (options.sameAsNext)}}sameAsNext{{/if}} {{if (options.fromMe)}} stickerFromMe{{#else}} stickerFromThem{{/if}}">
			// 		<div id="sticker_{{message._id}}" class="messageSticker"></div>

			// 		<div class="avatar avatarSmall">
			// 			<div class="avatarBack" style="background-image: url('{{ message.getCachedAvatarURL() }}');"></div>
			// 			<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
			// 		</div>
			// 	</div>
			// 	{{#else}}
			// 	<div id="message_{{message._id}}" data-id="{{message._id}}"
			// 	class="panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}} {{if (options.hasVideo)}} withVideo{{#else}}{{if (options.isMediaOnly)}} withPhoto{{/if}}{{/if}}{{if (options.sameAsNext)}} sameAsNext{{/if}}"
			// 	title="{{message._id}}"
			// 	style="
			// 	{{if (options.isMediaOnly)}}--brImage: url('data:image/jpeg;base64,{{messagePreview}}'); background-image: url('data:image/jpeg;base64,{{messagePreview}}');{{/if}}
			// 	{{if (options.hasMedia && !options.hasVideo)}}min-width: {{mediaSize.width}}px;{{/if}}
			// 	"
			// 	>
			// 		{{if (options.hasMedia && !options.isMediaOnly)}}
			// 			<div id="messageMedia_{{message._id}}" class="messageMedia" style="background-image: url('data:image/jpeg;base64,{{messagePreview}}');">
			// 			</div>
			// 		{{/if}}
			// 		{{if (!options.hasMedia)}}
			// 			<div class="messageAuthor">{{authorName}}</div>
			// 			{{if (options.reply)}}
			// 				<div class="messageReply">
			// 					<div class="author">{{reply.author}}</div>
			// 					<div class="replyBody">{{reply.message}}</div>
			// 				</div>
			// 			{{/if}}
			// 		{{/if}}
			// 		<div class="messageContent {{if (options.isMediaOnly)}}messageMediaOnly{{/if}}"
			// 			style="max-width: {{mediaSize.width}}px;"
			// 			>
			// 		{{if (options.hasVideo)}}
			// 			{{if (options.hasMedia && options.isMediaOnly)}}
			// 				<div id="messageMedia_{{message._id}}" class="messageMedia"></div>
			// 			{{/if}}
			// 			<div class="messageVideoContainer">
			// 				<video muted id="messageVideo_{{message._id}}" autoplay loop></video>
			// 			</div>
			// 			{{if (options.message.formatMessageBody())}}
			// 				<div class="messageText">{{message.formatMessageBody()|safe}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
			// 			{{/if}}
			// 		{{#else}}

			// 		{{message.formatMessageBody()|safe}}

			// 		{{if (options.message.hasWebpage())}}
			// 			{{js(options.web = options.message.getWebpageInfo())/}}
			// 			<a href="{{web.url|safe}}" class="messageWebpage" target="_blank">
			// 				{{if (options.web.hasPhoto)}}
			// 				<div class="webpagePhoto {{if (options.web.photoIsSquare)}}webpagePhotoSquare{{/if}}" id="messageWebpagePhoto_{{message._id}}"
			// 					style="
			// 						{{if (!options.web.photoIsSquare)}}height: {{web.photoHeight}}px;{{/if}}
			// 					"
			// 				>
			// 				</div>
			// 				{{/if}}
			// 				<div class="webpageSitename">{{web.siteName}}</div>
			// 				<div class="webpageTitle">{{web.title}}</div>
			// 				{{if (options.web.description)}}
			// 				<div class="webpageDescription">{{web.description}}</div>
			// 				{{/if}}
			// 			</a>
			// 		{{/if}}


			// 		&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
			// 		{{/if}}
			// 		</div>
			// 		<div class="messageMeta">{{message.getDisplayTime()}} {{if (options.viewedByPeer)}}{{component(options.components.Icon)}}{{/component}}{{/if}}</div>


			// 		<div class="avatar avatarSmall">
			// 			<div class="avatarBack" style="background-image: url('{{ message.getCachedAvatarURL() }}');"></div>
			// 			<div class="avatarInitials avatarC{{ message.getAvatarColor() }}">{{ message.getAvatarInitials() }}</div>
			// 		</div>

			// 	</div>
			// 	{{/if}}
			// {{/if}}
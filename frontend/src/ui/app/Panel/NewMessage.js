// const UI = window.classes.UI;
const AppIcon = require('../../icons/AppIcon.js');
const AppUI = require('../../../utils/AppUI.js');
// const NewMessageEmoji = require('./NewMessageEmoji.js');

const Menu = require('../utils/Menu.js');
const Upload = require('./Upload.js');

class NewMessage extends AppUI {
	constructor(params) {
		super(params);
		this._data.icon = params.icon || 'up';
		// this._data.flip = this._flip;
		//
		this._components['IconSend'] = this.newC(AppIcon, {icon: 'send'});
		this._components['IconClose'] = this.newC(AppIcon, {icon: 'close'});
		this._components['IconSmile'] = this.newC(AppIcon, {icon: 'smile'});
		this._components['IconAttach'] = this.newC(AppIcon, {icon: 'attach'});
		this._components['IconDelete'] = this.newC(AppIcon, {icon: 'delete'});
		this._components['IconMic'] = this.newC(AppIcon, {icon: 'microphone'});

		this._components['AttachMenu'] = this.newC(Menu, {items: [
				['photo', 'photo', 'Photo or Video'],
				['doc', 'document', 'Document'],
			]});
		this._components['Upload'] = this.newC(Upload);

		// this._components['NewMessageEmoji'] = this.newC(NewMessageEmoji);

		this._events = [
			['keydown', 'body', 'onChange'],
			['change', 'body', 'onChange'],
			['click', 'send', 'onSubmit'],
			['mousedown', 'send', 'onDownSubmit'],
			['touchstart', 'send', 'onDownSubmit'],
			['touchend', 'send', 'onUpSubmit'],
			['mouseup', 'send', 'onUpSubmit'],
			['click', 'delete', 'onDeleteVoice'],
			['click', 'removeAttach', 'removeAttach'],
			// ['mouseenter', 'emojiButton', 'showEmoji'],
			['click', 'emojiButton', 'showEmoji'],
			['contextmenu', 'send', 'onContext'],
			['click', 'attachButton', 'showAttach']
		];

		this._componentEvents = [
			// ['emoji', 'NewMessageEmoji', 'onEmoji'],
			// ['sticker', 'NewMessageEmoji', 'onSticker'],
			['sendFiles', 'Upload', 'onSendFiles'],
			['photo', 'AttachMenu', 'onUploadPhoto'],
			['doc', 'AttachMenu', 'onUploadFile'],
		];

		this._textHeightStyle = 'small'; // 1 line input by default. 'small', 'large', 'huge' are possible values
		this._setToLargeAt = 0; // store body length at which we increased it's height, to know when to decrease
		this._setToHugeAt = 0;

		this._lastELength = 0;

		this._replyToMessage = null;
		this._webpage = null;
		this._entities = null;

		this._messageType = 'voice';
		this._hasVoice = false;
		this._isRecording = false;

		this._isSubmitDown = false;

		this.setGlobalCatch();
	}

	onContext(e) {
		e.preventDefault();
	}

	setGlobalCatch() {
		if (!NewMessage.__globalKeydownCatch) {
			NewMessage.__globalKeydownCatch = (e)=>{
				try {
					if (e.keyCode <= 46) {
						return;
					}
					if (document.activeElement && (document.activeElement.tagName.toLowerCase() == 'textarea' || document.activeElement.tagName.toLowerCase() == 'input')) {
						return;
					}

					const elBody = document.querySelector('#body');
					elBody.focus();
					elBody.dispatchEvent(e);
				} catch(e) {}
			};
			// NewMessage.__globalMouseupCatch = (e)=>{
			// 	this.onUpSubmit();
			// };
		}

		document.removeEventListener('keydown', NewMessage.__globalKeydownCatch);
		document.addEventListener('keydown', NewMessage.__globalKeydownCatch);
		// document.removeEventListener('mouseup', NewMessage.__globalMouseupCatch);
		// document.addEventListener('mouseup', NewMessage.__globalMouseupCatch);
		// document.removeEventListener('touchend', NewMessage.__globalMouseupCatch);
		// document.addEventListener('touchend', NewMessage.__globalMouseupCatch);
	}

	onDeleteVoice() {
		this._hasVoice = false;
		this.$('.newMessageContainer').classList.remove('withVoice');
		this.$('.newMessageContainer').classList.remove('withVoiceRecorded');

		this.$('.nmvDuration').classList.remove('active');
		this.$('.nmvDuration').innerText = '';
	}

	async recordedDurationLoop() {
		do {
			let duration = this._app._mediaPlayer.getRecordedDuration();
			let text = ''+Math.floor(duration / 60) + ':' + ('0' + (Math.floor(duration) % 60)).slice(-2) + ',' + ('0' + (Math.floor(duration*100) % 100)).slice(-2);
			this.$('.nmvDuration').innerText = (duration ? text : '');
			// console.log('loop');

			await new Promise((res)=>{setTimeout(res, 61);}); // looks natural with prime timeout

			this.$('.nmvInitializing').classList[(duration ? 'remove' : 'add')]('active');
			this.$('.nmvRecording').classList[(duration ? 'add' : 'remove')]('active');
			this.$('.nmvDuration').classList[(duration ? 'add' : 'remove')]('active');

		} while(this._app._mediaPlayer._isRecording);
	}

	async errorRecordIcon() {
		const appIcon = new AppIcon({icon: 'nosound'});
		const html = appIcon.render({noDOM: true});
		this.$('.mmvStatusIcon').innerHTML = html;
	}

	async onDownSubmit() {
		this._isSubmitDown = true;
		if (this._messageType == 'voice' && !this._lastELength && !this._hasVoice) {
			// console.error('starting rec')

			this.$('.newMessageContainer').classList.add('withVoice');
			this.$('.nmvDuration').innerText = '';
			this.recordedDurationLoop();

			this._isRecording = true;

			let s = await this._app._mediaPlayer.initRecorder();
			if (!s) {
				this.errorRecordIcon();
			} else {
				this.$('.mmvStatusIcon').innerHTML = '';
			}

			this.recordedDurationLoop();
		}

		this.mouseupUpG(()=>{
			this.onUpSubmit();
		});
	}

	async onUpSubmit() {
		if (!this._isSubmitDown) {
			return;
		}

		this._isSubmitDown = false;
		if (this._messageType == 'voice' && this._isRecording) {
			this._isRecording = false;
			this.$('.nmvRecording').classList.remove('active');

			await this._app._mediaPlayer.stopRecorder();
			let duration = this._app._mediaPlayer.getRecordedDuration();

			// if (duration === 0) {
			// 	this._hasVoice = false;
			// 	this.setMessageType('voice');
			// } else {
			// 	this._hasVoice = true;
			// 	this.setMessageType('message');
			// }

			if (duration < 0.3) {
				this._hasVoice = false;
				this.$('.newMessageContainer').classList.remove('withVoiceRecorded');
				this.$('.newMessageContainer').classList.remove('withVoice');
			} else {
				this._hasVoice = true;
				this.$('.newMessageContainer').classList.add('withVoiceRecorded');
			}
		} else if (this._hasVoice) {
			this.emit('sendVoice');
			this.$('.newMessageContainer').classList.remove('withVoiceRecorded');
			this.$('.newMessageContainer').classList.remove('withVoice');

			this.$('.nmvDuration').classList.remove('active');
			this.$('.nmvDuration').innerText = '';

			this._hasVoice = false;
		}
	}

	onSubmit() {
		const elBody = this.$('#body');
		if (!elBody || !elBody.value) {
			return false;
		}

		const message = {
			message: elBody.value
		};

		if (this._replyToMessage) {
			message.replyTo = this._replyToMessage;
		}
		if (this._webpage) {
			message.webpage = this._webpage;
		}

		let entities = this.calculateEntities(message.message);
		if (entities && entities.length) {
			message.entities = entities;
		}

		elBody.value = '';
		this._lastELength = 0;
		this._setToLargeAt = null;
		this._setToHugeAt = null;
		// this._textHeightStyle = 'small';
		this.setTextHeightStyle('small');

		// elBody.classList.remove('newMessageLarge');
		// elBody.classList.remove('newMessageHuge');
		this.emit('submitMessage', message);
		this.removeAttach();

		this._mostRecentURLFetched = null;

		this.$('.newMessageContainer').classList.remove('withText');
	}

	// setMessageType(type) {
	// 	if (this._messageType == type) {
	// 		return;
	// 	}

	// 	this._messageType = type;
	// 	if (type == 'voice') {
	// 		this.$('#sendMessage').classList.remove('active');
	// 		this.$('#sendVoice').classList.add('active');
	// 	} else {
	// 		this.$('#sendMessage').classList.add('active');
	// 		this.$('#sendVoice').classList.remove('active');
	// 	}
	// }

	onSendFiles(data) {
		this.emit('sendFiles', data);
	}

	onUploadPhoto() {
		this._components.Upload.selectFiles(true);
	}

	onUploadFile() {
		this._components.Upload.selectFiles(false);
	}

	showAttach() {
		// let bounding = this.$('#attachButton').getBoundingClientRect();
		this._components.AttachMenu.show();
	}

	showEmoji() {
		let bounding = this.$('.emojiAt').getBoundingClientRect();
		this._app._interface._components.EmojiDialog.show(bounding.left, bounding.top);
	}

	// onSticker(apiDoc) {
	// 	this.emit('sticker', apiDoc);
	// }

	calculateEntities(text) {
		let entities = [];
		let matches = (''+text).match(/\bhttps?:\/\/\S+/gi);

		let getIndicesOf = function(searchStr, str, caseSensitive) {
			// thanks Tim Down, https://stackoverflow.com/a/3410557/1119169
			let searchStrLen = searchStr.length;
			if (searchStrLen == 0) {
			    return [];
			}
			let startIndex = 0, index, indices = [];
			if (!caseSensitive) {
			    str = str.toLowerCase();
			    searchStr = searchStr.toLowerCase();
			}
			while ((index = str.indexOf(searchStr, startIndex)) > -1) {
			    indices.push(index);
			    startIndex = index + searchStrLen;
			}
			return indices;
		}

		if (matches && matches.length) {
			for (let match of matches) {
				let indeces = getIndicesOf(match, text, false);
				let matchLength = (''+match).length;
				for (let index of indeces) {
					entities.push({
						_: 'messageEntityUrl',
						offset: index,
						length: matchLength,
					});
				}
			}
		}

		return entities;
	}


	onEmoji(emoji) {
		const elBody = this.$('#body');
		if (elBody.selectionStart || (elBody.selectionStart === 0 && elBody.selectionEnd)) {
			let startPos = elBody.selectionStart;
			let endPos = elBody.selectionEnd;
			elBody.value = elBody.value.substring(0, startPos) + emoji + elBody.value.substring(endPos, elBody.value.length);
			elBody.selectionStart =  elBody.value.length;
			elBody.selectionEnd =  elBody.value.length;
		} else {
			elBody.value += emoji;
		}

		this.onChange();
	}

	removeAttach() {
		this._replyToMessage = null;
		this._webpage = null;

		this.$('.newMessageAttached').classList.remove('hasSomething');
	}

	setReplyToMessage(peerMessage) {
		if (!this.$()) {
			return false;
		}

		this._webpage = null;
		this._replyToMessage = peerMessage;

		this.$('.author').innerHTML = this.escapeHTML(peerMessage.getAuthorFirstName());
		this.$('.replyBody').innerHTML = this.escapeHTML(peerMessage.getDisplayMessage());

		this.$('.newMessageAttached').classList.add('hasSomething');
		this.$('.messageReply').classList.add('active');
		this.$('.messageWebpage').classList.remove('active');
	}

	updateWebpagePreview(webPageApiObject) {
		if (webPageApiObject && webPageApiObject.site_name) {
			this._replyToMessage = null;
			this._webpage = webPageApiObject;

			this.$('.webpageSitename').innerHTML = this.escapeHTML(webPageApiObject.site_name);
			this.$('.webpageTitle').innerHTML = this.escapeHTML(webPageApiObject.title ? webPageApiObject.title : '')+'&nbsp;';
			this.$('.newMessageAttached').classList.add('hasSomething');
			this.$('.messageReply').classList.remove('active');
			this.$('.messageWebpage').classList.add('active');
		} else {
			this.$('.newMessageAttached').classList.remove('hasSomething');
		}
	}

	async detectURLs(message) {
		let matches = (''+message).match(/\bhttps?:\/\/\S+/gi);
		if (matches && matches[0]) {
			let url = (''+matches[0]);
			if (url == this._mostRecentURLFetched) {
				return false;
			}

			let resp = await this._app._user.invoke('messages.getWebPage', {url: url});
			if (resp) {
				if (resp && resp.data && resp.data._ == 'webPage') {
					this.updateWebpagePreview(resp.data);
				}
			}

			this._mostRecentURLFetched = url;
		}
	}

	setTextHeightStyle(mode) {
		const elBody = this.$('#body');
		this._textHeightStyle = mode;
		if (mode == 'small') {
			elBody.classList.remove('newMessageLarge');
			elBody.classList.remove('newMessageHuge');
		} else if (mode == 'large') {
			elBody.classList.remove('newMessageHuge');
			elBody.classList.add('newMessageLarge');
		} else if (mode == 'huge') {
			elBody.classList.add('newMessageHuge');
			elBody.classList.remove('newMessageLarge');
		}

		this.emit('mode', mode);
	}

	onChange(e) {
		if (e && e.keyCode && e.keyCode == 13) {
			if (this._textHeightStyle == 'small') {
				let isShift;
				if (window.event) {
					isShift = !!window.event.shiftKey; // typecast to boolean
				} else {
					isShift = !!ev.shiftKey;
				}

				if (!isShift) {
					this.onSubmit();
					e.preventDefault();
				}

				return true;
			}
			// Enter
		}

		this.nextTick(()=>{
			const charWidthTrick = 2;
			const elBody = this.$('#body');

			const contentHeight = elBody.offsetHeight;
			const scrollHeight = elBody.scrollHeight;

			const bodyValLength = elBody.value.length;

			this.detectURLs(elBody.value);

			if (this._setToLargeAt && this._setToLargeAt > bodyValLength + charWidthTrick) {
				// need to decrease ( not perfect, as chars have diff width, so we add trick val but enough to look ok)
				this._setToLargeAt = null;
				this._setToHugeAt = null;
				// this._textHeightStyle = 'small';

				this.setTextHeightStyle('small');
				// elBody.classList.remove('newMessageLarge');
				// elBody.classList.remove('newMessageHuge');
				// elBody.classList.add('newMessageSmall');
			}
			if (this._setToHugeAt && this._setToHugeAt > bodyValLength + charWidthTrick) {
				this._setToHugeAt = null;
				this.setTextHeightStyle('large');
				// this._textHeightStyle = 'large';
				// elBody.classList.remove('newMessageHuge');
				// elBody.classList.add('newMessageSmall');
			}

			if (scrollHeight > (contentHeight + charWidthTrick)) { /// has to increase
				if (this._textHeightStyle == 'small') {
					this.setTextHeightStyle('large');
					// this._textHeightStyle = 'large';
					this._setToLargeAt = this._lastELength;
					// elBody.classList.add('newMessageLarge');
					// elBody.classList.remove('newMessageSmall');
				} else if (this._textHeightStyle == 'large') {
					if (bodyValLength > (this._setToLargeAt + 10)) { // catch to be sure we are after transition is done
						// there's a bug when you try to remove pasted content. @todo: find a way to fix keeping it fast
						// this._textHeightStyle = 'huge';
						this.setTextHeightStyle('huge');
						this._setToHugeAt = this._lastELength;
						// elBody.classList.add('newMessageHuge');
					}
					// elBody.classList.remove('newMessageSmall');
				}
			}

			this._lastELength = bodyValLength;

			if (this._lastELength) {
				this.$('.newMessageContainer').classList.add('withText');
			} else {
				this.$('.newMessageContainer').classList.remove('withText');
			}
		});
	}
};

NewMessage.template = `
			<div class="newMessageContainer">
				<div class="newMessageButton" id="send">
					<div id="sendMessage" class="nmbType">{{component(options.components.IconSend)}}{{/component}}</div>
					<div id="sendVoice" class="nmbType">{{component(options.components.IconMic)}}{{/component}}</div>
				</div>
				<div class="deleteVoiceButton" id="delete">
					<div id="deleteVoice" class="nmbType">{{component(options.components.IconDelete)}}{{/component}}</div>
				</div>
				<div class="newMessageComposer">
					<div class="newMessageAttached">
						<div class="removeAttach" id="removeAttach">{{component(options.components.IconClose)}}{{/component}}</div>
						<div class="messageReply newMessageAttachedCont">
							<div class="author"></div>
							<div class="replyBody"></div>
						</div>
						<div class="messageWebpage newMessageAttachedCont">
							<div class="webpageSitename"></div>
							<div class="webpageTitle"></div>
						</div>
					</div>

					<div class="emojiContr">
						<div class="emojiAt"></div>
						<div class="emojiButton" id="emojiButton">{{component(options.components.IconSmile)}}{{/component}}</div>
					</div>
					<div class="newMessageAttachment">
						{{component(options.components.AttachMenu)}}{{/component}}
						<div class="attachButton" id="attachButton">{{component(options.components.IconAttach)}}{{/component}}</div>
					</div>
					<div class="newMessageVoice">
						<div class="nmvDuration"></div>
						<div class="mmvStatus">
							<div class="mmvStatusIcon"></div>
							<div class="nmvRecording"></div>
							<div class="nmvInitializing active"><div class="cssload-zenith dark"></div></div>
						</div>
					</div>
					<div class="newMessageText"><textarea placeholder="Message" id="body"></textarea></div>
				</div>

				{{component(options.components.Upload)}}{{/component}}

			</div>
		`;

module.exports = NewMessage;
					// <div class="emojiButton" id="emojiButton">
					// 	{{component(options.components.IconSmile)}}{{/component}}
					// </div>
					// <div class="newMessageEmoji">{{component(options.components.NewMessageEmoji)}}{{/component}}</div>




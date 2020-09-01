const PanelEScroll = require('./Panel/PanelEScroll.js');

const MessagesFactory = require('./Panel/Messages/MessagesFactory.js');

const NewMessage = require('./Panel/NewMessage.js');

const MessageMedia = require('../../state/MessageMedia.js');
// const RightSidebar = require('./Panel/RightSidebar.js');

const StickersPopup = require('./Panel/StickersPopup.js');

const Menu = require('./utils/Menu.js');

class Panel extends PanelEScroll {
	constructor(params) {
		super(params);

		this._peerManager = this._app._peerManager;

		this._events = [
			['scroll', 'panelMessages', 'onScroll'],
			// ['click', 'panelBack', 'backToDialogs'],
			// ['click', 'panelSearch', 'onStartSearch'],
			// ['click', 'panelMore', 'onShowMore'],
			['click', 'panelPush', 'onMessageClick'],
			['mousemove', 'panelPush', 'onMessageMove'],
			['touchstart', 'panelPush', 'onTouchStart'],
			['touchmove', 'panelPush', 'onTouchMove'],
			['contextmenu', 'panelPush', 'onMessageContext'],
			// ['mousedown', 'panel', 'onMouseDown'],
		];

		// this._components['SubsButton'] = this.newC(Button, {title: 'Subscribe', loadingTitle: 'Subscribing...'});
		// this._components['BackIcon'] = this.newC(AppIcon, {icon: 'back'});
		// this._components['SearchIcon'] = this.newC(AppIcon, {icon: 'search'});
		// this._components['MoreIcon'] = this.newC(AppIcon, {icon: 'more'});

		this._components['NewMessage'] = this.newC(NewMessage);
		// this._components['RightSidebar'] = this.newC(RightSidebar);

		this._components['StickersPopup'] = this.newC(StickersPopup);

		// setTimeout(()=>{
		// 	this.onMessageClick({target: this.$('#message_201611')});
		// 	// this._components['SearchCalendar'].show({peerManager: this._peerManager});
		// }, 500);

		this._components['MessageMenu'] = this.newC(Menu, {items: [
					['reply', 'reply', 'Reply'],
					['copy', 'copy', 'Copy'],
					['forward', 'forward', 'Forward'],
				]});

		this._componentEvents = [
			// ['click', 'SubsButton', 'onSubs'],
			['submitMessage', 'NewMessage', 'onSubmitMessage'],
			['sendVoice', 'NewMessage', 'onSendVoice'],
			// ['message', 'RightSidebar', 'onMessageToJump'],
			// ['forward', 'RightSidebar', 'onForward'],
			['sendFiles', 'NewMessage', 'onSendFiles'],
			['mode', 'NewMessage', 'onNewMessageHeight'],
			['reply', 'MessageMenu', 'onSetReply'],
			['forward', 'MessageMenu', 'onSetForward'],
			['copy', 'MessageMenu', 'onCopy'],
			// ['sticker', 'NewMessage', 'onSticker'],
		];

		this._components.messages = [];
		this._components.searchmessages = [];
		this._cIds = {};

		this._theOldestMessageDate = null;

		this._data.peer = params.peer || null;
		this._data.isLoading = true;
		this._data.sidebarIsClosed = true;

		let docStatus = (doc) => {
			this.docStatus(doc);
		};

		this._peerManager._download.on('downloaded', docStatus);
		this._peerManager._download.on('progress', docStatus);

		this._peerManager.on('readybypeer', (params)=>{
			if (params.peer._id == this._data.peer._id) {
				for (let m of this._data.peer._messagesVisible) {
					if (m.seenByPeer() && m.isFromMe() && this._cIds[m._id]) {
						this._cIds[m._id].markAsRead();
					}
				}
				// alert('mark reads');f
			}
		});

		// this._peerManager.on('subscribed', (params)=>{
		// 	if (params.peer._id == this._data.peer._id) {
		// 		const el = this.$('.panelSubs');
		// 		if (this._data.peer.isSubscribed()) {
		// 			el.classList.remove('visible');
		// 		} else {
		// 			el.classList.add('visible');
		// 		}
		// 	}
		// });
	}


	// onMouseDown(event) {
	// 	const base = this.$();
	// 	let closest = event.target.closest('.rpb');

	// 	if (closest && base.contains(closest)) {
	// 		this.rippleOn(closest, event);
	// 	}
	// }

	onCopy(params) {
		this._components.MessageMenu._peerMessage.copyToClipboard();
	}

	onSetForwardMedia(params) {
		this._parent._components.RightSidebar.showBlock('Forward', {
			messageMedia: params.messageMedia,
		});
		this._parent._components.RightSidebar.show();
		this._parent._components.RightSidebar.moveToTop();
	}

	onSetForward() {
		if (this._components.MessageMenu && this._components.MessageMenu._peerMessage) {
			this._parent._components.RightSidebar.showBlock('Forward', {
				peerMessage: this._components.MessageMenu._peerMessage,
			});
			this._parent._components.RightSidebar.show();
		}
	}

	onForward(params) {
		if (params && params.peers) {
			for (let peer of params.peers) {
				if (params.peerMessage) {
					peer.forwardMessage(params.peerMessage);
				} else if (params.messageMedia) {
					peer.forwardMessageMedia(params.messageMedia);
				} else if (params.botResults) {
					/**
					 * May be inlineBotResult or startgroup
					 */
					peer.forwardBotResult(params.botResults);
				}
			}
		}
	}


	onButtonBotResults(botResults) {
		this._parent._components.RightSidebar.showBlock('Forward', {
			botResults: botResults,
		});
		this._parent._components.RightSidebar.show();
	}

	onSetReply() {
		if (this._components.MessageMenu && this._components.MessageMenu._peerMessage) {
			if (this._components.NewMessage) {
				this._components.NewMessage.setReplyToMessage(this._components.MessageMenu._peerMessage);
			}
		}
	}

	onSendVoice() {
		this._data.peer.sendRecordedVoice();
	}

	onNewMessageHeight(mode) {
		const messagesCont = this.$('#panelMessages');
		if (mode == 'small') {
			messagesCont.classList.remove('panelMessagesLarge');
			messagesCont.classList.remove('panelMessagesHuge');
		} else if (mode == 'large') {
			messagesCont.classList.add('panelMessagesLarge');
			messagesCont.classList.remove('panelMessagesHuge');
		} else if (mode == 'huge') {
			messagesCont.classList.remove('panelMessagesLarge');
			messagesCont.classList.add('panelMessagesHuge');
		}
	}

	docStatus(docItem) {
		let docContainers = this.$$('.rsDoc_'+docItem.id);
		for (let docContainer of docContainers) {

			let progressContainer = docContainer.querySelector('.progress');

			if (docContainer) {
				if (!docItem._isDownloaded) {
					if (docItem._isDownloading) {
						// update percentage
						docContainer.querySelector('.rsDocMeta').innerHTML = ''+docItem._downloadingPercentage+"% &bull; "+docItem._downloadingSizeHuman+' of '+docItem.getInfo('sizeHuman');

						let p = (Math.floor(docItem._downloadingPercentage / 10) * 10);

						progressContainer.className = 'progress';
						progressContainer.classList.add('active');
						progressContainer.classList.add('progress'+p);
						docContainer.querySelector('.rsDocIcon').classList.add('loading');
					} else {
						docContainer.querySelector('.rsDocIcon').classList.remove('loading');
						docContainer.querySelector('.rsDocIcon').classList.remove('ready');
						docContainer.querySelector('.rsDocMeta').innerHTML = ''+docItem.getInfo('sizeHuman');

						progressContainer.classList.remove('active');
					}

				} else {
					// ready to be saved
					progressContainer.className = 'progress';
					progressContainer.classList.add('progress100');

					docContainer.querySelector('.rsDocMeta').innerHTML = ''+docItem.getInfo('sizeHuman');
					docContainer.querySelector('.rsDocIcon').classList.remove('loading');
					docContainer.querySelector('.rsDocIcon').classList.add('ready');
				}
			}

		}
	}

	afterRender() {
		this.reinitScrollBar(true);
	}

	reinitScrollBar(forceReInit) {
		let container = this.$('.panelMessages');
		this.initScrollBarOn(container, forceReInit);
	}

	onSendFiles(data) {
		const peerMessage = this._data.peer.sendFiles(data.files, data.caption);
		if (peerMessage) {

			this.messagesLoaded();
		}
	}

	async loadThumbs() {
		if (this._data.peer) {
			console.time('loading previews from cache');
			let startedOn = this._data.peer;
			await this._data.peer.loadPreviewsFromCache();
			if (this._data.peer._id == startedOn._id) {
				for (let m of this._data.peer._messagesVisible) {
					m._previewProcessed = false;
				}
				this._hasMoreThumbsToPreview = true;
			}
			console.timeEnd('loading previews from cache');
		}
	}

	async loadNextThumb() {
		if (!this._hasMoreThumbsToPreview) {
			return false;
		}

		let started = this._data.peer._id;
		let loadedSomething = false;

		let workOnMessagePreview = async (message, dcShift) => {
			// console.error('workOn message preview cache', message._id, message);

			if (message._media) {
				if (message._media.cached) {
					this.sendDataToMessage(message, 'photoLoaded', message._media.blobURL);
				} else {
					let blobURL = await message._media.loadPreview(dcShift);
					if (blobURL) {
						this.sendDataToMessage(message, 'photoLoaded', blobURL);
					}

					return true;
				}
			}
			if (message._sticker) {
				if (message._sticker.cached) {
					// console.error('sticker was cached');
					this.sendDataToMessage(message, 'stickerLoaded', message._sticker);
					await new Promise((res)=>{setTimeout(res,10);});
				} else {
					// console.error('sticker was not cached');
					await message._sticker.load(dcShift);

					this.sendDataToMessage(message, 'stickerLoaded', message._sticker);

					return true;
				}
			}
			if (message._webpage) {
				if (message._webpage.cached) {
					// console.error('webpage photo was cached');
					this.sendDataToMessage(message, 'webpagePhotoLoaded', message._webpage);
				} else {
					console.error('webpage photo was not cached');
					if (message._webpage.getInfo('hasPhoto')) {
						await message._webpage.loadPhoto(dcShift);

						this.sendDataToMessage(message, 'webpagePhotoLoaded', message._webpage);

						return true;
					}
				}
			}
		};

		const workOn = async(arr)=>{
			const mL = arr.length-1;
			// const baseN = this._data.peer._baseMessageN || mL;
			const baseN = mL;

			// console.error('baseN baseN', baseN, arr[baseN]._id);

			// for (let i = (baseN ? baseN : arr.length-1); )

			let promises = [];
			let dcShift = 1;
			for (let i = 0; ((i+baseN) <= mL || (baseN-i) >= 0); i++) {
				// let success = false;
				if (arr[baseN-i] && !arr[baseN-i]._previewProcessed) {
			// console.error('baseN', arr[baseN-i]._id);
					const item = arr[baseN-i];

					promises.push(workOnMessagePreview(item, dcShift++));
					// success = await workOnMessagePreview(item);
					item._previewProcessed = true;
				}
				if (arr[baseN+i] && !arr[baseN+i]._previewProcessed) {
			// console.error('baseN', arr[baseN+i]._id);
					const item = arr[baseN+i];

					promises.push(workOnMessagePreview(item, dcShift++));
					// let success2 = await workOnMessagePreview(item);
					// if (!success) {
					// 	success = success2;
					// }
					item._previewProcessed = true;
				}

				if (dcShift >= 3) {
					let rs = await Promise.all(promises);
					if (rs.indexOf(true) != -1) {
						return true;
					}
					promises = [];
				}
			}

			if (promises.length) {
				let rs = await Promise.all(promises);
				if (rs.indexOf(true) != -1) {
					return true;
				}
			}

			return false;
		};

		// loadedSomething = await workOn(this._components.messages);
		// if (!loadedSomething) {
			loadedSomething = await workOn(this._data.peer._messagesVisible);
		// }

		if (!loadedSomething) {
			if (this._data.peer._id == started) {
				this._hasMoreThumbsToPreview = false;
			}
		} else {
			this._moreThumbsTimeout = setTimeout(()=>{
				this.loadNextThumb();
			}, 100);
		}

	}

	onMessageToJump(message) {
		this.jumpToMessage(message.messageId);
	}

	// onShowMore() {
	// 	this._components.RightSidebar.showBlock('Info');
	// 	this._components.RightSidebar.show();
	// }

	// onStartSearch() {
	// 	this._components.RightSidebar.onSearch();
	// }


	onTouchStart(e) {
		if (e.touches) {
			clearTimeout(this._ltt);
			this._ltt = setTimeout(()=>{
				const event = new MouseEvent('contextmenu', {
											bubbles: true,
											cancelable: true,
											clientX: e.touches[0].clientX,
											clientY: e.touches[0].clientY,
										});
				e.target.dispatchEvent.call(e.target,event);
			},1200);
		}
	}

	onTouchMove() {
		clearTimeout(this._ltt);
	}

	onMessageContext(e) {
		e.preventDefault();
		clearTimeout(this._ltt);

		const base = this.$();
		let closest = event.target.closest('.panelMessage');
		if (!closest) {
			closest = event.target.closest('.panelMessageSticker');
		}

		if (closest && base.contains(closest)) {
			const messageId = closest.dataset.id;
			let message = null;
			if (this._data.peer._messageIds[messageId]) {
				message = this._data.peer._messageIds[messageId];
			} else if (this._cIds[messageId]) {
				message = this._cIds[messageId]._data.message;
			}

			this._components['MessageMenu'].show(e);
			this._components['MessageMenu']._peerMessage = message;
		}

	    return false;
	}

	onMessageMove(e) {
		let closest = e.target.closest('.messageMove');
		if (closest && closest.dataset.moveaction) {
			const messageId = closest.dataset.id;
			let message = null;
			if (this._data.peer._messageIds[messageId]) {
				message = this._data.peer._messageIds[messageId];
			} else if (this._cIds[messageId]) {
				message = this._cIds[messageId]._data.message;
			}
			if (message && closest.dataset.moveaction == 'heat') {
				message.heatServersUp();
			}
		}
	}

	onMessageClick(e) {
		clearTimeout(this._ltt);
		// this._components.RightSidebar.show();

		const base = this.$();
		let closest = e.target.closest('.messageAction');
		// if (!closest) {
		// 	closest = event.target.closest('.panelMessageSticker');
		// }
		// console.log(closest);

		if (closest && base.contains(closest)) {
			const messageId = closest.dataset.id;

			let message = null;
			if (this._data.peer._messageIds[messageId]) {
				message = this._data.peer._messageIds[messageId];
			} else if (this._cIds[messageId]) {
				message = this._cIds[messageId]._data.message;
			}

			const action = closest.dataset.action || null;

			if (action == 'gotouser') {
				this.emit('goto', {
					// messageId: messageId,
					message: message,
					what: 'author',
					// fwd_from: this._data.peer._messageIds[messageId]._apiObject.fwd_from,
					// peer: this._data.peer,
				});
			}
			if (action == 'gotoforw') {
				this.emit('goto', {
					// messageId: messageId,
					message: message,
					// fwd_from: this._data.peer._messageIds[messageId]._apiObject.fwd_from,
					// peer: this._data.peer,
				});
			} else if (action == 'button') {
				message.doButton(closest.dataset.n)
					.then((botResults)=>{
						if (botResults && botResults._) {
							this.onButtonBotResults(botResults);
						}
					});
			} else if (action == 'jump') {
				this.jumpToMessage(messageId);
			} else { //
				if (message) {
					if (message._media) {
						if (message._media.isRoundVideo() || message._media.isGIF()) {
							if (this._cIds[message._id]) {
								this._cIds[message._id].clickHandler();
							}
						} else {
							this._app._interface._components.MediaBrowser.show({
								from: this.$('#messageMedia_'+messageId) || this.$('#messageAlbumItem_'+messageId) || this.$('#message_'+messageId),
								media: message._media,
								mediaItems: this._data.peer._media,
								peer: this._data.peer,
							});
						}
					} else if (message._doc) {
						if (!message._doc._isDownloaded) {
							if (!message._doc._isDownloading) {
								this._peerManager._download.schedule(message._doc);
								this.docStatus(message._doc);
							} else {
								this._peerManager._download.cancel(message._doc);
								this.docStatus(message._doc);
							}
						} else {
							message._doc.save();
						}
					} else if (message._sticker) {
						this._components['StickersPopup'].show({
							peerManager: this._peerManager,
							sticker: message._sticker,
						});
					}
				}

			} // else

		}
	}

	onSticker(messageSticker) {
		this._data.peer.sendSticker(messageSticker);
		// if (peerMessage) {
		// 	// console.log(peerMessage);

		// 	this.messagesLoaded();
		// }
	}

	onGIF(messageMedia) {
		this._data.peer.sendGif(messageMedia);
		// if (peerMessage) {
		// 	// console.log(peerMessage);

		// 	this.messagesLoaded();
		// }
	}

	onEmoji(emoji) {
		this._components.NewMessage.onEmoji(emoji);
	}

	onSubmitMessage(message) {
		this._data.peer.sendMessage(message);
		// if (peerMessage) {
		// 	// console.log(peerMessage);

		// 	this.messagesLoaded();
		// }
	}

	// backToDialogs() {
	// 	this.emit('toDialogs');
	// }

	// async getRidOfSearchMessages(noScroll) {
	// 	// navigating to the top regular message

	// 	let topRegularMessage = this._data.peer._messages[0];
	// 	if (topRegularMessage) {
	// 		const contentDiv = this.$('.panelMessages');

	// 		for (let mComponentId in this._cIds) {

	// 			if (this._cIds[mComponentId].isSearchedMessage) {
	// 				// remove component and its DOM element
	// 				const dom = this.$('#'+this._cIds[mComponentId]._domId);
	// 				if (dom) {
	// 					dom.parentNode.removeChild(dom);
	// 				}

	// 				delete this._cIds[mComponentId];
	// 			}
	// 		}

	// 		if (!noScroll) {
	// 			let targetElement = this.$('#message_'+topRegularMessage._id);

	// 			if (targetElement && contentDiv) {
	// 				let targetOffset = targetElement.offsetTop;
	// 				contentDiv.scrollTop = targetOffset - 200;
	// 			}
	// 		}
	// 	}

	// 	this._browsingSearchMessages = false;
	// }


	sendDataToMessage(message, method, data) {
		if (this._cIds[message._id] && this._cIds[message._id][method]) {
			this._cIds[message._id][method](data);
		}
	}

	scrollToMessage(messageId) {
		let target = this.$('#message_'+messageId);
		const contentDiv = this.$('.panelMessages');

		if (target && contentDiv) {
			let targetOffset = target.offsetTop;
			contentDiv.scrollTop = targetOffset - 200;
			this._browsingSearchMessagesStartTime = new Date();
			this._browsingSearchMessagesScrollTop = contentDiv.scrollTop;
		}
	}


	// updateInfo() {
	// 	this.$('.panelInfo').innerHTML = this._data.peer.getInfoString();
	// }

	setPeer(peer, messageId) {
		// console.time("panel");
		if (this._data.peer && this._data.peer._id == peer._id) {
			if (messageId) {
				this.jumpToMessage(messageId);
			}
			return true;
		}
		if (!peer) {
			return false;
		}

		this._overflows = {
			bottom: 0,
			top: 0,
			topIds: {},
			bottomIds: {},
		};

		if (messageId) {
			this._searchMessageId = messageId;
		} else {
			this._searchMessageId = null;
		}

		// clean up
		for (let mc of this._components.messages) {
			mc.cleanUp();
		}

		this._cIds = {};
		this._components.messages = [];
		this._data.peer = peer;
		this._data.isLoading = true;

		if (this._data.peer._messages.length) {
			this._data.peer.setBaseMessage(this._data.peer._messages[this._data.peer._messages.length - 1]);
		} else {
			this._data.peer.setBaseMessage(null);
		}

		this._theOldestMessageDate = null;

		peer.on('messages', ()=>{
				this.messagesLoaded();
			});
		peer.on('update', ()=>{
				this.messagesLoaded();
			});
		// peer.on('info', ()=>{
		// 		this.updateInfo();
		// 	});
		peer.on('updateMessage', (params)=>{
			if (this._cIds[params.id]) {
				this._cIds[params.id].updateContent();
			}
		});
		peer.on('groupUpdated', (params)=>{
			params.groupMessages.forEach((message)=>{
				if (this._cIds[message._id]) {
					this._cIds[message._id].rerender();
				}
			});
		});
		peer.on('delete', (params)=>{
			if (this._cIds[params.id]) {
				const removedHeight = this._cIds[params.id].destroy();
				// check if scroll is too low
				const sEl = this.$('#panelMessages');
				sEl.scrollTop-=removedHeight;

				// remove same is next from the message before
				if (this._cIds[params.prevMessageId]) {
					this._cIds[params.prevMessageId].setSameAsNext(false);
				}
			}
		});

		// peer.on('messageIdChange', (params)=>{
		// 		if (this._cIds[params.from]) {
		// 			this._cIds[params.from].messageIdChanged(params.from);
		// 		}
		// 		this._cIds[params.to] = this._cIds[params.from];
		// 	});

		if (this._app._config.getSetting('rightSidebarVisible')) {
			this._data.sidebarIsClosed = false;
		} else {
			this._data.sidebarIsClosed = true;
		}

		this._data.messagesLoaded = false;
		if (peer._fullInfoLoaded) {
			this._data.messagesLoaded = true;
		}

		this.render();

		if (peer._messagesWereLoaded) {
			peer.trimMessagesToRecent();
			this.messagesLoaded();
		} else {
			if (peer._messagesWereRestored) {
				// this.render();
				this.messagesLoaded();
				peer.makeReady();
			} else {
				peer.makeReady();
				// this.render();
			}
		}

		this._peerManager.setActivePeer(peer);


		this.nextTick(()=>{
			this._app._router.hashPeer(peer);
		});
		// this._components.RightSidebar.setPeer(peer);
	}

	async jumpToMessage(messageId, highText) {
		console.error('jumping to message: '+messageId);
		// let target = this.$('#message_'+messageId);
		// if (!target) {
		// alert(messageId);

		this._searchMessageId = messageId;
		this._searchMessageHigh = highText;
		await this._data.peer.searchMessage(messageId);

			// this.__ignoreSearchScroll = true;

			// let searchedMessages = await this._data.peer.loadSearchedMessages(messageId);

			// if (searchedMessages && searchedMessages.length) {

			// 	this.getRidOfSearchMessages(true); // do not change scroll;

			// 	let addedSomething = this.appendMessagesHTML(searchedMessages, true);

			// 	// target = this.$('#message_'+messageId);
			// 	// const contentDiv = this.$('.panelMessages');
			// 	this._browsingSearchMessages = true;

			// 	let target = this.$('#message_'+messageId);
			// 	const contentDiv = this.$('.panelMessages');

			// 	if (target && contentDiv) {
			// 		let targetOffset = target.offsetTop;
			// 		contentDiv.scrollTop = targetOffset - 200;
			// 		this._browsingSearchMessagesStartTime = new Date();
			// 		this._browsingSearchMessagesScrollTop = contentDiv.scrollTop;
			// 	}

			// 	clearTimeout(this.__ignoreSearchScrollTimeout);
			// 	this.__ignoreSearchScrollTimeout = setTimeout(()=>{
			// 		this.__ignoreSearchScroll = false;
			// 	}, 10000);

			// 	// if (target && contentDiv) {
			// 	// 	let targetOffset = target.offsetTop;
			// 	// 	contentDiv.scrollTop = targetOffset - 200;

			// 	// 	this._browsingSearchMessages = true;
			// 	// 	this._browsingSearchMessagesStartTime = new Date();
			// 	// 	this._browsingSearchMessagesScrollTop = contentDiv.scrollTop;
			// 	// }

			// 	// setTimeout(()=>{
			// 	// 	this.scrollToMessage(messageId);
			// 	// }, 300);

			// 	if (addedSomething) {
			// 		if (!this._hasMoreThumbsToPreview) {
			// 			this._hasMoreThumbsToPreview = true;

			// 			this.nextTick(()=>{
			// 				this.loadNextThumb();
			// 			});
			// 		}
			// 	}
			// }

		// } else {
		// 	const contentDiv = this.$('.panelMessages');

		// 	if (target && contentDiv) {
		// 		let targetOffset = target.offsetTop;
		// 		contentDiv.scrollTop = targetOffset - 200;
		// 	}
		// }

		// if (highText && this._cIds[messageId]) {
		// 	this._cIds[messageId].highText(highText);
		// }
	}

	appendMessagesHTML(messages, isSearchedMessages) {
		if (!messages) {
			messages = this._data.peer._messagesVisible;
		}

		let addedSomething = false;

		// let keepScrollYEl = false;
		let initialScroll = null;

		// const parentNode = this.$('.panelPush');
		// const beforeNode = this.$('.panelPush').querySelector('div');

		const afterNode = this.$('#messageOverflowTop');
		const beforeNode = this.$('#messageOverflowBottom');

		let recentAdded = null;

		if (afterNode && beforeNode) {
			// keepScrollYEl = this.$('#theBottom');
			initialScroll = this.$('#panelMessages').scrollHeight - this.$('#panelMessages').scrollTop;

			let oldestDateInUpdate = null;

			let toTopHTML = '';
			let toBottomHTML = '';
			const cs = [];
			const addedIds = [];

			this._data.peer.calcDates();

			// console.error(messages);

			for (let i = 0, t = messages.length; i < t; i++) {
				let message = messages[i];

				if (!this._cIds[message._id]) {
					// console.error('creating message', message._id);

					let insertToBottom = true; // false - to top, true - to bottom
					// find the DOM el to insert the node before based on date
					if (oldestDateInUpdate === null || oldestDateInUpdate > message._apiObject.date) {
						oldestDateInUpdate = message._apiObject.date;
					}

					if (message._id < this._data.peer.getBaseMessage()._id) {
						insertToBottom = false;
					}

					// if (this._theOldestMessageDate === null || this._theOldestMessageDate >= message._apiObject.date) {
					// 	insertToBottom = false;
					// }
					// if (isSearchedMessages) {
					// 	insertToBottom = false;
					// }

					if (insertToBottom) {
						// check if it's from the same user as previous one
						let prevMessage = (i > 0) ? this._data.peer._messagesVisible[i-1] : null;
						if (prevMessage && prevMessage.getAuthorId() == message.getAuthorId()) {
							// update prev message class
							let did = (''+prevMessage._id).split('.').join('_'); // possible it's date message
							this.$('#message_'+did) && this.$('#message_'+did).classList.add('sameAsNext');
						}
					}

					let nextMessage = (i < t-1) ? this._data.peer._messagesVisible[i+1] : null;
					let prevMessage = (i > 0) ? this._data.peer._messagesVisible[i-1] : null;

					// new message
					const c = this.newC(MessagesFactory.factory(message), {message: message, nextMessage: nextMessage, prevMessage: prevMessage});
					cs.push(c);

					if (isSearchedMessages) {
						c.isSearchedMessage = true;
					}

					this._cIds[message._id] = c;
					addedIds.push(message._id);

					const html = c.render({withDiv: true});
					// console.error(html);

					if (insertToBottom) {
						toBottomHTML += html;
						recentAdded = c;
					} else {
						toTopHTML += html;
					}


					// c.assignDomEvents();

					if (!isSearchedMessages) {
						this._components.messages.push(c);
					} else {
						this._components.searchmessages.push(c);
					}

					addedSomething = true;
				}
			}

			if (toBottomHTML) {
				beforeNode.insertAdjacentHTML('beforebegin', toBottomHTML);
			}
			if (toTopHTML) {
				afterNode.insertAdjacentHTML('afterend', toTopHTML);
			}

			if (addedIds.length) {
				let isNew = this.reduceOverflows(addedIds);
				if (isNew && toTopHTML && initialScroll) {
					const panelEl = this.$('#panelMessages');
					panelEl.scrollTop = panelEl.scrollHeight - initialScroll;
				}
			}

			for (let c of cs) {
				c.assignDomEvents();
			}

			if (!isSearchedMessages) {
				if (oldestDateInUpdate !== null && (oldestDateInUpdate < this._theOldestMessageDate || this._theOldestMessageDate == null)) {
					this._theOldestMessageDate = oldestDateInUpdate;
				}

				// if (keepScrollYEl) {
				// 	const panelEl = this.$('#panelMessages');
				// 	panelEl.scrollTop = keepScrollYEl.offsetTop + initialScroll;
				// }

				if (recentAdded && recentAdded.wasRecent) {
					recentAdded.wasRecent();
				}
			}


			/// now we have to get rid of messages that are not visible anymore
			// console.error('visiblemessages visible ids ', this._data.peer._messagesVisibleIds);

			let torem = [];
			for (let id in this._cIds) {
				if (this._data.peer._messagesVisibleIds.indexOf(Number(id)) == -1) {

					// console.error('visiblemessages', id);
					// console.error('visiblemessages  removing message '+id+' from dom');
					// not visible
					// this._cIds[id].cleanUp();
					torem.push(id);

					// if (id < this._data.peer.getBaseMessage()._id) {
					// 	torem.push(this._cIds[id].$());
					// } else {
					// 	this._cIds[id].$().remove();
					// }

					// delete this._cIds[id];
				}
			}

			if (torem.length) {
				// console.error('removing ', torem);
				this.removeKeepingScroll(torem);
			}
		}

		return addedSomething;
	}


	async messagesLoaded() {
		const loadingEl = this.$('.loadingMore');

		if (loadingEl) {
			loadingEl.classList.remove('active');
		}

		this._data.peer.recalcVisible();

		let addedSomething = false;

		if (this._data.isLoading) {
			this._data.isLoading = false;

			addedSomething = this.appendMessagesHTML();

			this.$('#panel').classList.add('panelLoaded');

			this.scrollToTheBottom();
		} else {
			// there's DOM already. Have to work with that
			addedSomething = this.appendMessagesHTML();
		}

		if (this._searchMessageId) {

			let target = this.$('#message_'+this._searchMessageId);
			const contentDiv = this.$('.panelMessages');

			if (target && contentDiv) {
				let targetOffset = target.offsetTop;
				contentDiv.scrollTop = targetOffset - 200;

				if (this._cIds[this._searchMessageId]) {
					this._cIds[this._searchMessageId].highText(this._searchMessageHigh);
				}

				this._searchMessageId = null;
			} else {
				this.jumpToMessage(this._searchMessageId);
			}


		} else {
			this.nextTick(async ()=>{
				/// if scroll is close the last message, move it to the bottom
				const panelEl = this.$('#panelMessages');
				if (panelEl && panelEl.scrollHeight && panelEl.offsetHeight) {
					if (panelEl.scrollTop + panelEl.offsetHeight > (panelEl.scrollHeight - 500)) {
						this.scrollToTheBottom();
					}
				}

				setTimeout(()=>{
					// mark messages as read on the cloud
					this._data.peer.markAsRead(true);
				}, 500);

			});
		}

		// console.timeEnd('panel');
		// console.log('addedSomething', addedSomething);

		if (addedSomething) {
			// if (!this._hasMoreThumbsToPreview) {
				this._hasMoreThumbsToPreview = true;

				await this.loadThumbs();

				this.nextTick(()=>{
					this.loadNextThumb();
				});
			// }
		}


	}

	showNotice(text, icon) {
		console.error(text);
		if (this.__noticeTimeout) {
			clearTimeout(this.__noticeTimeout);
		}

		this.$('.panelNotice').classList.add('active');
		this.$('#panelNoticeIcon').innerHTML = this.AppUI.getIconHTML(icon);
		this.$('#panelNoticeContent').innerHTML = text;

		this.__noticeTimeout = setTimeout(()=>{
			this.$('.panelNotice').classList.remove('active');
		}, 3000);
	}

	scrollToTheBottom() {
		const contentDiv = this.$('.panelMessages');
		if (contentDiv) {
			contentDiv.scrollTop = contentDiv.scrollHeight;
		}
	}

					// <div class="panelTopBar">
					// 	<div class="panelIcon panelBack" id="panelBack">
					// 		{{component(options.components.BackIcon)}}{{/component}}
					// 	</div>
					// 	<div class="panelAvatar">
					// 		{{self.avHTML(options.peer, 'panelTopAvatar avatarMedium')|safe}}
					// 	</div>
					// 	<div class="panelMeta">
					// 		<div class="panelTitle">{{peer.getDisplayName()}}</div>
					// 		{{js(options.infoString = options.peer.getInfoString())/}}
					// 		<div class="panelInfo {{if (options.infoString == 'online')}}panelInfoOnline{{/if}}">{{infoString}}</div>
					// 	</div>
					// 	<div class="panelActions">
					// 		<div class="panelPinned"></div>
					// 		<div class="panelIcon panelSearch" id="panelSearch">
					// 			{{component(options.components.SearchIcon)}}{{/component}}
					// 		</div>
					// 		<div class="panelIcon panelMore" id="panelMore">
					// 			{{component(options.components.MoreIcon)}}{{/component}}
					// 		</div>
					// 		<div class="panelMenu"></div>
					// 	</div>
					// 	<div class="panelSubs {{if (!options.peer.isSubscribed())}}visible{{/if}}">{{component(options.components.SubsButton)}}{{/component}}</div>
					// </div>

				// {{component(options.components.RightSidebar)}}{{/component}}
	template() {
		return `
			<div class="panel panelPos {{if (!options.peer)}}panelNothing{{/if}} {{if (options.sidebarIsClosed)}}panelNoSidebar{{/if}} {{if (options.messagesLoaded)}}panelLoaded{{/if}}" id="panel">
				{{if (!options.peer)}}
				{{#else}}
					<div class="panelLoading">
						<div class="appLoading">
							<div class="cssload-zenith onDark"></div>
						</div>
					</div>

					<div class="panelContent">
							<div class="panelNotice">
								<div><span id="panelNoticeIcon"></span><span id="panelNoticeContent"></span></div>
							</div>
						<div class="panelMessages {{if (!options.peer.canSendMessageTo())}}panelMessagesFull{{/if}}" id="panelMessages">


							<div class="loadingMore">
									<div class="cssload-zenith dark"></div>
							</div>

								<div class="panelMessagesContainer {{if (options.peer._type == 'channel' && !options.peer.canSendMessageTo())}}panelChannel{{/if}}" id="panelMessagesContainer">
									<div class="panelPush" id="panelPush">

									<svg height="0" width="0">
										<defs>
											<clipPath id="leftBubble">
												<path d="M 14,0 A 14,14 0 0 1 0,14 H 14 V 0 Z"></path>
											</clipPath>
											<clipPath id="rightBubble">
											    <path d="M 0,0 A 14,14 0 0 0 14,14 H 0 V 0 Z"></path>
											</clipPath>
										</defs>
									</svg>
									{{component(options.components.MessageMenu)}}{{/component}}

									<div id="messageOverflowTop" class="messageOverflow"></div>

									<div id="messageOverflowBottom" class="messageOverflow"></div>
									<div id="theBottom"></div>
									</div>
								</div>


						</div>

						{{if (options.peer.canSendMessageTo())}}
						<div class="panelNewMessage">
							{{component(options.components.NewMessage)}}{{/component}}
						</div>
						{{/if}}

					</div>


				{{/if}}


				{{component(options.components.StickersPopup)}}{{/component}}
			</div>
		`;
	}
};

module.exports = Panel;

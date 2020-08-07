const UI = window.classes.UI;
const AppIcon = require('../icons/AppIcon.js');

const MBPhoto = require('./MediaBrowser/MBPhoto.js');
const MBVideo = require('./MediaBrowser/MBVideo.js');

const Menu = require('./utils/Menu.js');

class MediaBrowser extends UI {
	constructor(params) {
		super(params);

		this._components['IconClose'] = this.newC(AppIcon, {icon: 'close'});
		this._components['IconDownload'] = this.newC(AppIcon, {icon: 'download'});
		this._components['IconForward'] = this.newC(AppIcon, {icon: 'forward'});
		this._components['IconMenu'] = this.newC(AppIcon, {icon: 'more'});

		this._events = [
			['click', 'mbPanel', 'onIcon'],
			['click', 'mbbArrowNext', 'onNext'],
			['click', 'mbbArrowPrev', 'onPrev'],
			['click', 'mediaOverlay', 'onClickOut'],
		];

		this._components['Menu'] = this.newC(Menu, {items: [
				['forward', 'forward', 'Forward'],
				['download', 'download', 'Download'],
			]});

		this._componentEvents = [
			['forward', 'Menu', 'doForward'],
			['download', 'Menu', 'doDownload'],
		];

		this._mbCs = {
			prev: null,
			next: null,
			current: null,
		};

		this._mediaItems = [];
		this._currentMedia = null;

		this._currentCome = false;
		this._currentComeFromEl = null;

		this.isVisible = false;

		this._documentKeyPressHandler = (e)=>{
			this.onDocumentKeypress(e);
		}

		window.addEventListener("resize", ()=>{
			this.onResize();
		});
	}

	onResize() {
		if (this._mbCs.prev) {
			this._mbCs.prev.onResize();
			this._mbCs.prev.setToThePrev();
		}
		if (this._mbCs.next) {
			this._mbCs.next.onResize();
			this._mbCs.next.setToTheNext();
		}
		if (this._mbCs.current) {
			this._mbCs.current.onResize();
			this._mbCs.current.animateGo();
		}
	}

	onSwipe(dir) {
		if (!this.isVisible) return;
		if (dir == 'left') this.next();
		if (dir == 'right') this.prev();

		return true;
	}

	onDocumentKeypress(e) {
		if (e.keyCode) {
			if (e.keyCode == 37) {
				this.onPrev();
			}
			if (e.keyCode == 39) {
				this.onNext();
			}
		}
	}

	onClickOut(e) {
		const base = this.$('#mediaOverlay');
		let thingsToMiss = ['#mbPanelIcons', '.mbbItem', '.mbPanelAbout', '.mbpIcon', '.menu'];

		for (let thingToMiss of thingsToMiss) {
			if (e.target.closest(thingToMiss)) {
				return false;
			}
		}

		if (this._mbCs.prev && e.target.closest('#mbbArrowPrev')) {
			return true;
		}
		if (this._mbCs.next && e.target.closest('#mbbArrowNext')) {
			return true;
		}


		this.hide();
	}

	doForward() {
		if (this._currentMedia) {
			this._app._interface._components.Panel.onSetForwardMedia({
				messageMedia: this._currentMedia,
			});
		}
	}

	doDownload() {
		this._currentMedia.save();
	}

	onIcon(e) {
		const base = this.$('.mbPanel');
		const closest = e.target.closest('.mbpIcon');
		if (closest && base.contains(closest) && closest.dataset.action) {
			let action = closest.dataset.action;

			if (action == 'close') {
				this.hide();
			}
			if (action == 'download') {
				this.doDownload();
			}
			if (action == 'forward') {
				this.doForward();
				// this._app._interface._components.Panel.onSetForwardMedia({
				// 	messageMedia: this._currentMedia,
				// });
			}
			if (action == 'menu') {
				this._components['Menu'].show(e);
			}
		}
	}

	show(params) {
		console.error(params);

		this.$('#mediaBrowserTop').style.display = 'block';
		this.$('.mediaBrowserOverlay').classList.add('active');

		document.addEventListener("keydown", this._documentKeyPressHandler);

		this.initMBCs(params);
		this.isVisible = true;
	}

	hide() {
		if (this._mbCs.current && this._mbCs.current.stopMedia) {
			this._mbCs.current.stopMedia();
		}

		this.$('.mediaBrowserOverlay').classList.remove('active');
		this.$('.mediaBrowserOverlay').classList.add('fading');
		this.isVisible = false;

		document.removeEventListener("keydown", this._documentKeyPressHandler);

		setTimeout(()=>{
			this.$('.mediaBrowserOverlay').classList.remove('fading');
			this.$('#mediaBrowserTop').style.display = 'none';
		}, 500);
	}

	onNext() {
		this.next();
	}

	onPrev() {
		this.prev();
	}

	newCByParams(params) {
		let media = params.media || null;

		let newC = null;
		if (media.isVideo()) {
			newC = this.newC(MBVideo, params);
		} else {
			newC = this.newC(MBPhoto, params);
		}

		return newC;
	}

	updateAuthorDOM() {
		try {
			if (this._mbCs.current) {
				let media = this._mbCs.current._media;
				this.$('.mbbCaption').innerHTML = media.getInfo('caption');

				let sentByPeerUser = media.getInfo('sentByPeerUser');
				let peerUserId = sentByPeerUser._id;

				let currentContainer = this.$('.mbpaAboutCurrent');
				if (this._lastAuthorPeerUserId === peerUserId) {
					// no need to update author
					currentContainer.querySelector('.mbpaDate').innerHTML = media.getInfo('sentByPeerUserAtDateHuman');
				} else {
					this._lastAuthorPeerUserId = peerUserId;

					let prevContainer = this.$('.mbpaAboutPrev');

					prevContainer.querySelector('.mbpaName').innerHTML = media.getInfo('sentByPeerUserName');
					prevContainer.querySelector('.mbpaDate').innerHTML = media.getInfo('sentByPeerUserAtDateHuman');

					let avatarHTML = '';
					if (sentByPeerUser.hasAvatar()) {
						avatarHTML = `
							<div class="avatar visible avatarMedium avatar_${peerUserId}">
								<div class="avatarBack" style="background-image: url('${sentByPeerUser.getAvatarBlobURLSync()}');"></div>
							</div>`;
					} else {
						avatarHTML = `
							<div class="avatar visible avatarMedium avatar_${peerUserId}">
			 					<div class="avatarBack"></div>
			 					<div class="avatarInitials avatarC${sentByPeerUser.getAvatarColor()}">${sentByPeerUser.getAvatarInitials()}</div>
							</div>`;

						sentByPeerUser.getAvatarBlobURL()
							.then((blobURL)=>{
								if (blobURL) {
									let container = this.$('.avatar_'+peerUserId);
									if (container) {
										container.querySelector('.avatarBack').style.backgroundImage = "url('"+blobURL+"')";
									}
								}
							});
					}

					prevContainer.querySelector('.mbpaAvatar').innerHTML = avatarHTML;

					prevContainer.classList.remove('mbpaAboutPrev');
					prevContainer.classList.add('mbpaAboutCurrent');

					currentContainer.classList.remove('mbpaAboutCurrent');
					currentContainer.classList.add('mbpaAboutPrev');

				}
			}
		} catch(e) {}
	}

	initPrevAndNext() {
		if (this._mbCs.prev && this._mbCs.next) {
			return;
		}

		// let setnext = false;
		// let setprev = false;
		let cind = null;
		for (let i = 0; i < this._mediaItems.length; i++) {
			if (this._mediaItems[i].id == this._currentMedia.id) {
				cind = i; break;
				// if (i > 0 && !this._mbCs.prev && !this._mediaItems[i-1].isRoundVideo() ) {
				// 	this._mbCs.prev = this.newCByParams({media: this._mediaItems[i-1]});
				// 	// setprev = true;
				// }
				// if (i < this._mediaItems.length - 1 && !this._mbCs.next && !this._mediaItems[i+1].isRoundVideo() ) {
				// 	this._mbCs.next = this.newCByParams({media: this._mediaItems[i+1]});
				// 	// setnext = true;

				// 	console.error(this._peer, this._peer._loadingMoreMedia);
				// 	if (i > this._mediaItems.length - 5 && this._peer && !this._peer._loadingMoreMedia) {
				// 		this._peer.loadMedia();
				// 	}
				// }
			}
		}

		if (!this._mbCs.prev) {
			for (let i = cind - 1; i>=0; i--) {
				if (!this._mediaItems[i].isRoundVideo() && !this._mediaItems[i].isGIF()) {
					this._mbCs.prev = this.newCByParams({media: this._mediaItems[i]});
					break;
				}
			}
		}

		if (!this._mbCs.next) {
			let i = 0;
			for (i = cind + 1; i<this._mediaItems.length; i++) {
				if (!this._mediaItems[i].isRoundVideo() && !this._mediaItems[i].isGIF()) {
					this._mbCs.next = this.newCByParams({media: this._mediaItems[i]});
					break;
				}
			}

			if (i > this._mediaItems.length - 5 && this._peer && !this._peer._loadingMoreMedia) {
				this._peer.loadMedia();
			}
		}

		// if (!setnext) {
		// 	this._mbCs.next = null;
		// }
		// if (!setprev) {
		// 	this._mbCs.prev = null;
		// }

		console.error('prevnext', this._mbCs.prev ? this._mbCs.prev._media._id : 'no', this._mbCs.current._media._id, this._mbCs.next ? this._mbCs.next._media._id : 'no')
	}

	repositionArrows() {
		if (this._mbCs.next) {
			this.$('#mbbArrowNext').classList.remove('noMore');
		} else {
			this.$('#mbbArrowNext').classList.add('noMore');
		}
		if (this._mbCs.prev) {
			this.$('#mbbArrowPrev').classList.remove('noMore');
		} else {
			this.$('#mbbArrowPrev').classList.add('noMore');
		}

		if (this._mbCs.current && this._mbCs.current._media.isVideo()) {
			let mediaCalced = this._mbCs.current._data.calc;

			let arrowsBottom = Math.floor( (mediaCalced.bcrHeight - mediaCalced.height) / 2) + 100;
			this.$('#mbbArrowPrev').style.bottom = ''+arrowsBottom+'px';
			this.$('#mbbArrowNext').style.bottom = ''+arrowsBottom+'px';
		} else {
			this.$('#mbbArrowPrev').style.bottom = '0px';
			this.$('#mbbArrowNext').style.bottom = '0px';
		}
		// this.$('#mbbArrowNext').style.right = ''+this._mbCs.current._data.calc.x+'px';
		// this.$('#mbbArrowPrev').style.left = ''+this._mbCs.current._data.calc.x + 'px';
	}

	initMBCs(params) {
		let from = params.from;
		let media = params.media;

		this._mbCs.current = this.newCByParams(params);
		this._mbCs.prev = null;
		this._mbCs.next = null;

		this._currentMedia = media;

		if (params.peer) {
			this._peer = params.peer;
		} else {
			this._peer = null;
		}

		if (params.mediaItems) {
			this._mediaItems = params.mediaItems;
		}

		this.initPrevAndNext();
		this.renderMBCs();
		this.repositionArrows();
		this.updateAuthorDOM();
	}

	next() {
		if (!this._mbCs.next) {
			return;
		}

		this._mbCs.next.animateGo();
		this._mbCs.current.setToThePrev();
		this._mbCs.current.stopMedia();

		let toRemoveDOM = this._mbCs.prev ? this.$('#'+this._mbCs.prev.domId) : null;
		let toRemoveParent = toRemoveDOM ? toRemoveDOM.parentNode : null;
		if (!toRemoveParent) {
			toRemoveParent = this.$('.mbbItemEmpty');
		}

		this._mbCs.prev = this._mbCs.current;
		this._mbCs.current = this._mbCs.next;
		this._mbCs.next = null;
		this._currentMedia = this._mbCs.current._media;

		this.initPrevAndNext();
		if (this._mbCs.next) {
			toRemoveParent.innerHTML = this._mbCs.next.render({withDiv: true});
			toRemoveParent.classList.remove('mbbItemEmpty');
			this._mbCs.next.setToTheNext();
		} else {
			toRemoveParent.classList.add('mbbItemEmpty');
			toRemoveParent.innerHTML = '';
		}

		this.repositionArrows();
		this.updateAuthorDOM();
	}

	prev() {
		if (!this._mbCs.prev) {
			return;
		}

		this._mbCs.prev.animateGo();
		this._mbCs.current.setToTheNext();
		this._mbCs.current.stopMedia();

		let toRemoveDOM = this._mbCs.next ? this.$('#'+this._mbCs.next.domId) : null;
		let toRemoveParent = toRemoveDOM ? toRemoveDOM.parentNode : null;
		if (!toRemoveParent) {
			toRemoveParent = this.$('.mbbItemEmpty');
		}

		this._mbCs.next = this._mbCs.current;
		this._mbCs.current = this._mbCs.prev;
		this._mbCs.prev = null;

		this._currentMedia = this._mbCs.current._media;

		this.initPrevAndNext();
		if (this._mbCs.prev) {
			toRemoveParent.innerHTML = this._mbCs.prev.render({withDiv: true});
			toRemoveParent.classList.remove('mbbItemEmpty');
			this._mbCs.prev.setToThePrev();
		} else {
			toRemoveParent.classList.add('mbbItemEmpty');
			toRemoveParent.innerHTML = '';
		}

		this.repositionArrows();
		this.updateAuthorDOM();
	}

	renderMBCs() {
		this.$('.mbbPrevItem').innerHTML = this._mbCs.prev ? this._mbCs.prev.render({withDiv: true}) : '';
		this.$('.mbbNextItem').innerHTML = this._mbCs.next ? this._mbCs.next.render({withDiv: true}) : '';
		this.$('.mbbCurrentItem').innerHTML = this._mbCs.current ? this._mbCs.current.render({withDiv: true}) : '';

		if (this._mbCs.prev) {
			this._mbCs.prev.setToThePrev();
		} else {
			this.$('.mbbPrevItem').classList.add('mbbItemEmpty');
		}
		if (this._mbCs.next) {
			this._mbCs.next.setToTheNext();
		} else {
			this.$('.mbbNextItem').classList.add('mbbItemEmpty');
		}
	}
};

MediaBrowser.template = `
			<div id="mediaBrowserTop" style="display: none;">
				<div class="mediaBrowserOverlay" id="mediaOverlay">
					{{component(options.components.Menu)}}{{/component}}
					<div class="mbPanel" id="mbPanel">
						<div class="mbPanelIcons" id="mbPanelIcons">
							<div class="mbpIcon mbpIconClose" data-action="close">{{component(options.components.IconClose)}}{{/component}}</div>
							<div class="mbpIcon" data-action="forward">{{component(options.components.IconForward)}}{{/component}}</div>
							<div class="mbpIcon" data-action="download">{{component(options.components.IconDownload)}}{{/component}}</div>
						</div>

						<div class="mbPanelAbout">
							<div class="mbpaAboutItem mbpaAboutCurrent">
								<div class="mbpaAvatar">
								</div>
								<div class="mbpaMeta">
									<div class="mbpaName"></div>
									<div class="mbpaDate"></div>
								</div>
							</div>
							<div class="mbpaAboutItem mbpaAboutPrev">
								<div class="mbpaAvatar">
								</div>
								<div class="mbpaMeta">
									<div class="mbpaName"></div>
									<div class="mbpaDate"></div>
								</div>
							</div>
						</div>


						<div class="mbpMenu">
							<div class="mbpIcon" data-action="menu">{{component(options.components.IconMenu)}}{{/component}}</div>
						</div>

					</div>
					<div class="mbBrowser">
						<div class="mbbArrowItem mbbArrowNext" id="mbbArrowNext"><div class="mbbArrow"></div></div>
						<div class="mbbArrowItem mbbArrowPrev" id="mbbArrowPrev"><div class="mbbArrow"></div></div>

						<div class="mbbItem mbbPrevItem">
						</div>
						<div class="mbbItem mbbCurrentItem">
						</div>
						<div class="mbbItem mbbNextItem">
						</div>

						<div class="mbbCaption"></div>
					</div>
					<div class="mbInfo">

					</div>
				</div>
			</div>
		`;

module.exports = MediaBrowser;




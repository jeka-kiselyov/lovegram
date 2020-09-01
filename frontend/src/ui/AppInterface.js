const UI = window.classes.UI;

const LeftSidebar = require('./app/LeftSidebar.js');
const Panel = require('./app/Panel.js');
const PanelTopBar = require('./app/PanelTopBar.js');
const RightSidebar = require('./app/Panel/RightSidebar.js');
const EmojiDialog = require('./app/EmojiDialog.js');
const MediaBrowser = require('./app/MediaBrowser.js');
const PeerManager = require('../state/PeerManager.js');
const MediaPlayer = require('./app/MediaPlayer.js');

const AppIcon = require('./icons/AppIcon.js');

class AppInterface extends UI {
	constructor(params) {
		super(params);

		this._events = [
			['mousedown', 'appInterface', 'onMouseDown'],
		];

		this._user = params.user;
	}

	onMouseDown(event) {
		// console.error(event);

		const base = this.$();
		let closest = event.target.closest('.rpb');

		if (closest && base.contains(closest)) {
			this.rippleOn(closest, event);
		}
	}

	async avatarUpdated(peer) {

		await peer.flushAvatar();
		let blobURL = await peer.getAvatarBlobURL();

		if (blobURL) {
			document.querySelectorAll('.avatar').forEach((el)=>{
				if (el.dataset.id == peer._id) {
					let avBack = el.querySelector('.avatarBack');
					if (avBack) {
						avBack.style.backgroundImage = "url('"+blobURL+"')";
						avBack.dataset.loaded = 1;

						let avIn = el.querySelector('.avatarInitials');
						if (avIn) {
							avIn.remove();
						}
					}
				}
			});
		}
	}

	async init() {
		// console.error('app interface init');

		await AppIcon.load(this._user);

    	this._app._peerManager = new PeerManager({user: this._user, app: this._app});
		this._app._mediaPlayer = new MediaPlayer({user: this._user, app: this._app});

		this._domId = 'app';

		this._data = {
			user: this._user,
		};

		this._components = {
			MediaBrowser: this.newC(MediaBrowser), // should be first to prioritize swipe
			LeftSidebar: this.newC(LeftSidebar),
			RightSidebar: this.newC(RightSidebar),
			Panel: this.newC(Panel),
			PanelTopBar: this.newC(PanelTopBar),
			EmojiDialog: this.newC(EmojiDialog),
		};

		this._componentEvents = [
			['sticker', 'EmojiDialog', 'onSticker'],
			['emoji', 'EmojiDialog', 'onEmoji'],

			['peer', 'LeftSidebar', 'onPeerSelected'],
			// ['message', 'LeftSidebar', 'onMessageSelected'],
			['toDialogs', 'PanelTopBar', 'showDialogs'],
			['startSearch', 'PanelTopBar', 'startSearch'],
			['goto', 'Panel', 'goTo'],
		];

		// this.userStateChanged(this._user._state); // init components
		//
		//
		this._onUserState = (newState)=>{
			this.userStateChanged(newState);
		};
		this._user.on('state', this._onUserState);

		this.swipeHandlers();
		this.render();

		this._app._peerManager.on('avatar', (params)=>{
			this.avatarUpdated(params.peer ? params.peer : params.user);
		});
	}

	onSwipe(dir) {
		// alert('swipe '+dir);
		if (this._components.MediaBrowser.onSwipe(dir)) {
			return;
		}
		for (let k in this._components) {
			if (this._components[k].onSwipe && this._components[k].onSwipe(dir)) return;
		}
	}

	// *
	//  * Enable/Disable native swipes
	//  * @param {[type]} on [description]

	// setSwipes(on) {
	// 	this._disableSwipes = !on;
	// }

	swipeHandlers() {
		this._xDown = null;
		this._yDown = null;
		this.__handleTouchStart = (e) => {
			if (e.touches[0].target.closest('.noswipe')) return;
			this._xDown = e.touches[0].clientX;
			this._yDown = e.touches[0].clientY;
		};

		this.__handleTouchMove = (e) => {
		    if (!this._xDown || !this._yDown) {
		        return;
		    }

		    let xUp = e.touches[0].clientX;
		    let yUp = e.touches[0].clientY;

		    let xDiff = this._xDown - xUp;
		    let yDiff = this._yDown - yUp;
		    if(Math.abs( xDiff )+Math.abs( yDiff )>150){ //to deal with to short swipes

			let onPopup = false;
			this.$$('.popup').forEach((el)=>{
				if (el.contains(e.target)) onPopup = true;
			});

			if (!onPopup) {
			    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {/*most significant*/
			        if ( xDiff > 0 ) {/* left swipe */
			            this.onSwipe('left');
			        } else {/* right swipe */
			            this.onSwipe('right');
			        }
			    } else {
			        if ( yDiff > 0 ) {/* up swipe */
			            this.onSwipe('up');
			        } else { /* down swipe */
			            this.onSwipe('down');
			        }
			    }
			}

		    /* reset values */
		    this._xDown  = null;
		    this._yDown = null;
		    }

		    // if (this._disableSwipes) {
			   //  e.preventDefault();
		    // }
		};

		document.addEventListener('touchstart', this.__handleTouchStart, false);
		document.addEventListener('touchmove', this.__handleTouchMove, false);
	}

	async goTo(params) {
		let peer = null;
		if (params.what == 'author') {
			peer = await params.message.getAuthorDialog();
		} else if (params.peerId && this._app._peerManager._peers[params.peerId]) {
			peer = this._app._peerManager._peers[params.peerId];
		} else {
			peer = await params.message.getFWDPeer();
		}
		if (peer) {
			this._components.Panel.setPeer(peer);
			this._components.PanelTopBar.setPeer(peer);
			this._components.RightSidebar.setPeer(peer);
		}
	}

	onSticker(apiDoc) {
		this._components.Panel.onSticker(apiDoc);
	}

	onEmoji(emoji) {
		this._components.Panel.onEmoji(emoji);
	}

	startSearch(inPeer) {
		this._components.LeftSidebar.startSearch(inPeer);
		this.showDialogs();
	}

	showDialogs() {
		// console.error('showDialogs');

		this._components['LeftSidebar'].$().classList.remove('invisible');
		this._components['Panel'].$().classList.add('invisible');
		this._components['PanelTopBar'].$().classList.add('invisible');
	}

	showPanel() {
		// console.error('showPanel');
		this._components['LeftSidebar'].$().classList.add('invisible');
		this._components['Panel'].$().classList.remove('invisible');
		this._components['PanelTopBar'].$().classList.remove('invisible');
	}

	onPeerSelected(params) {
		this._components.Panel.setPeer(params.peer, params.messageId);
		this._components.PanelTopBar.setPeer(params.peer);
		this._components.RightSidebar.setPeer(params.peer);
		this._components.LeftSidebar.setPeer(params.peer);

		this.nextTick(()=>{
			this.showPanel();
		});
	}

	// onMessageSelected(params) {
	// 	this._components.Panel.jumpToMessage(params.messageId);
	// }

	userStateChanged(newState) {
		console.error('user state', newState);
		this._components;
		if (!this._user.signedIn()) {
			this._components.LeftSidebar = undefined; // ? delete
			this._components.Panel = undefined; // ? delete
			this._components.PanelTopBar = undefined; // ? delete
			this._components.EmojiDialog = undefined; // ? delete

			// this._app._peerManager.stopNextStateLoop();
			this._app._peerManager._media.clearEventListeners();
			this._app._peerManager._stickers.clearEventListeners();
			this._app._peerManager.clearEventListeners();
			this._app._peerManager = undefined;
		} else {
	    	this._app._peerManager = new PeerManager({user: this._user, app: this._app});
			this._components.LeftSidebar = this.newC(LeftSidebar);
			this._components.Panel = this.newC(Panel);
			this._components.RightSidebar = this.newC(RightSidebar);
			this._components.PanelTopBar = this.newC(Panel);
			this._components.EmojiDialog = this.newC(EmojiDialog);
		}

		this.render();
	}

	afterRender() {
		if (this._components['Panel'] && this._components['Panel'].$()) {
			this._components['Panel'].$().classList.add('invisible');
		}
	}

	template() {
		return `
			<div id="appInterface">
			{{if(options.user.signedIn())}}
				{{component(options.components.LeftSidebar)}}{{/component}}
				{{component(options.components.PanelTopBar)}}{{/component}}
				{{component(options.components.Panel)}}{{/component}}
				{{component(options.components.RightSidebar)}}{{/component}}
				{{component(options.components.EmojiDialog)}}{{/component}}
				{{component(options.components.MediaBrowser)}}{{/component}}
			{{#else}}
			{{/if}}
			</div>
		`;

				//
	}
};

module.exports = AppInterface;

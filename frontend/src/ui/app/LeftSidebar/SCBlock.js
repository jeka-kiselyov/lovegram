const UI = window.classes.UI;

class SCBlock extends UI {
	constructor(params) {
		super(params);

		// this._domId = 'scblock_'+params.peer._id;

		this._components = {
		};

		this._data.folder = params.folder;
		this._data.c = 'scblock_'+params.peer._id;
		this._data.peer = params.peer;
		this._noDiv = true; // do not wrap in extra div

		// this.doAvatar(this._data.peer, '.avatar');
		// if (this._data.peer.hasAvatar() === null) {
		// 	this._data.peer.getAvatarBlobURL()
		// 		.then((blobURL)=>{
		// 			if (blobURL) {
		// 				this.$('.avatarBack').style.backgroundImage = "url('"+blobURL+"')";
		// 			}
		// 			this.$('.avatar').classList.add('visible');
		// 		});
		// } else {
		// 	this.nextTick(()=>{
		// 		this.$('.avatar').classList.add('visible');
		// 	});
		// }
	}

	rerender() {
		if (this._clearTypingTimeout) {
			clearTimeout(this._clearTypingTimeout);
		}
		this.$('.scBlockBody').innerHTML = this._data.peer.getDisplayMessage(true);

		const readBadge = this._data.peer.hasReadBadge();
		let tPre = '';
		if (readBadge === true) {
			tPre = '<div class="scBlockRead"><div class="i2checks"></div></div>';
		} else if (readBadge === false) {
			tPre = '<div class="scBlockRead"><div class="i1check"></div></div>';
		}

		this.$('.scBlockTime').innerHTML = tPre + this._data.peer.getDisplayTime();

		const badge = this.$('.scBlockBadge');
		if (badge) {
			const c = this._data.peer._unreadCount;
			if (c) {
				badge.innerHTML = c;
				badge.classList.add('scBlockBadgeVisible');
				badge.classList.remove('scBlockPinned');

				if (this._data.peer.isMuted()) {
					badge.classList.add('scBlockMuted');
				} else {
					badge.classList.remove('scBlockMuted');
				}
			} else {
				badge.innerHTML = '';
				let isPinned = false;
				if ((this._data.folder && this._data.folder.isPinned(this._data.peer)) || (!this._data.folder && this._data.peer.isPinned())) {
					badge.classList.add('scBlockPinned');
					badge.classList.add('scBlockBadgeVisible');
				} else {
					badge.classList.remove('scBlockBadgeVisible');
				}
			}
		}

		if (this._data.peer._peerUser) {
			const oBadge = this.$('.onlineBadge');
			if (oBadge) {
				if (this._data.peer._peerUser._isOnline) {
					oBadge.classList.add('online');
				} else {
					oBadge.classList.remove('online');
				}
			}

			if (this._data.peer._peerUser.isTyping()) {
				this.$('.scBlockBody').innerHTML = 'typing...';
				this._clearTypingTimeout = setTimeout(()=>{
					this.$('.scBlockBody').innerHTML = this._data.peer.getDisplayMessage(true);
				}, 10000);
			}
		}

		this.$('.scBlockTitle').innerHTML = this._data.peer.getDisplayNameWB();

		this.$().dataset.date = this._data.peer._mostRecentMessageDate;
	}
};

SCBlock.template = `<div class="scBlock {{c}}" id="{{domId}}" title="{{peer._id}}" data-id="{{peer._id}}" data-date="{{peer._mostRecentMessageDate}}">

				{{self.avHTML(options.peer)|safe}}

				<div class="scBlockMeta">
					<div class="scBlockTime"><div class="scBlockRead">{{if (options.peer.hasReadBadge() === true)}}<div class="i2checks"></div>{{#else}}{{if (options.peer.hasReadBadge() === false)}}<div class="i1check"></div>{{/if}}{{/if}}</div>{{peer.getDisplayTime()}}</div>
					<div class="scBlockBadge {{if (options.peer.isMuted())}}scBlockMuted{{/if}} {{if ((options.folder && options.folder.isPinned(options.peer)) || (!options.folder && options.peer.isPinned()))  }} {{if (!options.peer.getUnreadCount())}}scBlockPinned{{/if}} scBlockBadgeVisible {{#else}} {{if (options.peer.getUnreadCount())}}scBlockBadgeVisible{{/if}} {{/if}}">{{if (options.peer.getUnreadCount())}}{{peer.getUnreadCount()}}{{/if}}</div>
				</div>

				<div class="scBlockMessage">
					<div class="scBlockTitle">{{peer.getDisplayNameWB()|safe}}</div>
					<div class="scBlockBody">{{peer.getDisplayMessage(true)|safe}}</div>
				</div>
			</div>
		`;

module.exports = SCBlock;

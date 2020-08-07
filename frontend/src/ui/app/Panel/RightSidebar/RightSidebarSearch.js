
const RightSidebarAbstract = require('./RightSidebarAbstract.js');
const SearchBlock = require('../../LeftSidebar/SearchBlock.js');

class RightSidebarSearch extends RightSidebarAbstract {
	constructor(params) {
		super(params);

		this._components = {
			messages: []
		};
		this._data = {
			messagesCount: 0,
		};
		this._events = [
			['click', 'rightSidebarSearch', 'onMessageClick'],
		];

		this._lastDataWithResults = null;
		this._lastSearch = null;

		this._peerOnLoadMessagesInitialized = false;
		this._peerHasNewMessages = () => {
			if (this._peerOnLoadMessagesInitialized) {
				return;
			}
			if (this._data.peer._messages) {
				this._components.messages = [];
				let i = 0;
				for (let message of this._data.peer._messages) {
					if (i++ < 20) {
						this._components.messages.push(this.newC(SearchBlock, {peer: this._data.peer, peerMessage: message}));
					}
				}
				this._data.messagesCount = this._components.messages.length;
			}
			this._peerOnLoadMessagesInitialized = true;
		};
	}

	reinitScrollBar(forceReInit) {
		let container = this.$('.sidebarSearchScroll');
		let topContainer = this.$('#rightSidebarSearch');

		if (container && topContainer) {
			container.style.height = '' +(topContainer.offsetHeight - container.offsetTop) + 'px';
			this.initScrollBarOn(container, forceReInit);
		}
	}

	setPeer(peer) {
		if (this._data.peer) {
			this._data.peer.removeEventListener('messages', this._peerHasNewMessages);
		}

		this._data.peer = peer;
		this._components.messages = [];
		this._peerOnLoadMessagesInitialized = false;

		if (peer._messages) {
			let i = 0;
			for (let message of peer._messages) {
				if (i++ < 20) {
					this._components.messages.push(this.newC(SearchBlock, {peer: peer, peerMessage: message}));
				}
			}
			this._data.messagesCount = this._components.messages.length;
			if (peer._messages.length > 1) {
				this._peerOnLoadMessagesInitialized = true;
			}
		}

		peer.on('messages', this._peerHasNewMessages);

		this._lastDataWithResults = null;
		this.render();
	}

	afterRender() {
		this.reinitScrollBar(true);
	}

	onMessageClick(e) {
		const base = this.$();
		const closest = e.target.closest('.scBlock');

		if (closest && base.contains(closest)) {
			const peerId = closest.dataset.id;
			const messageId = closest.dataset.messageId;
			const peer = this._peerManager.peerById(peerId);

			app._interface._components.Panel.jumpToMessage(messageId);
		}
	}

	async doSearch(q) {
		if (q === undefined) {
			return;
		}

		this._peerOnLoadMessagesInitialized = true;

		this._lastSearch = q;
		let data = await this._peerManager.search(q, this._data.peer);
		this._components.messages = [];

		let hasSomething = false;

		try {
			if (!data || !data.messages.length) {
				data = this._lastDataWithResults;
			}
		} catch(e) {
		}

		if (data) {
			if (data.messages) {
				for (let item of data.messages) {
					this._components.messages.push(this.newC(SearchBlock, {peer: item.peer, peerMessage: item.peerMessage}));
					hasSomething = true;
				}
			}
		}

		if (hasSomething) {
			this._lastDataWithResults = data;
		}

		this._data.messagesCount = this._components.messages.length;

		this.render();
	}

	template() {
		return `
			<div class="rightSidebarSearch rightSidebarBlock {{if (options.active)}} active{{/if}}" id="rightSidebarSearch">

				{{if (options.components.messages.length)}}
				<div class="sidebarSearchBlock">
					<h3>
						{{if (!options.messagesCount)}}
							Nothing is found
						{{#else}}
						{{messagesCount}} message{{if (options.messagesCount > 1)}}s{{/if}} found
						{{/if}}
					</h3>

					<div class="sidebarSearchScroll">
					{{each(options.components.messages)}}
						{{component(@this)}}{{/component}}
					{{/each}}
					</div>
				</div>
				{{/if}}

			</div>
		`;
	}
};

module.exports = RightSidebarSearch;
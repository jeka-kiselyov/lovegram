const RightSidebarInfoAbstract = require('./RightSidebarInfoAbstract.js');

class RightSidebarWebpages extends RightSidebarInfoAbstract {
	constructor(params) {
		super(params);

		this._itemsName = 'Webpages';
		this._events = [
			['scroll', 'rs'+this._itemsName+'Items', 'onScroll'],
		];
		// this._peerManager = this._app._peerManager;

		// this._events = [
		// 	['scroll', 'rsWebpagesItems', 'onScroll'],
		// ];

		// this._data = {
		// 	active: params.active || false,
		// 	isLoading: true,
		// 	items: [],
		// };

		// this._hasMoreItems = true;
	}

	// async loadMoreItems(initialization) {
	// 	if (this._loadingMoreItems && !this._data.isLoading) {
	// 		return true;
	// 	}

	// 	this._loadingMoreItems = true;
	// 	let items = await this._data.peer.loadWebpages(initialization);

	// 	if (items.length > 0) {
	// 		this._data.items = items;
	// 	}

	// 	if (this._data.isLoading) {
	// 		this._data.isLoading = false;
	// 		this.render();
	// 	}

	// 	this.nextTick(()=>{
	// 		this.appendMissingDOM();
	// 	});

	// 	this._loadingMoreItems = false;
	// }

	// onScroll(e) {
	// 	let y = e.target.scrollTop;
	// 	let scrollHeight = e.target.scrollHeight;
	// 	let clientHeight = e.target.clientHeight;

	// 	if (y > scrollHeight - clientHeight - 50) {
	// 		this.loadMoreItems();
	// 	}
	// }

	// reinitScrollBar(forceReInit) {
	// 	if (this._data.isLoading) {
	// 		return false;
	// 	}

	// 	let container = this.$('#rsWebpagesItems');
	// 	if (container) {
	// 		let setHeight = parseInt( container.closest('#rsInfoBlocks').style.height , 10);

	// 		if (setHeight < 100) {
	// 			setHeight = 100;
	// 		}

	// 		container.style.height = '' + setHeight + 'px';
	// 		this.initScrollBarOn(container, forceReInit);
	// 	}
	// }

	// afterRender() {
	// 	this.nextTick(()=>{
	// 		this.appendMissingDOM();
	// 		this.reinitScrollBar(true);
	// 	});
	// }

	// async appendMissingDOM() {
	// 	if (this._data.isLoading) {
	// 		return false;
	// 	}

	// 	let addedSomething = false;

	// 	let itemsToAdd = [];

	// 	for (let item of this._data.items) {
	// 		let inDOM = this.$('.rsWebpage_'+item._id);
	// 		if (!inDOM) {
	// 			itemsToAdd.push(item);
	// 		}
	// 	}

	// 	// await MessageMedia.loadPreviewsFromCache(mediaItemsToAdd);
	// 	let appendBefore = this.$('.rsDocsMore');

	// 	for (let itemToAdd of itemsToAdd) {
	// 		if (appendBefore) {
	// 			appendBefore.insertAdjacentHTML('beforebegin', this.getItemHTML(itemToAdd));
	// 		}
	// 		// console.error('added', appendBefore, this.getItemHTML(itemToAdd));
	// 		addedSomething = true;
	// 	}

	// 	console.error(itemsToAdd);

	// 	if (!addedSomething || itemsToAdd.length < 30) {
	// 		this._hasMoreItems = false;

	// 		if (appendBefore) {
	// 			appendBefore.classList.add('hidden');
	// 		}
	// 	}

	// 	this.nextTick(()=>{
	// 		this.reinitScrollBar();
	// 	});
	// }

	getItemHTML(docItem) {
		if (!docItem.getInfo('url')) {
			return '';
		}

		let im = '';
		let prb64 = docItem.getInfo('previewBase64');
		if (prb64) {
			im = `<span class="rswPreview" style="background-image: url('${docItem.getInfo('previewBase64')}');"></span>`;
		} else {
			let i = docItem.getInfo('siteName').substr(0,1);
			let c = ((''+i).substr(-1).charCodeAt(0) % 8) + 1;
			im = `<div  class="rswPreview avatarC${c}">${i}</div>`;
		}

		let html = `<a href="${docItem.getInfo('url')}" target="_blank" class="rsWebpage rsWebpage_${docItem._id}" data-id="${docItem._id}">
						${im}
						<span class="rswTitle">${this.escapeHTML(docItem.getInfo('title'))}</span>
						<span class="rswDesc">${this.escapeHTML(docItem.getInfo('description'))}</span>
						<span class="rswUrl">${this.escapeHTML(docItem.getInfo('displayUrl'))}</span>
			</a>
			`;
		return html;
	}

	// setPeer(peer) {
	// 	this._data.peer = peer;
	// 	this._data.items = [];
	// 	this._data.isLoading = true;

	// 	this.loadMoreItems(true);
	// }

	template() {
		return `<div id="{{domId}}">
					{{if (options.isLoading)}}
					<div class="appLoading">
						<div class="cssload-zenith dark"></div>
					</div>
					{{#else}}
						<div class="rsDocsItems" id="rsWebpagesItems">
							<div class="rsDocsMore">
								<div class="cssload-zenith dark"></div>
							</div>
						</div>
					{{/if}}
				</div>
				`;
	}
};

module.exports = RightSidebarWebpages;
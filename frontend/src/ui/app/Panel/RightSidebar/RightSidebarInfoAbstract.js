const AppUI = require('../../../../utils/AppUI.js');

class RightSidebarInfoAbstract extends AppUI {
	constructor(params) {
		super(params);

		this._peerManager = this._app._peerManager;

		this._itemsName = 'Webpages';
		this._events = [
			['scroll', 'rs'+this._itemsName+'Items', 'onScroll'],
		];

		this._data = {
			active: params.active || false,
			isLoading: true,
			items: [],
		};

		this._inDomIds = {};
		this._hasMoreItems = true;
	}

	async loadMoreItems(initialization) {
		if (this._loadingMoreItems && !this._data.isLoading) {
			return true;
		}

		this._loadingMoreItems = true;
		let c = this._data.items.length;
		let items = await this._data.peer['load'+this._itemsName](initialization);
		// console.error('loading '+this._itemsName+' count: '+items.length, initialization, this._data.peer._id);

		if (items.length > 0) {
			this._data.items = items;
		}

		if (this._data.isLoading) {
			this._data.isLoading = false;
			this._inDomIds = {};
			this.render();
		}

		this._loadingMoreItems = false;
		this._lastCount = (this._data.items.length - c);

		await new Promise((res)=>{
			this.nextTick(()=>{
				this.appendMissingDOM();
				res();
			});
		});
	}

	onScroll(e) {
		let y = e.target.scrollTop;
		let scrollHeight = e.target.scrollHeight;
		let clientHeight = e.target.clientHeight;

		if (y > scrollHeight - clientHeight - 50) {
			this.loadMoreItems();
		}
	}

	reinitScrollBar(forceReInit) {
		if (this._data.isLoading) {
			return false;
		}

		let container = this.$('#rs'+this._itemsName+'Items');
		if (container) {
			let setHeight = parseInt( container.closest('#rsInfoBlocks').style.height , 10);

			if (setHeight < 100) {
				setHeight = 100;
			}

			container.style.height = '' + setHeight + 'px';
			this.initScrollBarOn(container, forceReInit);
		}
	}

	afterRender() {
		this.nextTick(()=>{
			this.appendMissingDOM();
			this.reinitScrollBar(true);
		});
	}

	async appendMissingDOM() {
		if (this._data.isLoading) {
			return false;
		}

		// let addedSomething = false;

		// let itemsToAdd = [];

		// for (let item of this._data.items) {
		// 	let inDOM = this.$('.rsWebpage_'+item._id);
		// 	if (!inDOM) {
		// 		itemsToAdd.push(item);
		// 	}
		// }

		// await MessageMedia.loadPreviewsFromCache(mediaItemsToAdd);
		let appendBefore = this.$('.rsDocsMore');
		if (!appendBefore) {
			return;
		}

		let html = '';
		const addedItems = [];
		for (let item of this._data.items) {
			if (!this._inDomIds[item._id]) {
				html+=this.getItemHTML(item);
				this._inDomIds[item._id] = true;
				addedItems.push(item);
				// appendBefore.insertAdjacentHTML('beforebegin', this.getItemHTML(item));
				// addedSomething = true;
			}
			// if (appendBefore) {
			// 	appendBefore.insertAdjacentHTML('beforebegin', this.getItemHTML(itemToAdd));
			// }
			// // console.error('added', appendBefore, this.getItemHTML(itemToAdd));
			// addedSomething = true;
		}


		if (html) {
			appendBefore.insertAdjacentHTML('beforebegin', html);
			appendBefore.classList.remove('hidden');
		} else {
			this._hasMoreItems = false;
			appendBefore.classList.add('hidden');
		}

		if (this.itemsAddedCallback && addedItems.length) {
			this.itemsAddedCallback(addedItems);
		}

		this.nextTick(()=>{
			this.reinitScrollBar();
		});
	}

	// getItemHTML(docItem) {
	// 	let html = `<a href="${docItem.getInfo('url')}" target="_blank" class="rsWebpage rsWebpage_${docItem._id}" data-id="${docItem._id}">
	// 					<span class="rswPreview" style="background-image: url('${docItem.getInfo('previewBase64')}');"></span>
	// 					<span class="rswTitle">${docItem.getInfo('title')}</span>
	// 					<span class="rswDesc">${docItem.getInfo('description')}</span>
	// 					<span class="rswUrl">${docItem.getInfo('displayUrl')}</span>
	// 		</a>
	// 		`;
	// 	return html;
	// }

	isHeightFilled() {
		try {
			// console.error('loading', this.$('.rsDocsMore').offsetTop);
			// console.error('loading', this.$('#rs'+this._itemsName+'Items').offsetHeight);
			if (this.$('.rsDocsMore').offsetTop > this.$('#rs'+this._itemsName+'Items').offsetHeight) {
				return true;
			}
		} catch(e) { console.error(e); }
		return false;
	}

	async setVisible() {
		if (this._setVisible) {
			return;
		}

		this._setVisible = true;
		await this.loadMoreItems(true);
		// if not enough height filled, try to load some more
		//
		// setTimeout(async()=>{

		this.$('.rsDocsMore').classList.remove('hidden');
		let c = 0;
		while(this._lastCount && !this.isHeightFilled() && c < 5) {
			await this.loadMoreItems();
			c++;
		}

		if (!this.isHeightFilled()) {
			this.$('.rsDocsMore').classList.add('hidden');
		}

			// if (this._data.items.length < 150 && !this.isHeightFilled()) {
			// 	alert(this.isHeightFilled())
			// 	alert(this._data.items.length)
			// 	// console.error(this._itemsName, 'was not filled');
			// 	await this.loadMoreItems();
			// 	// console.error(this._itemsName, 'was not filled, now: ', this.isHeightFilled());
			// 	if (!this.isHeightFilled()) {
			// 		this.$('.rsDocsMore').classList.add('hidden');
			// 	}
			// }
		// }, 2500);
	}

	async setPeer(peer) {
		this._data.peer = peer;
		this._data.items = [];
		this._data.isLoading = true;
		this._processedPreviews = {};

		this._setVisible = false;
	}

	// template() {
	// 	return `<div id="{{domId}}">
	// 				{{if (options.isLoading)}}
	// 				<div class="appLoading">
	// 					<div class="cssload-zenith dark"></div>
	// 				</div>
	// 				{{#else}}
	// 					<div class="rsDocsItems" id="rsWebpagesItems">
	// 						<div class="rsDocsMore">
	// 							<div class="cssload-zenith dark"></div>
	// 						</div>
	// 					</div>
	// 				{{/if}}
	// 			</div>
	// 			`;
	// }
};

RightSidebarInfoAbstract.AppUI = AppUI;
module.exports = RightSidebarInfoAbstract;
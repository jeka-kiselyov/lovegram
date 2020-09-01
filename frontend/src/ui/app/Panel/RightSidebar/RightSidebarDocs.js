// const UI = window.classes.UI;
// const MessageMedia = require('../../../../state/MessageMedia.js');
const RightSidebarInfoAbstract = require('./RightSidebarInfoAbstract.js');

class RightSidebarDocs extends RightSidebarInfoAbstract {
	constructor(params) {
		super(params);

		this._itemsName = 'Docs';
		this._events = [
			['scroll', 'rs'+this._itemsName+'Items', 'onScroll'],
			['click', 'rsDocsItems', 'onClick'],
			['mousemove', 'rsDocsItems', 'onMove'],
		];

		// this._peerManager = this._app._peerManager;

		// this._events = [
		// 	['scroll', 'rsDocsItems', 'onScroll'],
		// 	['click', 'rsDocsItems', 'onClick'],
		// ];

		// this._data = {
		// 	active: params.active || false,
		// 	isLoading: true,
		// 	items: [],
		// };

		// this._hasMoreItems = true;

		let docStatus = (doc) => {
			this.docStatus(doc);
		};

		this._peerManager._download.on('downloaded', docStatus);
		this._peerManager._download.on('progress', docStatus);
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
						docContainer.querySelector('.rsDocMeta').innerHTML = ''+docItem.getInfo('sizeHuman')+" &bull; "+docItem.getInfo('dateHuman');

						progressContainer.classList.remove('active');
					}

				} else {
					// ready to be saved
					progressContainer.className = 'progress';
					progressContainer.classList.add('progress100');

					docContainer.querySelector('.rsDocMeta').innerHTML = ''+docItem.getInfo('sizeHuman')+" &bull; "+docItem.getInfo('dateHuman');
					docContainer.querySelector('.rsDocIcon').classList.remove('loading');
					docContainer.querySelector('.rsDocIcon').classList.add('ready');
				}
			}
		}
	}

	onMove(e) {
		const closest = e.target.closest('.rsDoc');
		if (closest && closest.dataset.id) {
			for (let item of this._data.items) {
				if (item.id == closest.dataset.id) {
					item.heatServersUp();
				}
			}
		}
	}

	onClick(e) {
		const base = this.$('#rsDocsItems');
		const closest = e.target.closest('.rsDoc');

		if (closest && base.contains(closest)) {
			let id = closest.dataset.id;
			for (let item of this._data.items) {
				if (item.id == id) {
					if (!item._isDownloaded) {
						if (!item._isDownloading) {
							this._peerManager._download.schedule(item);
							this.docStatus(item);
						} else {
							this._peerManager._download.cancel(item);
							this.docStatus(item);
						}
					} else {
						item.save();
					}
				}
			}
		}
	}

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

	// 	let container = this.$('#rsDocsItems');
	// 	this.initScrollBarOn(container, forceReInit);
	// }

	// afterRender() {
	// 	this.nextTick(()=>{
	// 		// alert('afterRender2');
	// 		this.appendMissingDOM();
	// 		this.reinitScrollBar(true);
	// 	});
	// }


	// setPeer(peer) {
	// 	// alert('setPeerDocs');

	// 	this._data.peer = peer;
	// 	this._data.items = [];
	// 	this._data.isLoading = true;

	// 	this.loadMoreItems(true);
	// }

	// async appendMissingDOM() {
	// 	if (this._data.isLoading) {
	// 		return false;
	// 	}

	// 	let addedSomething = false;

	// 	let itemsToAdd = [];

	// 	for (let item of this._data.items) {
	// 		let inDOM = this.$('.rsDoc_'+item.id);
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
		let html = `<div class="rsDoc rsDoc_${docItem.id}" data-id="${docItem.id}">
				<div class="rsDocIcon avatarC${docItem.getInfo('color')}"><div class="progress"><div></div></div>${docItem.getInfo('ext')}</div>
				<div class="rsDocName">${docItem.getInfo('filename')}</div>
				<div class="rsDocMeta">${docItem.getInfo('sizeHuman')} &bull; ${docItem.getInfo('dateHuman')}</div>
			</div>
			`;
		return html;
	}

	// async loadMoreItems(initialization) {
	// 	if (this._loadingMoreItems && !this._data.isLoading) {
	// 		return true;
	// 	}

	// 	this._loadingMoreItems = true;
	// 	let items = await this._data.peer.loadDocs(initialization);


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

	template() {
		return `<div id="{{domId}}">
					{{if (options.isLoading)}}
					<div class="appLoading">
						<div class="cssload-zenith dark"></div>
					</div>
					{{#else}}
						<div class="rsDocsItems" id="rsDocsItems">
							<div class="rsDocsMore">
								<div class="cssload-zenith dark"></div>
							</div>
						</div>
					{{/if}}
				</div>
				`;
	}
};
							// {{each(options.mediaItems)}}
							// <div class="rsMedia" id="rsMedia_{{@this.id}}" style="background-image: url('{{@this.getPreviewBase64()}}');">
							// 	<div class="rsMediaPreview" id="rsMediaPreview_{{@this.id}}"></div>
							// </div>
							// {{/each}}

module.exports = RightSidebarDocs;
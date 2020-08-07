// const UI = window.classes.UI;
const MessageMedia = require('../../../../state/MessageMedia.js');
// const AppUI = require('../../../../utils/AppUI.js');

const RightSidebarInfoAbstract = require('./RightSidebarInfoAbstract.js');

class RightSidebarMedia extends RightSidebarInfoAbstract {
	constructor(params) {
		super(params);

		// this._peerManager = this._app._peerManager;

		this._itemsName = 'Media';
		this._events = [
			['scroll', 'rsMediaItems', 'onScroll'],
			['click', 'rsMediaItems', 'onClick'],
		];

		// this._data = {
		// 	active: params.active || false,
		// 	isLoading: true,
		// 	mediaItems: [],
		// };

		this._hasMoreThumbsToPreview = false;
		// this._hasMoreMediaItems = true;
	}

	onClick(e) {
		const base = this.$('#rsMediaItems');
		const closest = e.target.closest('.rsMedia');

		if (closest && base.contains(closest)) {
			let id = closest.dataset.id;
			for (let item of this._data.items) {
				if (item.id == id) {

					this._app._interface._components.MediaBrowser.show({
						from: this.$('#rsMedia_'+id),
						media: item,
						mediaItems: this._data.peer._media,
						peer: this._data.peer,
					});

				}
			}
		}
	}

	// onScroll(e) {
	// 	let y = e.target.scrollTop;
	// 	let scrollHeight = e.target.scrollHeight;
	// 	let clientHeight = e.target.clientHeight;

	// 	if (y > scrollHeight - clientHeight - 50) {
	// 		this.loadMoreMedia();
	// 	}
	// }

	// reinitScrollBar(forceReInit) {
	// 	if (this._data.isLoading) {
	// 		return false;
	// 	}

	// 	let container = this.$('#rsMediaItems');
	// 	if (container) {
	// 		let setHeight = parseInt( container.closest('#rsInfoBlocks').style.height , 10);

	// 		if (setHeight < 100) {
	// 			setHeight = 100;
	// 		}

	// 		container.style.height = '' + setHeight + 'px';
	// 		this.initScrollBarOn(container, forceReInit);
	// 	}
	// }

	// async afterRender() {
	// 	this.nextTick(()=>{
	// 		this.appendMissingDOM();
	// 		this.reinitScrollBar(true);
	// 	});
	// }

	async loadNextThumb() {
		clearTimeout(this._moreThumbsTimeout);

		if (!this._hasMoreThumbsToPreview) {
			return false;
		}

		// console.error('loadNextThumb')

		let loadedSomething = false;
		let nextTimeout = 500;

		for (let mItem of this._data.items) {
			if (!this._processedPreviews[mItem.id]) {
				// console.error(mItem.id);
				if (mItem.cached) {
					// console.error('cached');
					nextTimeout = 50;
				}
				// if (!mItem.cached) {
				this._processedPreviews[mItem.id] = true;
				let blobURL = await mItem.loadPreview();
				// console.error('right sidebar load ', mItem);
				let mediaDOM = this.$('#rsMediaPreview_'+mItem.id);
				if (blobURL && mediaDOM) {
					mediaDOM.style.backgroundImage = "url('"+blobURL+"')";
				}
				loadedSomething = true;
				break;
				// } else {

				// }
			}
		}

		if (!loadedSomething) {
			this._hasMoreThumbsToPreview = false;
		} else {
			this._moreThumbsTimeout = setTimeout(()=>{
				// console.error('next');
				this.loadNextThumb();
			}, nextTimeout);
		}

	}

	/**
	 * fired when more items loaded
	 * @return {[type]} [description]
	 */
	async itemsAddedCallback(addedItems) {
		await MessageMedia.loadPreviewsFromCache(addedItems.filter(item => !item.blobURL));
		this._hasMoreThumbsToPreview = true;
		this.loadNextThumb();
	}

	// async setPeer(peer) {
	// 	this._data.peer = peer;
	// 	this._data.items = [];
	// 	this._data.isLoading = true;

	// 	this._processedPreviews = {};


	// 	// await this.loadMoreItems(true);
	// 	// // if not enough height filled, try to load some more
	// 	// if (!this.isHeightFilled()) {
	// 	// 	console.error(this._itemsName, 'was not filled');
	// 	// 	// await this.loadMoreItems();
	// 	// 	console.error(this._itemsName, 'was not filled, now: ', this.isHeightFilled());
	// 	// } else {
	// 	// 	console.error(this._itemsName, 'is filled');

	// 	// }

	// 	// const loadingDOM = this.$('.rsMediaMore');
	// 	// if (loadingDOM) {
	// 	// 	loadingDOM.classList.remove('hidden');
	// 	// }

	// 	// setTimeout(()=>{
	// 	// 	if (this._data.peer && this._data.peer._id == peer._id) {
	// 	// 		this.loadMoreMedia(true);
	// 	// 	}
	// 	// }, 1000);
	// }

	// async appendMissingDOM() {
	// 	let addedSomething = false;

	// 	const loadingDOM = this.$('.rsMediaMore');
	// 	if (!loadingDOM) {
	// 		return true;
	// 	}

	// 	let mediaItemsToAdd = [];

	// 	for (let mediaItem of this._data.mediaItems) {
	// 		if (!mediaItem.isRoundVideo()) {
	// 			let inDOM = this.$('#rsMedia_'+mediaItem.id);
	// 			if (!inDOM) {
	// 				mediaItemsToAdd.push(mediaItem);
	// 			}
	// 		}
	// 	}

	// 	await MessageMedia.loadPreviewsFromCache(mediaItemsToAdd);
	// 	let appendBefore = this.$('.rsMediaMore');
	// 	for (let mediaItemToAdd of mediaItemsToAdd) {
	// 		let inDOM = this.$('#rsMedia_'+mediaItemToAdd.id);
	// 		if (!inDOM && appendBefore) {
	// 			appendBefore.insertAdjacentHTML('beforebegin', this.getMediaItemHTML(mediaItemToAdd));
	// 			addedSomething = true;
	// 		}
	// 	}

	// 	if (addedSomething) {
	// 		for (let mediaItemToAdd of mediaItemsToAdd) {
	// 			if (mediaItemToAdd.blobURL) {
	// 				this._processedPreviews[mediaItemToAdd.id] = true;
	// 			}
	// 		}

	// 		// if (!this._hasMoreThumbsToPreview) {
	// 		// 	this._hasMoreThumbsToPreview = true;
	// 		// 	this.loadNextThumb();
	// 		// }
	// 	}

	// 	this._hasMoreThumbsToPreview = true;
	// 	this.loadNextThumb();

	// 	if (this._data.mediaItems.length < 20) {
	// 		this._hasMoreMediaItems = false;
	// 		loadingDOM.classList.add('hidden');
	// 	} else {
	// 		loadingDOM.classList.remove('hidden');
	// 	}

	// 	this.nextTick(()=>{
	// 		this.reinitScrollBar();
	// 	});
	// }

	getItemHTML(mediaItem) {
		if (mediaItem.isRoundVideo() || mediaItem.isGIF()) {
			return '';
		}

		let durationHTML = '';
		if (mediaItem.isVideo()) {
			durationHTML = "<div class='duration'>"+mediaItem.getVideoLengthString()+"</div>";
		}

		if (mediaItem.blobURL) {
			return '<div class="rsMedia" data-id="'+mediaItem.id+'" id="rsMedia_'+mediaItem.id+'" style="background-image: url(\''+mediaItem.blobURL+'\');">'+durationHTML+'</div>';
		} else {
			return '<div class="rsMedia" data-id="'+mediaItem.id+'" id="rsMedia_'+mediaItem.id+'" style="background-image: url(\''+mediaItem.getPreviewBase64()+'\');"><div class="rsMediaPreview" id="rsMediaPreview_'+mediaItem.id+'">'+durationHTML+'</div></div>';
		}
	}

	// async loadMoreMedia(initialization) {
	// 	if (this._loadingMoreMedia && !this._data.isLoading) {
	// 		return true;
	// 	}

	// 	this._loadingMoreMedia = true;
	// 	let media = await this._data.peer.loadMedia(initialization);

	// 	this._data.mediaItems = media;
	// 	if (this._data.isLoading) {
	// 		this._data.isLoading = false;
	// 		this.render();
	// 	}

	// 	this.nextTick(()=>{
	// 		this.appendMissingDOM();
	// 	});

	// 	this._loadingMoreMedia = false;
	// }

	template() {
		return `<div id="{{domId}}">
					{{if (options.isLoading)}}
					<div class="appLoading">
						<div class="cssload-zenith dark"></div>
					</div>
					{{#else}}
						<div class="rsDocsItems" id="rsMediaItems">

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

module.exports = RightSidebarMedia;
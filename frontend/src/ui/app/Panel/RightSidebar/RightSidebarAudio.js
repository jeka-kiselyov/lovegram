// const AppUI = require('../../../../utils/AppUI.js');

const RightSidebarInfoAbstract = require('./RightSidebarInfoAbstract.js');

class RightSidebarAudio extends RightSidebarInfoAbstract {
	constructor(params) {
		super(params);

		// this._peerManager = this._app._peerManager;
		this._seekWidth = 250;

		this._itemsName = 'Audios';
		this._events = [
			['scroll', 'rsAudiosItems', 'onScroll'],
			['click', 'rsAudiosItems', 'onClick'],
			['mouseup', 'rsAudiosItems', 'onMouseUp'],
			['mousedown', 'rsAudiosItems', 'onMouseDown'],
			['mousemove', 'rsAudiosItems', 'onMouseMove'],
		];

		// this._data = {
		// 	active: params.active || false,
		// 	isLoading: true,
		// 	items: [],
		// };

		// this._hasMoreItems = true;

		this._app._mediaPlayer.on('timeupdate', (params)=>{
			// this.itemPlaying(params.messageAudio, null, params.currentTime);
			if (!this._mouseIsDown) {
				!params.messageAudio.isVoice && this.moveSeekTo(params);
			}
			// this.timeupdate(params);
		});
		this._app._mediaPlayer.on('pause', (params)=>{
			// alert('pause'+params.messageAudio.id);
			!params.messageAudio.isVoice && this.itemPlaying(params.messageAudio, false);
		});
		this._app._mediaPlayer.on('play', (params)=>{
			// alert('play'+params.messageAudio.id);
			!params.messageAudio.isVoice && this.itemPlaying(params.messageAudio, true);
		});
	}

	byId(id) {
		for (let item of this._data.items) {
			if (item.id == id) {
				return item;
			}
		}
	}

	onClick(e) {
		const base = this.$('#rsAudiosItems');
		const closest = e.target.closest('.audioButton');

		if (closest && base.contains(closest)) {
			let item = this.byId(closest.dataset.id);
			item && this._app._mediaPlayer.toggleAudio(item, this._data.peer);
		}
	}

	onMouseMove(e) {
		const base = this.$('#rsAudiosItems');
		let closest = e.target.closest('.audioButton');
		if (closest && base.contains(closest)) {
			let item = this.byId(closest.dataset.id);
			item && this._app._mediaPlayer.preloadAudio(item);
		}

		if (!this._mouseIsDown) {
			return;
		}

		const x = e.offsetX;
		this.moveSeekTo({messageAudio: this._seekingItem, percents: 100*(x / this._seekWidth)});
	}

	onMouseDown(e) {
		const base = this.$('#rsAudiosItems');
		let closest = e.target.closest('.audioTrack');

		if (closest && base.contains(closest)) {
			let id = closest.dataset.id;
			for (let item of this._data.items) {
				if (item.id == id) {
					this._seekingItem = item;
					closest.classList.add('seeking');
					this._mouseIsDown = true;
					this._seekWidth = closest.offsetWidth;
					return;
				}
			}
		}
	}

	onMouseUp(e) {
		if (!this._mouseIsDown) {
			return;
		}

		const x = e.offsetX;
		this._mouseIsDown = false;
		const percents = 100*(x / this._seekWidth);
		// alert(percents);

		// alert(percents);

		this._app._mediaPlayer.seekTo(this._seekingItem, percents);

		this._seekingItem = null;
		this._mouseIsDown = false;
		console.error(this._seekingItem);

		const track = this.$('.seeking');
		track.classList.remove('seeking');

		// this._app._mediaPlayer.seekTo(item);
		// this.moveSeekTo(percents);
		// this.seekTo(percents);
	}

	moveSeekTo(params) {
		this.$('#at_rs_'+params.messageAudio._id).querySelector('.audioSeek').style.width = ''+params.percents+'%';
		params.currentTime && (this.$('#at_rs_'+params.messageAudio._id+'_time').innerHTML = ''+Math.floor(params.currentTime / 60) + ':' + ('0' + (Math.floor(params.currentTime) % 60)).slice(-2)+' / '+params.messageAudio.getInfo('durationHuman'));
	}

	itemPlaying(item, playing, percents) {
		// if (playing && this._seekingItem && this._seekingItem._id == item._id) return;
		// console.error(item, playing);
		// if (!percents) alert(''+item._id+'   '+playing);

		this.$('#ab_rs_'+item._id+(playing ? '_play' : '_pause')).classList.remove('active');
		this.$('#ab_rs_'+item._id+(playing ? '_pause' : '_play')).classList.add('active');

		const rs = this.$('#at_rs_'+item._id);
		const at = this.$('#at_rs_'+item._id+'_artist');
		if (playing) {
			rs.classList.add('active');
			if (percents) {
				this.moveSeekTo({messageAudio: item, percents: percents});
			}
			at.classList.remove('active');
		} else {
			at.classList.add('active');
			rs.classList.remove('active');
			this.$('#at_rs_'+item._id+'_time').innerHTML = item.getInfo('durationHuman');
		}
	}

	timeupdate(params) {
		// console.error('timeupdate', params);
	}

	// async loadMoreItems(initialization) {
	// 	if (this._loadingMoreItems && !this._data.isLoading) {
	// 		return true;
	// 	}

	// 	this._loadingMoreItems = true;
	// 	let items = await this._data.peer.loadAudios(initialization);

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

	// 	let container = this.$('#rsAudiosItems');
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
	// 		let inDOM = this.$('.rsAudio_'+item.id);
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
		if (docItem.isVoice) {
			return '';
		}

		let html = `<div class="audio rsAudio_${docItem.id}" data-id="${docItem.id}">
				<div class="audioButton rpb" id="ab_rs_${docItem.id}" data-id="${docItem.id}"><div id="ab_rs_${docItem.id}_play" class="active">${RightSidebarInfoAbstract.AppUI.getIconHTML('play')}</div><div id="ab_rs_${docItem.id}_pause">${RightSidebarInfoAbstract.AppUI.getIconHTML('pause')}</div></div>
				<div class="audioTitle">${docItem.getInfo('title')}</div>
				<div class="audioArtist active" id="at_rs_${docItem.id}_artist">${docItem.getInfo('performer')}</div>
				<div class="audioTrack" id="at_rs_${docItem.id}"  data-id="${docItem.id}"><div class="audioSeek"></div><div class="audioLine"></div></div>
				<div class="audioTime" id="at_rs_${docItem.id}_time">${docItem.getInfo('durationHuman')}</div>
			</div>
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
						<div class="rsDocsItems" id="rsAudiosItems">
							<div class="rsDocsMore">
								<div class="cssload-zenith dark"></div>
							</div>
						</div>
					{{/if}}
				</div>
				`;
	}
};

module.exports = RightSidebarAudio;
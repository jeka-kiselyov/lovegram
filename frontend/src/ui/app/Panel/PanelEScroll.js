const AppUI = require('../../../utils/AppUI.js');

class PanelEScroll extends AppUI {
	constructor(params) {
		super(params);

		this.AppUI = AppUI;

		this._overflows = {
			bottom: 0,
			top: 0,
			topIds: {},
			bottomIds: {},
		};
	}

	reduceOverflows(ids) {
		// let r = {top: 0, bottom: 0};
		let isNew = false;

		for (let id of ids) {
			if (this._overflows.topIds[id]) {
				this._overflows.top -= this._overflows.topIds[id];
				// r.top += this._overflows.topIds[id];
				delete this._overflows.topIds[id];
			} else {
				// return flag if new messages added to top, so we should adjust the scroll to match
				isNew = true;
			}
			// console.error(this._overflows.bottomIds)
			if (this._overflows.bottomIds[id]) {
				this._overflows.bottom -= this._overflows.bottomIds[id];
				// r.bottom += this._overflows.bottomIds[id];
				delete this._overflows.bottomIds[id];
			}
		}

		// console.error('reducing top ', r.top, 'bottom:', r.bottom);

		this.$('#messageOverflowTop').style.height = this._overflows.top+'px';
		this.$('#messageOverflowBottom').style.height = this._overflows.bottom+'px';

		// this.debug();

		return isNew;
	}

	removeKeepingScroll(ids) {
		for (let id of ids) {
			try {
				const cont = this._cIds[id].$();
				if (id < this._data.peer.getBaseMessage()._id) {
					// message is older than the base one, so it was on top of it
					const h = cont.offsetHeight
					this._overflows.top += h;
					this._overflows.topIds[id] = h;
				} else {
					const h = cont.offsetHeight
					this._overflows.bottom += h;
					this._overflows.bottomIds[id] = h;
				}

				this._cIds[id].cleanUp();
				cont.remove();
				delete this._cIds[id];
			} catch(e) {}
		}

		this.$('#messageOverflowTop').style.height = this._overflows.top+'px';
		this.$('#messageOverflowBottom').style.height = this._overflows.bottom+'px';
	}

	// debug() {
	// 	let ttop = 0;
	// 	let tbottom = 0;

	// 	let d = '';
	// 	for (let m of this._data.peer._messages) {
	// 		if (this._overflows.topIds[m._id]) {
	// 			d+='-';
	// 			ttop+=this._overflows.topIds[m._id];
	// 		} else if (this._overflows.bottomIds[m._id]) {
	// 			d+='_';
	// 			tbottom+=this._overflows.bottomIds[m._id];
	// 		} else {

	// 		}

	// 		d+=m._id;
	// 		d+='|';


	// 	}

	// 	console.error(d);

	// 	let beforeElsHeight = 0;
	// 	for (let m of this._data.peer._messages) {
	// 		if (Number(m._id) < 71762 && this._cIds[m._id]) {
	// 			beforeElsHeight+=this._cIds[m._id].$().offsetHeight;
	// 		}
	// 	}

	// 	console.error('top: ',ttop,this._overflows.top, 'bottom: ',tbottom,this._overflows.bottom, 't el: ', (this.$('#message_71762') ? this.$('#message_71762').offsetTop : 'not there'), 'before height:', beforeElsHeight, beforeElsHeight + this._overflows.top);
	// }

	onScroll() {
		// console.error('scroll');

		// console.time('scroll');

		const el = this.$('#panelMessages');
		const elst = el.scrollTop;
		const elsheight = el.scrollHeight;
		const elheight = el.offsetHeight;

		// if (this._browsingSearchMessages) {
		// 	if (!this.__ignoreSearchScroll && Math.abs(this._browsingSearchMessagesScrollTop - el.scrollTop) > 500 ) {
		// 		let curTime = new Date();
		// 		if ( (curTime.getTime() - this._browsingSearchMessagesStartTime.getTime()) > 2000 ) {
		// 			console.error('getting rid of messages');
		// 			this.getRidOfSearchMessages();
		// 			this._browsingSearchMessages = false;
		// 			this._browsingSearchMessagesScrollTop = 0;
		// 			this._browsingSearchMessagesStartTime = null;
		// 		}
		// 	}
		// } else {
			if (el) {
				if (elst < (this._overflows.top + 1000) && this._data.peer.hasOlder()) {
					// this.$('.loadingMore').classList.add('active');
					if (elst < this._overflows.top) {
						el.scrollTop = this._overflows.top;
					}
					console.error('loading asked older');
					this._data.peer.loadOlder();
				}
				if (elst > (elsheight - this._overflows.bottom - elheight - 1000) && this._data.peer.hasNewer()) {
					if (elst > (elsheight - this._overflows.bottom - elheight)) {
						el.scrollTop = (elsheight - this._overflows.bottom - elheight);
					}
					console.error('loading asked newer');
					this._data.peer.loadNewer();
				}
			}
		// }

		// console.timeEnd('scroll');
	}
}

module.exports = PanelEScroll;
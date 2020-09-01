/**
 * Interface that keeps N messages in reference and allows you to load more, prev
 */

const PeerMessage = require('./PeerMessage.js');
const EventTarget = window.classes.EventTarget;

class PeerScroller extends EventTarget {
	constructor(params) {
		super(params);

		this._baseMessage = null;
		this._messagesVisible = [];
		this._messagesVisibleIds = [];
		this._baseMessageN = null;

		// this._hasOlderMessages = true;
		// this._hasNewerMessages = false;
	}

	calcDates() {
		for (let i = 1; i < this._messagesVisible.length; i++) {
			if (!this._messagesVisible[i].isDate && (new Date(this._messagesVisible[i]._date*1000)).getDay() != (new Date(this._messagesVisible[i-1]._date*1000)).getDay()) {
				// if (this._messages[i].isService()) {
				// 	this._messages[i].dateChecked = true;
				// } else {
					const dMessage = new PeerMessage({
						apiObject: {
							_: 'messageService',
							action: 'date',
							date: this._messagesVisible[i]._date-1,
							id: (this._messagesVisible[i]._id - 0.5),
						},
						peerManager: this.peerManager,
						peer: this,
					});
					dMessage.isDate = true;
					this._messagesVisible.splice(i, 0, dMessage);
					this._messagesVisibleIds.push(Number(dMessage._id));
					i++;
					// console.error('need to add date');
				// }
			}
		}
	}

	/**
	 * Visible messages - +- 40 of base message
	 * @return {[type]} boolean if there is enough in memory
	 */
	recalcVisible(dir) {
		let enough = false;

		this._messagesVisible = [];
		this._messagesVisibleIds = [];

		let baseMessage = this.getBaseMessage();
		let ind = null;
		for (let i = this._messages.length - 1; i >= 0; i--) {
			if (this._messages[i]._id == baseMessage._id) {
				ind = i;
			}
		}

		// move base message up to the most recent if it's close
		if (ind > this._messages.length - 5) {
			this.setBaseMessage(this._messages[this._messages.length - 1]);
			ind = this._messages.length - 1;
		}


		if (ind !== null) {
			for (let i = ind - 40; i < ind + 40; i++) {
				if (this._messages[i]) {
					this._messagesVisible.push(this._messages[i]);
					this._messagesVisibleIds.push(Number(this._messages[i]._id));

					if (i == (ind-40) && dir == 'desc') {
						enough = true;
					} else if (i == (ind+39) && dir == 'asc') {
						enough = true;
					}
				}
			}
		}

		this._baseMessageN = this._messagesVisible.length - 1;


		// console.error('visiblemessages', this._messagesVisible);

		return enough;
	}

	hasOlder() {
		if ((this._messagesVisible[0]._id != this._messages[0]._id) || this._thereReMoreMessages) {
			return true;
		}

		return false;
	}

	hasNewer() {
		if (this._messagesVisible[this._messagesVisible.length - 1]._id != this._messages[this._messages.length - 1]._id) {
			return true;
		}

		return false;
	}

	async loadInitial() {
		if (this._messages.length >= 20) {
			this.sortMessages();
			this.recalcVisible();
			this.emit('messages');
			return;
		}

		return await this.loadMoreMessages();
	}

	async loadOlder() {
		this.setBaseMessage(this._messagesVisible[0]);
		return await this.loadMoreMessages('desc');
	}

	async loadNewer() {
		// alert('loading newer');
		this.setBaseMessage(this._messagesVisible[this._messagesVisible.length - 1]);
		return await this.loadMoreMessages('asc');
	}

	async searchMessage(messageId) {
		// loading messages around messageId
		await this.loadMoreMessages(null, messageId);
		// setting base message to the one searched
		for (let m of this._messages) {
			if (m._id == messageId) {
				this.setBaseMessage(m);
				this.sortMessages();
				this.recalcVisible();
				this.emit('messages');

				return true;
			}
		}

		return false;
	}

	/**
	 * Invoke api, if channel is invalid - re-query access_hash from getDialogs and invoke api again
	 * @param  {[type]} method  [description]
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	async sureInvoke(method, options) {
		let resp = await this._peerManager._user.invoke(method, options);
		if (resp.data.type == 'CHANNEL_INVALID') {
			await this._peerManager.updateHashes();
			options.peer.access_hash = this._apiObject.access_hash;
			resp = await this._peerManager._user.invoke(method, options);
		}
		return resp;
	}

	async loadMoreMessages(dir, messageId) {
		if (this._loadingMoreMessages) return;

		this._loadingMoreMessages = true;

		// console.error('loading', dir);

		if (this.recalcVisible(dir) && !messageId) {
			// we have enough messages in memory;
			this._loadingMoreMessages = false;
			this.emit('messages');
			return;
		}

		// @todo: skip api query if messages are already in _messages array

		const baseMessage = this.getBaseMessage();

		const options = {
			peer: this.getInputPeerObject(),
			limit: 40
		};

		if (messageId) {
			options.offset_id = messageId;
			options.add_offset = -40;
		} else if (dir) {
			options.offset_id = baseMessage._id;
			if (dir == 'asc') {
				options.add_offset = -40;
			}
		}

		const resp = await this.sureInvoke('messages.getHistory', options);

		// console.time('processingresp');

		if (resp && resp.success) {
		// console.time('processingresp chats');
			if (resp.data.chats) {
				for (let chat of resp.data.chats) {
					this._peerManager.peerByAPIResult(chat, false, true);
				}
			}
		// console.timeEnd('processingresp chats');
		// console.time('processingresp users');
			if (resp.data.users) {
				for (let user of resp.data.users) {
					this._peerManager.peerUserByAPIResult(user);
				}
			}
		// console.timeEnd('processingresp users');
		// console.time('processingresp messages');
			let someMessages = false;
			if (resp.data.messages) {
				// console.error('visiblemessages api resp', resp.data.messages);
				for (let message of resp.data.messages) {
					this.messageByAPIResult(message, false, true);
					someMessages = true;
				}
			}
		// console.timeEnd('processingresp messages');

			if (!someMessages && dir == 'desc') {
				this._thereReMoreMessages = false;
			}
			this._messagesWereLoaded = true;
		}

		this._loadingMoreMessages = false;

		if (!messageId) {
		// console.timeEnd('processingresp');
			this.sortMessages();
			this.recalcVisible();
			this.emit('messages');
		}


		return true;
	}

	getBaseMessage() {
		if (!this._baseMessage) {
			return this._messages[this._messages.length - 1];
		}
		return this._baseMessage;
	}

	/**
	 * Set base peerMessage. If not specified, base message is the last one received in peer
	 * @param {[type]} peerMessage [description]
	 */
	setBaseMessage(peerMessage) {
		// console.error('loading set base message id to:'+peerMessage._id);
		this._baseMessage = peerMessage;
	}
}

module.exports = PeerScroller;

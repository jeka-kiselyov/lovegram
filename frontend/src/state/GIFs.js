const EventTarget = window.classes.EventTarget;
const MessageMedia = require('./MessageMedia.js');

class GIFs extends EventTarget {
	constructor(params) {
		super();

		this._user = params.user;
		this._peerManager = params.peerManager;
		this._gifs = [];

		this._lastQ = null;
		this._lastOffset = null;
		this._hasMore = false;
	}

	async search(q, more) {
		if (q === null) {
			q = this._lastQ;
		}

		if (!this._searchBot) {
			const resp = await this._user.invoke('contacts.resolveUsername', {username: 'gif'});
			try {
				this._searchBot = {
					_: 'inputUser',
					user_id: resp.data.users[0].id,
					access_hash: resp.data.users[0].access_hash,
				};
			} catch(e) {  };
		}
		if (q != this._lastQ) {
			this._lastOffset = null;
		}
		const data = await this._user._protocol.invokeAndCache('messages.getInlineBotResults', {bot: this._searchBot, peer: {_:'inputPeerEmpty'}, query: q, offset: ((more && this._lastOffset) ? this._lastOffset : undefined)},{max: 10});
		const ret = [];
		if (data) {
			try {


				for (let r of data.results) {
					let media = new MessageMedia({
						apiObject: r.document,
						peerManager: this._peerManager,
					});
					ret.push(media);
					this._hasMore = true;
				}
				this._lastOffset = data.next_offset;
				this._lastQ = q;

			} catch(e) {  }

			if (!ret.length) {
				this._lastOffset = null;
				this._hasMore = false;
			}
		}

		// console.error(ret);
		return ret;
	}

	async load() {
		const options = {}; // hash:
		const resp = await this._user.invoke('messages.getSavedGifs', options);

		if (resp && resp.data && resp.data.gifs) {
			for (let ao of resp.data.gifs) {
				let media = new MessageMedia({
					apiObject: ao,
					peerManager: this._peerManager,
				});

				this._gifs.push(media);
			}
		}
	}


}

module.exports = GIFs;
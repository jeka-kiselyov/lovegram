const EventTarget = window.classes.EventTarget;
const MessageMedia = require('./MessageMedia.js');

class GIFs extends EventTarget {
	constructor(params) {
		super();

		this._user = params.user;
		this._peerManager = params.peerManager;
		this._gifs = [];
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
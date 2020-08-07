const AbstractMessage = require('./AbstractMessage.js');

class Service extends AbstractMessage {
	constructor(params) {
		super(params);

		// this._data.mediaSize = this.getSizeForTheMedia();
		// dom id ready for querySelector, important for service messages only
		this._data.did = (''+this._data.message._id).split('.').join('_');
	}
};
//
Service.template = `
			<div id="message_{{did}}" data-id="{{message._id}}"
				class="
					panelMessage panelMessageService
				"
				title="{{message._id}}"
				style="
				"
				>
				{{message.getDisplayMessage()}}
			</div>

			<div style="clear: both"></div>
		`;


module.exports = Service;
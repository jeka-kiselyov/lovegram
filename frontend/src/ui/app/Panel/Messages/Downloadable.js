const AbstractMessage = require('./AbstractMessage.js');

class Downloadable extends AbstractMessage {
	constructor(params) {
		super(params);
	}
};

Downloadable.template = `
			<div id="message_{{message._id}}" data-id="{{message._id}}" data-moveaction="heat"
				class="panelMessage{{if (options.fromMe)}} fromMe{{#else}} fromThem{{/if}} panelMessage{{viewType}} {{if (options.sameAsNext)}} sameAsNext{{/if}} messageAction messageMove"
				title="{{message._id}}"
				>

				<div class="rsDoc panelRsDoc rsDoc_{{message._doc.id}}" data-id="{{message._doc.id}}">
					<div class="rsDocIcon avatarC{{message._doc.getInfo('color')}}"><div class="progress"><div></div></div>{{message._doc.getInfo('ext')}}</div>
					<div class="rsDocName">{{message._doc.getInfo('filename')}}</div>
					<div class="rsDocMeta">{{message._doc.getInfo('sizeHuman')}}</div>
				</div>

				{{self.avHTML(options.message, 'avatarSmall')|safe}}
			</div>

			<div style="clear: both"></div>
		`;


module.exports = Downloadable;
const MBAbstract = require('./MBAbstract.js');

class MBPhoto extends MBAbstract {
	constructor(params) {
		super(params);

		this._data.originalBlobURL = null;
	}

	async loadFull() {
		let originalBlobURL = await this._media.loadFull();
		if (originalBlobURL) {
			this._data.originalBlobURL = originalBlobURL;
			let el = this.$('.mbbPhoto');
			if (el) {
				el.style.backgroundImage = "url('"+originalBlobURL+"')";
			}
		}
	}

	template() {
		return `
			{{if (options.fromDefined)}}
				<div class="mbbPhoto" style="background-image: url('{{imageURL}}'); top: {{from.y}}px; left: {{from.x}}px; width: {{from.width}}px; height: {{from.height}}px;"></div>
			{{#else}}
				{{if (options.originalBlobURL)}}
					<div class="mbbPhoto"  style="background-image: url('{{originalBlobURL}}');"></div>
				{{#else}}
					<div class="mbbPhoto"  style="background-image: url('{{imageURL}}');"></div>
				{{/if}}
			{{/if}}
		`;
	}
};

module.exports = MBPhoto;
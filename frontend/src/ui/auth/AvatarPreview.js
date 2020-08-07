const UI = require('../../utils/UI.js');
const Icon = require('../icons/Icon.js');
const EditAvatarPopup = require('./EditAvatarPopup.js');

class AvatarPreview extends UI {
	constructor(params) {
		super(params);

		this._components = {
			IconAdd: this.newC(Icon, {icon: 'photo'}),
			EditAvatarPopup: this.newC(EditAvatarPopup),
		};

		this._events = [
			['click', this.domId+'_edit', 'selectFile'],
		];
		this._componentEvents = [
			['image', 'EditAvatarPopup', 'onImage'],
		];
	}

	// hide() {
	// 	this.$('#imageCropPopup').classList.remove('visible');
	// 	this.removeAllListeners();
	// 	this.emit('image', this.getData());
	// }

	selectFile() {
		this._components.EditAvatarPopup.selectFile();
	}

	onImage(data) {
		this.updatePreview(data.dataURL);
		this.emit('image', data.binary);
	}

	updatePreview(base64) {
		let previewElement = this.$('.imageCropPreview');
		previewElement.style.backgroundImage = "url("+base64+")";
	}

	template() {
		return `
			<div class="imageCropPreview">
				<div id='{{domId}}_edit'>{{component(options.components.IconAdd)}}{{/component}}</div>
			</div>
			{{component(options.components.EditAvatarPopup)}}{{/component}}
		`;
	}
}

module.exports = AvatarPreview;

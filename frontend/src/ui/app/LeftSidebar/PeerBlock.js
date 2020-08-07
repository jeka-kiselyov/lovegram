const UI = window.classes.UI;
const Checkbox = window.classes.Checkbox;
const AppIcon = require('../../icons/AppIcon.js');
const AppUI = require('../../../utils/AppUI.js');

class PeerBlock extends UI {
	constructor(params) {
		super(params);

		this._components = {
			Checkbox: this.newC(Checkbox),
		};
		this._data.peer = params.peer;
		this._data.type = params.type;

		if (params.info) {
			this._data.info = params.info;
		} else {
			this._data.info = (params.peer ? params.peer.getInfoString() : '');
		}

		if (params.type) {
			this._data.title = params.type.charAt(0).toUpperCase() + params.type.slice(1).split('_').join(' ');
		}

		this._noDiv = true; // do not wrap in extra div
		this.AppUI = AppUI;

		// this.doAvatar(this._data.peer, '.avatar');
		// if (this._data.peer.hasAvatar() === null) {
		// 	this._data.peer.getAvatarBlobURL()
		// 		.then((blobURL)=>{
		// 			if (blobURL) {
		// 				this.$('.avatarBack').style.backgroundImage = "url('"+blobURL+"')";
		// 			}
		// 		});
		// }
	}

	off() {
		this._components.Checkbox.off();
		this.$().classList.remove('active');
	}

	on() {
		this._components.Checkbox.on();
		this.$().classList.add('active');
	}

	toggle() {
		this._components.Checkbox.toggle();
		if (this._components.Checkbox._data.selected) {
			this.$().classList.add('active');
		} else {
			this.$().classList.remove('active');
		}

		return this._components.Checkbox._data.selected;
	}
};
//
PeerBlock.template = `{{if (options.type)}}
			<div class="scBlock scBlockType" id="{{domId}}" title="{{type}}" data-id="{{type}}">

				<div class="scBlockIcon">
					{{self.AppUI.getIconHTML(options.type)|safe}}
				</div>
				<div class="scBlockCheckbox">
					{{component(options.components.Checkbox)}}{{/component}}
				</div>
				<div class="scBlockMessage">
					<div class="scBlockTitle">{{title}}</div>
				</div>
			</div>
			{{#else}}
			<div class="scBlock" id="{{domId}}" title="{{peer._id}}" data-id="{{peer._id}}" {{js(options.dnl = (''+options.peer.getDisplayName()).toLowerCase())/}} data-search="{{dnl}}">

				<div class="scBlockCheckbox">
					{{component(options.components.Checkbox)}}{{/component}}
				</div>

				{{self.avHTML(options.peer, 'avatarMedium')|safe}}

				<div class="scBlockMessage">
					<div class="scBlockTitle">{{peer.getDisplayName()}}</div>
					<div class="scBlockBody">{{info| safe}}</div>
				</div>
			</div>
			{{/if}}
		`;

module.exports = PeerBlock;

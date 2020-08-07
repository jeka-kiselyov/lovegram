const UI = require('../../utils/UI.js');

class Checkbox extends UI {
	constructor(params) {
		super(params);

		this._events = [
			['click', this._domId, 'onClick'],
		];
		this._data.selected = params.selected || false;
	}

	set(val) {
		this._data.selected = val;
		this.applyStyles();
		this.emit('selected', this._data.selected);
	}

	off() {
		this.set(false);
	}

	on() {
		this.set(true);
	}

	toggle() {
		this._data.selected = !this._data.selected;
		this.applyStyles();
		this.emit('selected', this._data.selected);
	}

	applyStyles() {
		if (this._data.selected) {
			this.$('.checkboxSelected').classList.add('active');
			this.$('.checkboxEmpty').classList.remove('active');
		} else {
			this.$('.checkboxSelected').classList.remove('active');
			this.$('.checkboxEmpty').classList.add('active');
		}
	}

	onClick() {
		this.toggle();
	}
};

Checkbox.template = `
	<div class="checkbox" id="{{domId}}">
		<div class="checkboxSelected {{if (options.selected)}}active{{/if}}">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
				<g fill="none" fill-rule="evenodd">
					<polygon points="0 0 24 0 24 24 0 24"/>
					<path fill="#000" fill-rule="nonzero" d="M18,3 C19.6568542,3 21,4.34314575 21,6 L21,18 C21,19.6568542 19.6568542,21 18,21 L6,21 C4.34314575,21 3,19.6568542 3,18 L3,6 C3,4.34314575 4.34314575,3 6,3 L18,3 Z M17.2928932,7.29289322 L10,14.5857864 L6.70710678,11.2928932 C6.31658249,10.9023689 5.68341751,10.9023689 5.29289322,11.2928932 C4.90236893,11.6834175 4.90236893,12.3165825 5.29289322,12.7071068 L9.29289322,16.7071068 C9.68341751,17.0976311 10.3165825,17.0976311 10.7071068,16.7071068 L18.7071068,8.70710678 C19.0976311,8.31658249 19.0976311,7.68341751 18.7071068,7.29289322 C18.3165825,6.90236893 17.6834175,6.90236893 17.2928932,7.29289322 Z"/>
    			</g>
			</svg>
		</div>
		<div class="checkboxEmpty {{if (!options.selected)}}active{{/if}}">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
				<g fill="none" fill-rule="evenodd">
					<polygon points="0 0 24 0 24 24 0 24"/>
					<path fill="#000" fill-rule="nonzero" d="M6,3 L18,3 C19.6568542,3 21,4.34314575 21,6 L21,18 C21,19.6568542 19.6568542,21 18,21 L6,21 C4.34314575,21 3,19.6568542 3,18 L3,6 C3,4.34314575 4.34314575,3 6,3 Z M6,5 C5.44771525,5 5,5.44771525 5,6 L5,18 C5,18.5522847 5.44771525,19 6,19 L18,19 C18.5522847,19 19,18.5522847 19,18 L19,6 C19,5.44771525 18.5522847,5 18,5 L6,5 Z"/>
    			</g>
			</svg>
		</div>
	</div>
		`;


module.exports = Checkbox;



const UIInput = require('./UIInput.js');

class NameInput extends UIInput {
	constructor(params) {
		params.label = params.label;
		params.type = 'text';
		super(params);

		this._val = '';
	}

	afterRender() {
		this.preFocus('#'+this._domId+'_input');
	}

	onChange(e) {
		this.checkLabel();
		this.$('.input').classList.remove('error');
	}
};

module.exports = NameInput;

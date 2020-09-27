const UIInput = require('./UIInput.js');
const Icon = require('../icons/Icon.js');

class PasswordInput extends UIInput {
	constructor(params) {
		params.label = 'Password';
		params.type = 'password';
		super(params);

		this._data.errorLabel = 'Invalid Password';

		this._components = {
			IconEye: this.newC(Icon, {icon: 'eye'}),
			IconEye2: this.newC(Icon, {icon: 'eye2'})
		};

		this._events = [
			['click', this._domId+'_icon', 'onIcon'],
			['keydown', this._domId+'_input', 'onChange'],
			['change', this._domId+'_input', 'onChange'],
		];
		this._val = '';
		this._passwordVisible = false;
	}

	onIcon() {
		if (this._passwordVisible) {
			this.$('#'+this._domId+'_input').type = "password";
			this.$('.inputIcon1').classList.add('inputIconActive');
			this.$('.inputIcon2').classList.remove('inputIconActive');
			this._passwordVisible = false;
			this.emit('visible', false);
		} else {
			this.$('#'+this._domId+'_input').type = "text";
			this.$('.inputIcon2').classList.add('inputIconActive');
			this.$('.inputIcon1').classList.remove('inputIconActive');
			this._passwordVisible = true;
			this.emit('visible', true);
		}
	}

	onChange(e) {
		this.checkLabel();
		this.$('.input').classList.remove('error');

		if (e.keyCode && e.keyCode == 13) {
			this.emit('enter');
		}
	}
};

module.exports = PasswordInput;

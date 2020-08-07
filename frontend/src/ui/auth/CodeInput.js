const UIInput = require('./UIInput.js');

class CodeInput extends UIInput {
	constructor(params) {
		params.label = 'Code';
		params.type = 'number';
		super(params);

		this._data.errorLabel = 'Invalid Code';
		this._val = '';
		this._lastLength = 0;
	}

	afterRender() {
		this.preFocus('#'+this._domId+'_input');
	}
	
	onChange(e) {
		this.error(false);

		this.nextTick(()=>{
			let val = this.val();
			if (this._val != val) {
				this._val = val;
				if (val && val.length == 5) {
					this.setLoading(true);
					this.emit('code', val);
				}
			}

			let newLength = val.length;
			if (newLength != this._lastLength) {
				this._lastLength = newLength;
				this.emit('length', this._lastLength);
			}
		});
		// this.checkLabel();
		// this.$('.input').classList.remove('error');
	}
};

module.exports = CodeInput;

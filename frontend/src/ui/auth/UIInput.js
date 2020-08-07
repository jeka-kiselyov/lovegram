
const UI = require('../../utils/UI.js');

class UIInput extends UI {
	constructor(params) {
		super(params);

		this._data = {
			label: params.label || '',
			type: params.type || 'text'
		};
		this._data.errorLabel = params.errorLabel || this._data.label;
		this._events = [
			['keydown', this._domId+'_input', 'onChange'],
			['change', this._domId+'_input', 'onChange'],
			['focus', this._domId+'_input', 'onFocus'],
			['blur', this._domId+'_input', 'onBlur'],
		];
	}

	onFocus() {
		this.$('.input').classList.remove('error');
		this.$('.input').classList.add('inputFocus');
	}

	onBlur() {
		this.$('.input').classList.remove('inputFocus');
	}

	val(v) {
		const domE = this.$('#'+this._domId+'_input');
		// DOM element
		if (!domE) {
			return null;
		}
		if (typeof(v) !== 'undefined') {
			domE.value = v;
			return domE.value;
		} else {
			return domE.value;
		}
	}

	setLoading(loading = true) {
		let lEl = this.$('.inputLoading');
		if (lEl) {
			if (loading) {
				this.$('.inputLoading').classList.add('active');
			} else {
				this.$('.inputLoading').classList.remove('active');
			}
		}
	}

	error(eCode) {
		// console.log('E');
		// console.log(eCode);
		this.setLoading(false);
		const iEl = this.$('.input');
		if (eCode === false) {
			if (this._hasError) {
				this.emit('noerror');
	 			this._hasError = false;
			}
			if (iEl) {
				this.$('#'+this._domId+'_label').innerHTML = this._data.label;
				iEl.classList.remove('error');
			}
		} else {
			this._hasError = true;
			if (iEl) {
				this.$('#'+this._domId+'_label').innerHTML = this._data.errorLabel;
				iEl.classList.add('error');
			}
		}
		this.checkLabel();
	}

	checkLabel() {
		this.nextTick(()=>{
			let fv = this.val();
			let domE = this.$('.input');

			if (domE) {
				if (fv.length) {
					domE.classList.add('withlabel');
				} else {
					domE.classList.remove('withlabel');
				}
			}
		});
	}

	onChange(e) {
		this.checkLabel();
		this.$('.input').classList.remove('error');
	}

	data(name, value) {
		this._data[name] = value;
		this.render();
	}

	template() {
		return `
			<div class="input">
				<label for="{{domId}}_input"><span id="{{domId}}_label">{{label}}</span></label>
				<div class="inputBorder">
					{{if (options.type=='password')}}
						<div class="inputIcon" id="{{domId}}_icon" >
							<div class="inputIcon1 inputIconFlip inputIconActive">{{component(options.components.IconEye)}}{{/component}}</div>
							<div class="inputIcon2 inputIconFlip">{{component(options.components.IconEye2)}}{{/component}}</div>
						</div>
					{{#else}}
					<div class="inputLoading" id="{{domId}}_loading" >
						<div class="cssload-container"><div class="cssload-zenith"></div></div>
					</div>
					{{/if}}
					<div class="inputInputC">
						<input id="{{domId}}_input" type="{{type}}" placeholder="{{label}}" autocomplete="autocomplete_of2_r9fg9h439th89gsdf8432fasdbk">
					</div>
				</div>
			</div>
		`;
	}
};

module.exports = UIInput;

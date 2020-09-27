const UIInput = require('./UIInput.js');
const countries = require('../../utils/countries.js');
const Phone = require('../../utils/Phone.js');

class PhoneInput extends UIInput {
	constructor(params) {
		params.label = 'Phone Number';
		params.type = 'tel';
		super(params);

		this._data.errorLabel = 'Invalid Phone Number';
		// this._data = {
		// 	data: 'some',
		// 	showhidden: true,
		// 	selectedCode: null,
		// 	selectedCountry: null,
		// };
		// this._domId = 'phoneInput';
		// this._events = [
		// 	['keydown', 'phoneInputInput', 'onChange'],
		// 	['change', 'phoneInputInput', 'onChange'],
		// ];
		//
		this._country = null;
		this._countryCode = null;
		this._phoneNumber = null;
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
				if (eCode == 'PHONE_NUMBER_INVALID') {
					this.$('#'+this._domId+'_label').innerHTML = this._data.errorLabel;
				} else {
					this.$('#'+this._domId+'_label').innerHTML = eCode;
				}
				iEl.classList.add('error');
			}
		}
		this.checkLabel();
	}

	setCountry(country) {
		if (country && country.dialCode) {
			const code = country.dialCode.split(' ').join('');
			if (code != this._countryCode) {
				this._countryCode = code;
				this.val(this._countryCode);
			}
		}
		// const code = country.dialCode || '+1';

		// this._countryCode = code.split(' ').join('');
		// this._country = country;

		// this.$('#'+this._domId+'_input').value = this._countryCode;

		this.error(false);
	}


	onChange(e) {
		this.checkLabel();
		this.error(false);

		// @todo: disable erasing countryCode? Or let user autocomplete country by inputing countryCode?

		let key = null;
		if (e) {
			key = e.keyCode;
			if ((e.shiftKey === true || key === 35 || key === 36) || // Allow Shift, Home, End
	        (key === 8 || key === 9 || key === 13 || key === 46) || // Allow Backspace, Tab, Enter, Delete
	        (key > 36 && key < 41) || // Allow left, up, right, down
	        (
	            // Allow Ctrl/Command + A,C,V,X,Z
	            (e.ctrlKey === true || e.metaKey === true) &&
	            (key === 65 || key === 67 || key === 86 || key === 88 || key === 90)
	        )) {
	        	// https://stackoverflow.com/a/30058928/1119169

	        	if (key == 13) {
	        		// submit form on enter
	        		this.emit('submit');
	        	}

				return true;
	        }
		}

		this.nextTick(()=>{
			let value = this.val();
			value = Phone.strip(value);

			let foundCountry = Phone.getCountryByNumber(value);
			if (foundCountry) {
				if (!this._country || foundCountry.name != this._country.name) {
					this._country = foundCountry;
					this.emit('country', foundCountry);
				}
			} else {
				this._country = null;
				this.emit('country', null);
			}

			let phoneData = Phone.formatNumber(this._country, value);
			console.log(phoneData);
			this.val(phoneData.formatted);
			if (phoneData.formatted != this._phoneNumber) {
				this._phoneNumber = phoneData.formatted;
				this.emit('phone', phoneData);
			}
		});

		return true;
	}
};

module.exports = PhoneInput;

const UIInput = require('./UIInput.js');
const Icon = require('../icons/Icon.js');
const countrires = require('../../utils/countries.js');

class CountryInput extends UIInput {
	constructor(params) {
		params.label = 'Country';
		params.type = 'text';
		super(params);

		this._events = [
			['click', 'countryInputPopup', 'onClick'],
			['click', this._domId+'_icon', 'onIcon'],
			['keydown', this._domId+'_input', 'onKeydown'],
			['focus', this._domId+'_input', 'onFocus'],
			['blur', this._domId+'_input', 'onBlur']
		];
		this._components = {
			IconUp: this.newC(Icon),
			IconDown: this.newC(Icon, {flip: true})
		};

		// https://github.com/matiassingers/emoji-flags/blob/master/data.json
		// http://api.wipmania.com/jsonp?callback=jsonpCallback
		this._countryCodes = countrires;
		this._data.countryCodes = this._countryCodes;

		this._hashTablePrepared = false;
		this._hashTable = {};

		this._country = null;

		this.nextTick(()=>{
			this.guessCountry();
		});
	}

	guessCountry() {
		this._user._protocol.getCountryCode()
			.then((countryCode)=>{
				if (this.val()) {
					// do not guess country if user already selected something
					return false;
				}
				if (countryCode) {
					for (let c of countrires) {
						if (c.code == countryCode) {
							this.setCountry(c);
							this.checkLabel();
							this.emit('country', c);
						}
					}
				}
			});

		// const that = this;
		// const callback = (data)=>{
		// 	if (this.val()) {
		// 		// do not guess country if user already selected something
		// 		return false;
		// 	}
		// 	if (data && data.country) {
		// 		for (let c of countrires) {
		// 			if (c.code == data.country) {
		// 				this.setCountry(c);
		// 				this.checkLabel();
		// 				this.emit('country', c);
		// 			}
		// 		}
		// 	}
		// };
		// const script = document.createElement('script');
	 //    script.type = 'text/javascript';
	 //    // @todo: move token to config, upgrade plan or switch to own service
	 //    script.src = "//ipinfo.io/?callback=callback&token=084ea0478769e6";

	 //    window['callback'] = function(data){
	 //      callback.call(that, data);
	 //      document.getElementsByTagName('head')[0].removeChild(script);
	 //      delete window['callback'];
	 //    };

	 //    // Load JSONP
	 //    document.getElementsByTagName('head')[0].appendChild(script);
	}

	setCountry(country) {
		if (country && country.name) {
			const cVal = this.val();
			if (!cVal || !this._country || this._country.name != country.name) {
				// this._data.country = country;
				this._country = country;
				this.val(country.name);
			}
		}
	}

	getCountryByCode(code) {
		for (let c of this._countryCodes) {
			if (c.dialCode == code) {
				return c;
			}
		}

		return null;
	}

	filterAutocomplete() {
		if (!this._hashTablePrepared) {
			for (let c of this._countryCodes) {
				let key = c.name.toLowerCase()+c.dialCode+(c.alias ? c.alias.join('').toLowerCase() : '');
				this._hashTable[key] = c;
			}
			this._hashTablePrepared = true;
		}

		let val = ''+this.val();
		let lval = val.toLowerCase();
		let fitCount = 0;

		for ( const [key,c] of Object.entries(this._hashTable) ) {
			if (key.indexOf(lval) == -1) {
				document.getElementById(this._domId+'_popup_'+c.name).classList.add('hidden');
				// c.filteredOut = true;
			} else {
				document.getElementById(this._domId+'_popup_'+c.name).classList.remove('hidden');
				fitCount++;
				// c.filteredOut = false;
			}
		}

		if (!fitCount) {
			this.hidePopup();
		} else {
			this.showPopup();
		}
		// for (let key in this._hashTable) {
		// 	if (key.indexOf(val) == -1) {
		// 		document.getElementById(this._domId+'_popup_'+this._hashTable[key.name).classList.add('hidden');
		// 		// c.filteredOut = true;
		// 	} else {
		// 		document.getElementById(this._domId+'_popup_'+c.name).classList.remove('hidden');
		// 		// c.filteredOut = false;
		// 	}
		// }
	}

	onKeydown() {
		this.checkLabel();
		this.$('.input').classList.remove('error');
		this.nextTick(()=>{
			this.filterAutocomplete();
		});
	}

	onIcon() {
		if (this._popupVisible) {
			this.hidePopup();
		} else {
			this.showPopup();
			this.preFocus('#'+this._domId+'_input');
		}
	}

	onBlur() {
		this._blurTimeout = setTimeout(()=>{
			this.hidePopup();
		},100);
	}

	onFocus() {
		this.showPopup();
	}

	showPopup() {
		clearTimeout(this._blurTimeout);
		this._popupVisible = true;
		document.getElementById('countryInputPopup').classList.add('visible');
		this.showIcon(1);
	}

	hidePopup() {
		this._popupVisible = false;
		document.getElementById('countryInputPopup').classList.remove('visible');
		this.showIcon(2);
	}

	showIcon(n) {
		let on = 2;
		if (n == 2) {
			on = 1;
		}
		this.$('.inputIcon'+n).classList.add('inputIconActive');
		this.$('.inputIcon'+on).classList.remove('inputIconActive');
	}

	onClick(e) {
		const base = document.getElementById(this.domId);
		const closest = event.target.closest('.e');

		if (closest && base.contains(closest)) {
			closest.classList.add("active");
			// handle class event
			const code = closest.dataset.code;
			const c = this.getCountryByCode(code);
			this.val(c.name);
			this.checkLabel();
			// document.getElementById('countryInputInput').value = c.name;

			this.emit('country', c);
			this.hidePopup();
		}
	}

	template() {
		return `
			<div class="input">
				<label for="{{domId}}_input"><span>{{label}}</span></label>
				<div class="inputBorder">
					<div class="inputIcon" id="{{domId}}_icon" >
						<div class="inputIconFlip inputIcon1">{{component(options.components.IconUp)}}{{/component}}</div>
						<div class="inputIconFlip inputIcon2 inputIconActive">{{component(options.components.IconDown)}}{{/component}}</div>
					</div>
					<div class="inputInputC">
						<input type="text" id="{{domId}}_input" autocomplete="autocomplete_of2_r9fg9h439th89gsdf8432fasdbk" placeholder="{{label}}" {{if (options.country && options.country.name)}}value="{{country.name}}"{{/if}}>
					</div>
				</div>
				<div class="inputPopup" id="countryInputPopup">
					{{each(options.countryCodes)}}
						<div class="e" data-code="{{@this.dialCode}}" id="{{domId}}_popup_{{@this.name}}"><div class="f">{{@this.emoji}}</div><div class="n">{{@this.name}}</div><div class="c">{{@this.dialCode}}</div></div>
					{{/each}}
				</div>
			</div>
		`;
	}
}
module.exports = CountryInput;



// const UI = require('../utils/UI.js');
// const countires = require('../utils/countries.js');

// class CountryInput extends UI {
// 	constructor(params) {
// 		super(params);

// 		this._data = {
// 			data: 'some',
// 			showhidden: true,
// 			selectedCode: null,
// 			selectedCountry: null,
// 		};
// 		this._domId = 'countryInput';
// 		this._events = [
// 			['click', 'countryInputPopup', 'onClick'],
// 			['focus', 'countryInputInput', 'onFocus']
// 		];

// 		// https://github.com/matiassingers/emoji-flags/blob/master/data.json

// 		this._countryCodes = countires;
// 		this._data.countryCodes = this._countryCodes;

// 		this._country = null;

// 		// setTimeout(()=>{
// 		// 	this.showPopup();
// 		// },1000);
// 	}

// 	data(name, value) {
// 		this._data[name] = value;
// 		this.render();
// 	}

// 	setCountry(country) {
// 		if (country && country.name) {
// 			if (!this._country || this._country.name != country.name) {
// 				this._country = country;
// 				document.getElementById('countryInputInput').value = country.name;
// 			}
// 		}
// 		// const code = country.dialCode || '+1';

// 		// this._countryCode = code.split(' ').join('');
// 		// this._country = country;

// 		// this.$('#'+this._domId+'_input').value = this._countryCode;

// 		// this.error(false);
// 	}


// 	showPopup() {
// 		document.getElementById('countryInputPopup').classList.add('visible');
// 	}

// 	hidePopup() {
// 		document.getElementById('countryInputPopup').classList.remove('visible');
// 	}

// 	onFocus() {
// 		this.showPopup();
// 	}

// 	getCountryByCode(code) {
// 		for (let c of this._countryCodes) {
// 			if (c.dialCode == code) {
// 				return c;
// 			}
// 		}

// 		return null;
// 	}

// 	onClick(e) {
// 		const base = document.getElementById(this.domId);
// 		const closest = event.target.closest('.e');

// 		if (closest && base.contains(closest)) {
// 			closest.classList.add("active");
// 			// handle class event
// 			const code = closest.dataset.code;
// 			const c = this.getCountryByCode(code);
// 			document.getElementById('countryInputInput').value = c.name;

// 			this.emit('country', c);
// 			this.hidePopup();
// 		}
// 	}

// 	template() {
// 		return `
// 			<div class="input">
// 				<div class="inputIcon"><i class="arrow up"></i></div>
// 				<label><span>Country</span></label>
// 				<div class="inputBorder">
// 					<input type="text" id="countryInputInput">
// 				</div>
// 				<div class="inputPopup" id="countryInputPopup">
// 					{{each(options.countryCodes)}}
// 						<div class="e" data-code="{{@this.dialCode}}"><div class="f">{{@this.emoji}}</div><div class="n">{{@this.name}}</div><div class="c">{{@this.dialCode}}</div></div>
// 					{{/each}}
// 				</div>
// 			</div>
// 		`;
// 	}
// };

module.exports = CountryInput;

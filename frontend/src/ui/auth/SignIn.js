
const UI = require('../../utils/UI.js');
const Button = require('./Button.js');
const CountryInput = require('./CountryInput.js');
const PhoneInput = require('./PhoneInput.js');
const CodeInput = require('./CodeInput.js');
const SignInInfo = require('./SignInInfo.js');
const NameInput = require('./NameInput.js');
const PasswordInput = require('./PasswordInput.js');

class SignIn extends UI {
	constructor(params) {
		super(params);

		this._data = {
			state: 'undefined',
		};
		this._components = {
			Button_undefined: this.newC(Button, {title: 'Next'}),
			Button_wfreg: this.newC(Button, {title: 'Start Messaging'}),
			Button_wf2a: this.newC(Button, {title: 'Next'}),
			CountryInput: this.newC(CountryInput),
			FirstNameInput: this.newC(NameInput, {label: 'First Name'}),
			LastNameInput: this.newC(NameInput, {label: 'Last Name'}),
			PhoneInput: this.newC(PhoneInput),
			PasswordInput: this.newC(PasswordInput),
			CodeInput: this.newC(CodeInput),
			SignInInfo: this.newC(SignInInfo, {state: this._data.state})
		};
		this._domId = 'signin';
		this._events = [
			['click', 'somelink', 'onClick']
		];
		this._componentEvents = [
			['image', 'SignInInfo', 'onBinaryImage'],
			['click', 'Button_undefined', 'onNext'],
			['click', 'Button_wfreg', 'onNext'],
			['click', 'Button_wf2a', 'onNext'],
			['country', 'CountryInput', 'onCountry'],
			['editPhone', 'SignInInfo', 'onEditPhone'],
			['country', 'PhoneInput', 'onCountry'],
			['phone', 'PhoneInput', 'onPhone'],
			['submit', 'PhoneInput', 'onNext'],
			['code', 'CodeInput', 'onCode'],
			['length', 'CodeInput', 'onCodeLength'],
			['noerror', 'CodeInput', 'onCodeErrorClear'],
			['name', 'FirstNameInput', 'onFirstName'],
			['name', 'LastNameInput', 'onLastName'],
			['visible', 'PasswordInput', 'onPwVisible'],
			['enter', 'PasswordInput', 'onNext'],
		];

		this._cToHighlightOnE = null; // component to highlight if there's error from State

		this._onUserState = (state)=>{
			this.onUserState(state);
		};
		this._onUserError = (eCode)=>{
			if (this._cToHighlightOnE) {
				// alert(eCode);
				this._cToHighlightOnE.error(eCode);
			}
			this._components.SignInInfo.error(true);
			this._components.Button_undefined.setLoading(false);
			this._components.Button_wfreg.setLoading(false);
			this._components.Button_wf2a.setLoading(false);
		};

		this._user.on('state', this._onUserState);
		this._user.on('error', this._onUserError);
	}

	remove() {
		this._user.removeEventListener('state', this._onUserState);
		this._user.removeEventListener('error', this._onUserError);
	}

	data(name, value) {
		this._data[name] = value;
	}

	onPwVisible(visible) {
		this._components.SignInInfo.visible(visible);
	}

	onBinaryImage(binary) {
		this._user.setAvatar(binary);
	}

	onUserState(state) {
		// console.log('state: '+state);
		this._data.state = state;
		// state is changed, so there was no error on prev step
		if (this._cToHighlightOnE) {
			this._cToHighlightOnE.error(false);
		}
		this._cToHighlightOnE = null;
		this._components.SignInInfo.setUserState(state);
		// if (state === 'wfreg') {
		// 	this._components.Button.setTitle('Start Messaging');
		// } else {
		// 	this._components.Button.setTitle('Next');
		// }

		if (state == 'wfcode') {
			this.$('#'+this._components.CodeInput._domId).val = '';
		}

		this.$$('.inputs').forEach((el)=>{ el.classList.remove('inputsVisible'); });
		if (this.$('#authInputs_'+state)) {
			this.$('#authInputs_'+state).classList.add('inputsVisible');
		}

		if (state == 'wfcode') {
			this.preFocus('#'+this._components.CodeInput._domId+'_input'); // focus if not touch
		} else if (state == 'wf2a') {
			this.preFocus('#'+this._components.PasswordInput._domId+'_input'); // focus if not touch
		} else if (state == 'wfreg') {
			this.preFocus('#'+this._components.FirstNameInput._domId+'_input'); // focus if not touch
		}
	}

	onEditPhone() {
		this._components.Button_undefined.setLoading(false);
		this._user.setState('undefined');
	}

	onNext() {
		if (this._data.state == 'undefined') {
			this._components.Button_undefined.setLoading(true);

			this._user.setPhoneNumber(this._data.phoneNumber);
			this._cToHighlightOnE = this._components.PhoneInput;

			// this._user.setState('wfcode');

		} else if (this._data.state == 'wfreg') {
			this._components.Button_wfreg.setLoading(true);

			this._cToHighlightOnE = this._components.FirstNameInput;
			let firstName = this._components.FirstNameInput.val();
			let lastName = this._components.LastNameInput.val();

			this._user.signUp({
				firstName: firstName,
				lastName: lastName
			});
		} else if (this._data.state == 'wf2a') {
			this._components.Button_wf2a.setLoading(true);

			this._cToHighlightOnE = this._components.PasswordInput;
			let password = this._components.PasswordInput.val();

			this._user.setPassword(password);
		}

		// this.emit('click');
	}

	onFirstName() {

	}

	onLastName() {

	}

	onCode(code) {
		this._cToHighlightOnE = this._components.CodeInput;
		this._user.setCode(code);
		//
		// setTimeout(()=>{
		// 	this._user.setState('wf2a');
		// }, 500);
	}

	onCodeLength(length) {
		this._components.SignInInfo.codeLength(length);
	}

	onCodeErrorClear() {
		this._components.SignInInfo.error(false);
	}

	onPhone(data) {
		this._data.phoneNumber = data.phone || data.raw;
		this._data.phoneNumberFormatted = data.formatted;

		this._components.SignInInfo.preloadMonkey();

		this._components.SignInInfo.setPhone(data.formatted);
	}

	onCountry(country) {
		this._components.PhoneInput.setCountry(country);
		this._components.CountryInput.setCountry(country);

		this.preFocus('#'+this._components.PhoneInput._domId+'_input'); // focus if not touch
	}

	template() {
		return `
			<div class="authForm">
				<div class="info">
					{{component(options.components.SignInInfo)}}{{/component}}
				</div>
				<div class="inputs {{if(options.state == 'undefined')}}inputsVisible{{/if}}" id="authInputs_undefined">
					{{component(options.components.CountryInput)}}{{/component}}
					{{component(options.components.PhoneInput)}}{{/component}}
					{{component(options.components.Button_undefined)}}{{/component}}
				</div>
				<div class="inputs {{if(options.state == 'wfreg')}}inputsVisible{{/if}}" id="authInputs_wfreg">
					{{component(options.components.FirstNameInput)}}{{/component}}
					{{component(options.components.LastNameInput)}}{{/component}}
					{{component(options.components.Button_wfreg)}}{{/component}}
				</div>
				<div class="inputs {{if(options.state == 'wf2a')}}inputsVisible{{/if}}" id="authInputs_wf2a">
					{{component(options.components.PasswordInput)}}{{/component}}
					{{component(options.components.Button_wf2a)}}{{/component}}
				</div>
				<div class="inputs {{if(options.state == 'wfcode')}}inputsVisible{{/if}}" id="authInputs_wfcode">
					{{component(options.components.CodeInput)}}{{/component}}
				</div>
			</div>

		`;


				// {{if(options.showhidden)}}
				// 	Display {{data}} <b>this</b> hidden! <a href="#" id="somelink">test</a>
				// {{#else}}
				// 	They {{data}} <i>don't</i> equal
				// {{/if}}
	}

	// render() {
	// 	const html = Sqrl.Render(this.template(), this._data);
	// 	document.getElementById(this._domId).innerHTML = html;

	// 	for (let ev of this._events) {
	// 		let obj = document.getElementById(ev[1]);
	// 		let handler = this[ev[2]];
	// 		if (obj && handler) {
	// 			obj.addEventListener(ev[0], ()=>{
	// 				handler.apply(this, arguments);
	// 			});
	// 		}
	// 	}

	// 	for (let cEv of this._componentEvents) {
	// 		let c = this._data.components[cEv[1]];
	// 		let handler = this[cEv[2]];

	// 		if (c && handler) {
	// 			c.assignDomEvents();
	// 			c.addEventListener(cEv[0], ()=>{
	// 				handler.apply(this, arguments);
	// 			});
	// 		}
	// 	}

	// 	// document.getElementById('somelink').addEventListener('click', ()=>{
	// 	// 		this.onClick();
	// 	// 	});
	// }
};

module.exports = SignIn;

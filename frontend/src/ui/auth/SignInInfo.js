const UI = require('../../utils/UI.js');
const Icon = require('../icons/Icon.js');
const TGSSet = require('../../utils/TGSSet.js');
const AvatarPreview = require('./AvatarPreview.js');

class SignInInfo extends UI {
	constructor(params) {
		super(params);

		this._data = {
		};
		this._events = [
			['click', this._domId+'_edit', 'onEditPhone'],
		];

		this._components = {
			IconEdit: this.newC(Icon, {icon: 'edit'}),
			AvatarPreview: this.newC(AvatarPreview)
		};
		this._componentEvents = [
			['image', 'AvatarPreview', 'onBinaryImage'],
		];

		this._headers = {
			"undefined": "Sign in to Telegram",
			"wfreg": "Your Name",
			"wf2a": "Enter a Password",
			"wfcode": "",
		};

		this._infoTexts = {
			"undefined": "Please confirm your country and<br>enter your phone number.",
			"wfcode": "We have sent you an SMS<br>with the code.",
			"wf2a": "Your account is protected with<br>an additional password.",
			"wfreg": "Enter your name and add<br>a profile picture.",
		};

		this._data.state = params.state || 'undefined';
		this._data.phoneNumber = '';
		this._data.headers = this._headers;
		this._data.infoTexts = this._infoTexts;

		this._tgs = null;
	}

	onBinaryImage(binary) {
		this.emit('image', binary);
	}

	preloadMonkey() {
		if (this._monkeyPreloaded) {
			return true;
		}

		this.loadTGS();
		this._monkeyPreloaded = true;
	}

	error(clear) {
		if (this._data.state == 'wfcode') {
			this._tgs.goToTime(20, true);
			// if (clear) {
			// 	this.showLogoType('m2');
			// } else {
			// 	this.showLogoType('m1');
			// }
		}
	}

	visible(visible) {
		if (this._data.state == 'wf2a') {
			if (visible) {
				this._tgs.show('peek', false, true)
					.then(()=>{
						this._tgs.goToTime(14, true);
					});
			} else {
				this._tgs.show('peek', false, true)
					.then(()=>{
						this._tgs.goToTime(0, true);
					});
			}
		}
	}

	onEditPhone() {
		this.emit('editPhone');
	}

	setPhone(formattedPhone) {
		this._data.phoneNumber = formattedPhone;
		this.$('#auth_phone_number_span').innerHTML = formattedPhone;
	}

	async loadTGS() {
		// if (!this._user._protocol.inflate) {
		// 	return false;
		// }

		if (this._tgsLoaded) {
			return false;
		}

		if (this._tgsLoading) {
			return new Promise((res)=>setTimeout(res, 1000));
		}

		// console.log(this._domId);
		// console.log(this.$('#monkey'));

		this._tgsLoading = true;

		this._tgs = new TGSSet(this.$('#monkey'));
		const json = await this.loadJSON('assets/data/intro.json');
		console.error(json);
		this._tgs._makaka = json;

		// await this._tgs.loadMakakaFile('assets/data/intro.json'); // hope we have pako there
		// await this._tgs.addTGSFromURL('idle', 'assets/images/MonkeyIdle.json');
		// await this._tgs.addTGSFromURL('tracking', 'assets/images/MonkeyTracking.json');
		// await this._tgs.addTGSFromURL('close', 'assets/images/MonkeyClose.json');
		// await this._tgs.addTGSFromURL('peek', 'assets/images/MonkeyPeek.json');
		console.error('tgs loaded');
		this._tgsLoaded = true;

		return true;
	}

	setUserState(state) {
		this._data.state = state;
		// this.render();

		if (state == 'online') {
			return;
		}

		if (state == 'undefined') {
			this.$('#logo').classList.add('logo_tg');
		} else {
			this.$('#logo').classList.remove('logo_tg');
		}
		if (state == 'wfcode') {
			this.$('#logoEditPhone').classList.remove('hidden');
			this.$('#logoHeader').classList.add('hidden');
		} else {
			this.$('#logoEditPhone').classList.add('hidden');
			this.$('#logoHeader').classList.remove('hidden');
		}
		if (state == 'wfreg') {
			this.$('#avatarUpload').classList.remove('hidden');
			this.$('#monkey').style.display = 'none';
		} else {
			this.$('#avatarUpload').classList.add('hidden');
			// this.$('#monkey').style.display = 'none';
			// this.$('.logo').style.display = 'block';
		}

		this.$('#logoHeader').innerHTML = this._headers[state];
		this.$('#logoNote').innerHTML = this._infoTexts[state];

		if (this._data.state != 'undefined') {
			this.loadTGS()
				.then(()=>{

					if (this._data.state == 'wf2a' && (this._tgs._visibleAnim == 'tracking' || this._tgs._visibleAnim == 'idle')) {
						this._tgs.show('close', false, true)
							.then(()=>{
								this._tgs.goToTime(60, true);
							});
					}
					if (this._data.state == 'wfcode') {
						this._tgs.show('idle', true, false);
					}

				});



			// this._tgs.fetchJSON('assets/images/MonkeyTracking.json');
			// this._tgs.fetchJSON('assets/images/MonkeyTracking.json');
		}
	}

	/**
	 * Set monkey animation based on code length
	 */
	codeLength(length) {
		this.loadTGS()
			.then(()=>{ /// wait for makaka load
				this._tgs.show('tracking', false, true)
					.then(()=>{ /// wait for setting state to tracking
						if (length >= 5) {
							this._tgs.goToTime(0, false, 3);
						} else {
							this._tgs.goToTime(20+length*10, true);
						}
					});
			});
	}
				// <div class="logo logo_tg{{if (options.state == 'undefined')}} active{{/if}}"></div>
				// <div class="logo logo_m1{{if (options.state == 'wfcode')}} active{{/if}}"></div>
				// <div class="logo logo_m2"></div>
				// <div class="logo logo_m3{{if (options.state == 'wf2a')}} active{{/if}}"></div>
				// <div class="logo logo_m4"></div>
	template() {
		return `
			<div class="logoC">
				<div class="logo {{if (options.state == 'undefined')}}logo_tg{{/if}} active" id="logo">
					<div id="monkey"></div>
					<div id="avatarUpload" class="hidden">{{component(options.components.AvatarPreview)}}{{/component}}</div>
				</div>
			</div>

			<h1 id="logoHeader">{{headers[options.state]}}</h1>
			<h1 id="logoEditPhone" class="hidden"><span id="auth_phone_number_span">{{phoneNumber}}</span> <div id="{{domId}}_edit">{{component(options.components.IconEdit)}}{{/component}}</div></h1>

			<h5 id="logoNote">{{infoTexts[options.state] | safe}}</h5>
		`;
	}
};

module.exports = SignInInfo;

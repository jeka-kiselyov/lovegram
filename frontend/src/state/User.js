const EventTarget = require('../utils/EventTarget.js');

class User extends EventTarget {
	constructor(params = {}) {
	    super();

		this._app = params.app;
		this._protocol = this._app._protocol;
		this._mediaManager = null; // to be initalized on App

		this._phoneNumber = null;
		this._phoneCodeHash = null;
		this._phoneCode = null;

		this._state = 'undefined';
		this._avatarToUpload = null;

		this._userData = {};

		this.userInfo();
	}

	async invoke(method, params = {}, options) {
		const resp = await this._protocol.invoke(method, params, options);
		if (!resp.success) {
			this.emitRespError(resp);
		}
		return resp;
	}

	async logOut() {
		try {
			await this._protocol.invoke('auth.logOut');
		} catch(e) {
			console.log(e);
		}
		this.setUserData(null);
		await this._protocol.logout();
	}

	signedIn() {
		return (this._state === 'online');
	}

	setAvatar(binary) {
		// console.warn('image set', binary);
		this._avatarToUpload = binary;
	}

	setState(state) {
		this._state = state;
		this.emit('state', this._state);
	}

	setUserData(userData, doNotPersist = false) {
		this._userData = userData;
		if (!doNotPersist) {
			this._protocol.persistUser(JSON.stringify(userData));
		}

		if (userData) {
			this.setState('online');
			this.uploadAvatar(); /// upload user image if there's any prepared
		} else {
			this.setState('undefined');
		}
	}

	setPhoneNumber(phoneNumber) {
		this._phoneNumber = phoneNumber;
		// @todo: flush current user if there is one
		this.sendVerification();
	}

	emitRespError(resp) {
		if (!resp.success && resp.data) {
			this.emit('error', ''+resp.data.type);

			if (resp.data.type == 'AUTH_KEY_UNREGISTERED') {
				this.setUserData(null);
			}
		}
	}

	async uploadAvatar() {
		if (!this._avatarToUpload) {
			return false;
		}
		if (!this._mediaManager) {
			console.error('MM is not yet ready');
			return false;
		}

		try {
			const inputFile = await this._mediaManager.uploadPhoto(this._avatarToUpload, 'avatar.png');
			const resp = await this._protocol.invoke('photos.uploadProfilePhoto', {file: inputFile});

			/// get rid of prev cached
			await this._mediaManager.flushPeerAvatar({_id: this._userData.id, _type: 'user'});
			// do we need this? Looks that we don't display it anywhere now

			return true;
		} catch(e) {
			console.error(e);
		}
		return false;
	}

	async sendVerification() {
		// https://core.telegram.org/method/auth.sendCode
		const resp = await this._protocol.invoke('auth.sendCode', {phone_number: this._phoneNumber, settings: {"_":"codeSettings"}});
		if (!resp.success) {
			this.emitRespError(resp);
			return false;
		}

	    if (!resp.data.phone_registered) {
	        // New user
	    }

	    // phone_code_hash will need to sign in or sign up
	    this._phoneCodeHash = resp.data.phone_code_hash;
	    this.setState('wfcode');

	    return true;
	}

	async signUp(params = {}) {
		const callOptions = {
			phone_number: this._phoneNumber,
			phone_code_hash: this._phoneCodeHash,
			phone_code: this._phoneCode,
			first_name: params.firstName,
			last_name: params.lastName
		};

		// https://core.telegram.org/method/auth.signUp
		const resp = await this._protocol.invoke('auth.signUp', callOptions);
		// console.log(resp);
		if (!resp.success) {
			this.emitRespError(resp);
			return false;
		}

		if (resp.success && resp.data && resp.data.user) {
			this.setUserData(resp.data.user);
		} else {
			this.emit('error', ''+resp.data.type);
			this.setUserData(null);
		}

		// FIRSTNAME_INVALID
		// LASTNAME_INVALID
	}

	async setPassword(password) {
		const resp = await this._protocol.invoke('account.getPassword');
		if (resp.data) {
			const srp = await this._protocol.generateSRP(resp.data, password);
			const authResp = await this._protocol.invoke('auth.checkPassword', {
					password: srp
				});

			if (authResp && authResp.data && authResp.data.user) {
				// success
				this.setUserData(authResp.data.user);
			} else {
				// wrong password
				this.emitRespError(authResp);
			}
		}
	}

	async setCode(code) {
		this._phoneCode = code;

		const callOptions = {
			phone_number: this._phoneNumber,
			phone_code_hash: this._phoneCodeHash,
			phone_code: this._phoneCode,
		};

		// https://core.telegram.org/method/auth.signIn
		const resp = await this._protocol.invoke('auth.signIn', callOptions);
		// console.log(resp);
		if (resp.success) {
			if (resp.data.user) {
				this.setUserData(resp.data.user);
			} else {
			    this.setState('wfreg');
			}
		} else {
			// !success
			switch (resp.data.type) {
		        case 'PHONE_CODE_INVALID':
					this.emitRespError(resp);
				    // this.setState('wfcode');
		        break;
		        case 'PHONE_NUMBER_UNOCCUPIED':
				    this.setState('wfreg');
		            // User not registered, you should use signUp method
		            //
		        break;
		        case 'SESSION_PASSWORD_NEEDED':
				    this.setState('wf2a');
		            // Password needed
		            //
	            break;
	            default:
					this.emitRespError(resp);
	            break;
			}
		}
	}

	async userInfo() {
		let userData = await this._protocol.userData();
		if (userData) {
			try {
				userData = JSON.parse(userData);
			} catch(e) {
				userData = null;
			}

			if (userData) {
				this.setUserData(userData, true);
			}
		}
		// const info = await this._protocol.invoke('help.getUserInfo');
		// const info = await telegramApi.getUserInfo();
		// console.log(info);
	}
}

module.exports = User;
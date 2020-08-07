const UI = require('../utils/UI.js');
const SignIn = require('./auth/SignIn.js');

class AuthInterface extends UI {
	constructor(params) {
		super(params);

		this._user = params.user;
		this._domId = 'auth';

		this._data = {
			user: this._user,
		};

		this.userStateChanged(); // init components
		this._user.on('state', (newState)=>{
			this.userStateChanged();
		});

		this._preloadingRemoved = false;
	}

	rmPreloading() {
		if (this._preloadingRemoved) {
			return;
		}
		this._preloadingRemoved = true;

		setTimeout(()=>{
			const p = document.getElementById('preloading');
			p.classList.add('loaded');
			setTimeout(()=>{
				p.remove();
			}, 300);
		}, 300);
	}

	userStateChanged(newState) {
		// We are ready to show our interface
		this.rmPreloading();

		const cr = this._components;
		if (this._user.signedIn()) {
			if (cr.SignIn) {
				cr.SignIn.remove();
				cr.SignIn = undefined;
				this.render();
			}
		} else {
			if (!cr.SignIn) {
				cr.SignIn = this.newC(SignIn);
				this.render();
			}
		}
	}

	template() {
		return `
			{{if(options.user.signedIn())}}
			{{#else}}
				{{component(options.components.SignIn)}}{{/component}}
			{{/if}}
		`;
	}
};

module.exports = AuthInterface;

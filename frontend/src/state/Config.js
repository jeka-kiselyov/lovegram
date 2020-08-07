const defaultConfig = require('../config/config.js');

class Config {
	constructor(options) {
		this._config = defaultConfig;
	}

	get(name, defaultValue = false) {
		return this._config[name] || defaultValue;
	}

	//// Settings user may change
	getSetting(name, defaultValue = false) {
		let ret = null;
		try {
			ret = JSON.parse(localStorage.getItem('settings_'+name));
		} catch(e) {
			ret = defaultValue;
		}

		return ret;
	}

	setSetting(name, value) {
		localStorage.setItem('settings_'+name, JSON.stringify(value));
	}
}

module.exports = new Config();

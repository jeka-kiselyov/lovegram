class Storage {
	// follows https://github.com/zerobias/telegram-mtproto#storage 
	async get(key) {
		// console.log('get: '+key);
		return localStorage.getItem(key);
	}

	async set(key, value) {
		// console.log(value);
		localStorage.setItem(key, value);
	}

	async remove(keys) {
		for (let key of keys) {
			localStorage.removeItem(key);			
		}
	}

	async clear() {
		localStorage.clear();
	}
}

module.exports = Storage;
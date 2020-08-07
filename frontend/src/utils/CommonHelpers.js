
class CommonHelpers {
	constructor() {
		this._singlePromises = {};
		this._singlePromisesResolvers = {};
	}

	async sureSingle(i) {
		if (this._singlePromises[i]) {
			return await this._singlePromises[i];
		}
		this._singlePromises[i] = new Promise((res)=>{ this._singlePromisesResolvers[i] = res; });
		return null;
	}

	fulfilSingle(i, data, notOnce) {
		if (this._singlePromises[i]) {
			this._singlePromisesResolvers[i](data);
			if (notOnce) {
				delete this._singlePromises[i];
			}
		}
	}

}

module.exports = CommonHelpers;
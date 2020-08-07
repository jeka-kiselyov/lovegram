const TGS = require('./TGS.js');

class TGSSet {
	constructor(container) {
		this._container = container;
		this._anims = {};
		this._containers = {};

		this._visibleAnim = null;
	}

	addAnimTag(name) {
		const elem = document.createElement('div');
		elem.id = 'anim_c_'+name;
		this._container.appendChild(elem);
		this._containers[name] = elem;

		return elem;
	}

	async show(name, loop, wait) {
		if (wait && this._visibleAnim && this._anims[this._visibleAnim]._promise) {
			// console.warn('waiting for the promise');
			await this._anims[this._visibleAnim]._promise;
		}
			// console.warn('waiting for the promise resolved');
		await this.render();

			// console.log(arguments);
		let setSome = false;
		for (let otherName in this._anims) {
			// console.log(otherName);
			if (otherName == name || (!name && !setSome)) {
				this._containers[otherName].style.display = 'block';
				if (this._visibleAnim != otherName) {
					this._anims[otherName]._anim.goToAndPlay(0, true);
					// console.warn('loop', loop);
					this._anims[otherName]._anim.loop = loop;
					this._visibleAnim = otherName;
				}
				if (this._anims[otherName]._anim.loop != loop) {
					this._anims[otherName]._anim.loop = loop;
				}
				setSome = true;
			} else {
				this._containers[otherName].style.display = 'none';
			}
		}
	}

	goToTime(time, guessDirection, speed) {
		this._anims[this._visibleAnim].playTo(time, guessDirection, speed);
	}

	async addTGS(name, data) {
		if (this._anims[name]) {
			return;
		}

		const c = this.addAnimTag(name);
		this._anims[name] = new TGS(c);
		await this._anims[name].setData(data, true);
		// this.show(); // show the first only
	}

	// async addTGSFromURL(name, url) {
	// 	const c = this.addAnimTag(name);
	// 	this._anims[name] = new TGS(c);
	// 	await this._anims[name].fetchJSON(url);
	// 	this.show(); // show the first only
	// // }

	// async fetch(url) {
	//     return new Promise((resolve, reject)=>{
	//         var oReq = new XMLHttpRequest;
	//         oReq.responseType = "arraybuffer";
	//         oReq.open("GET", url);
	//         oReq.onload = function (oEvent) {
	// 			var arrayBuffer = oReq.response; // Note: not oReq.responseText
	// 			oReq.abort();
	// 			if (arrayBuffer) {
	// 				var byteArray = new Uint8Array(arrayBuffer);
	// 				resolve(byteArray);
	// 			}
	//         };
	//         oReq.send();
	//     });
	// }

	async render() {
		if (this._makaka) {
			for (let key in this._makaka) {
				// console.log('tgs key: '+key);
				try {
					// const tgsJSON = JSON.parse(json[key]);
					// console.log(key);
					// console.log(tgsJSON);
					if (key) {
						await this.addTGS(key, this._makaka[key]);
					}
				} catch(e) {
					console.error(e);
				}
			}
		}
	}

	// load .makaka file. Which is gzipped json object of few tgs
	// async loadMakakaFile(url) {
	// 	let json = null;
	// 	try {
	// 		const binary = await this.fetch(url);
	// 		console.error(binary);
	// 		// const time = (new Date()).getTime();
	// 		// json = await inflateFunc(binary);
	// 		json = JSON.parse(json);
	// 		// console.log((new Date()).getTime() - time);
	// 	} catch(e) {
	// 		console.error(e);
	// 	}

	// 	console.error(json);

	// 	this._makaka = json;

	// 	// console.log(json.idle);
	// 	// console.log(json);

	// 	// if (json) {
	// 	// 	for (let key in json) {
	// 	// 		// console.log('tgs key: '+key);
	// 	// 		try {
	// 	// 			// const tgsJSON = JSON.parse(json[key]);
	// 	// 			// console.log(key);
	// 	// 			// console.log(tgsJSON);
	// 	// 			if (key) {
	// 	// 				await this.addTGS(key, json[key]);
	// 	// 			}
	// 	// 		} catch(e) {
	// 	// 			console.error(e);
	// 	// 		}
	// 	// 	}
	// 	// }
	// }
};


module.exports = TGSSet;

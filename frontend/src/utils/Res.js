
class Res {
	constructor() {
	}

	static async includeOnce(url) {
		if (Res._included[url]) {
			return await Res._included[url];
		} else {
			await Res.include(url);
		}
	}

	static include(url) {
		Res._included[url] = new Promise((res, rej)=>{
	        let tag = document.createElement("script");
	        tag.src = url;
	        tag.onload = ()=>{
	        	res();
	        };
	        tag.onerror = ()=>{
	        	rej();
	        };
	        document.getElementsByTagName("body")[0].appendChild(tag);
		});

		return Res._included[url];
	}
};

Res._included = {};

module.exports = Res;
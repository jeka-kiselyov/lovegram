class TestRunner {
	constructor() {
		this.initialize();
	}

	async initialize() {
		let readyToRun = false;
		do {
			try {
				if (app._user.signedIn() && app._peerManager._loadedPinned) {
					readyToRun = true;
				}
			} catch(e) { readyToRun = false; };
			await new Promise((res)=>{ setTimeout(res, 500); });
		} while (!readyToRun);

		await this.setUpBrowser();
	}

	async setUpBrowser() {
		const sripts = ['',''];

        let tag = document.createElement("script");
        tag.src = "https://unpkg.com/mocha@4.0.1/mocha.js";
        tag.onload = ()=>{
        	this.run();
        };
        document.getElementsByTagName("body")[0].appendChild(tag);

		tag = document.createElement("script");
        tag.src = "https://unpkg.com/chai@4.1.2/chai.js";
        document.getElementsByTagName("body")[0].appendChild(tag);

	    const link = document.createElement("link");
	    link.href = "https://unpkg.com/mocha@4.0.1/mocha.css";
	    link.type = "text/css";
	    link.rel = "stylesheet";
	    link.media = "screen,print";

	    document.getElementsByTagName("body")[0].appendChild(link);

	    const div = document.createElement("div");
	    div.id = 'mocha';
	    div.style.position = 'absolute';
	    div.style.top = '0px';
	    div.style.bottom = '0px';
	    div.style.left = '200px';
	    div.style.width = '900px';
	    div.style.overflowY = 'scroll';
	    div.style.backgroundColor = '#ffffff';

	    document.getElementsByTagName("body")[0].appendChild(div);
	}

	async run() {
		mocha.setup('bdd');
		mocha.checkLeaks();

		await this.tests();

		setTimeout(()=>{
			mocha.run();
		}, 100);
	}

	async tests() {
		require('./tests/test_peerManager.js');
	}
}

if (window) {
	// if we are in browser
	let tr = new TestRunner;
}

module.exports = TestRunner;
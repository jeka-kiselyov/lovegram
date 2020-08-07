const UI = window.classes.UI;

class MBAbstract extends UI {
	constructor(params) {
		super(params);

		this._from = params.from || null;
		this._media = params.media || null;

		this._data.from = {
			x: 0,
			y: 0,
			height: 0,
			width: 0,
		};
		this._data.fromDefined = false;

		this._data.calc = {
			x: 0,
			y: 0,
			height: 0,
			width: 0,
		};

		if (this._from) {
			let bcr = this._from.getBoundingClientRect();

			this._data.from.x = bcr.left;
			this._data.from.x = bcr.left;
			this._data.from.y = bcr.top;
			this._data.from.width = bcr.width;
			this._data.from.height = bcr.height;
			this._data.fromDefined = true;

			setTimeout(()=>{
				this.animateGo();
			}, 50);
		}

		this.calc();

		// let mbbEl = this._parent.$('.mbBrowser');
		// let bcr = mbbEl.getBoundingClientRect();

		// this._data.calc.height = bcr.height;

		// let bcrWidth = bcr.width;

		// let ar = this._media.getInfo('aspectRatio');
		// let desiredWidth = Math.floor( bcr.height * ar );
		// if (desiredWidth > (bcrWidth - 200)) {
		// 	desiredWidth = bcrWidth - 200;
		// }
		// if (desiredWidth < 500) {
		// 	desiredWidth = bcrWidth - 10;
		// }

		// let desiredHeight = desiredWidth / ar;
		// if (desiredHeight > bcr.height + 150) {
		// 	desiredHeight = bcr.height + 150;
		// 	desiredWidth =  Math.floor( desiredHeight * ar );
		// }

		// this._data.calc.x = (bcrWidth - desiredWidth) / 2;
		// this._data.calc.width = desiredWidth;
		// this._data.calc.bcrWidth = bcrWidth;
		// this._data.calc.bcrHeight = bcr.height;
		// this._data.calc.height = desiredHeight;

		// this._data.calc.y = bcr.top + Math.floor( (bcr.height - desiredHeight)/2 );

		this._data.imageURL = null;
		if (this._media.cached) {
			this._data.imageURL = this._media.blobURL;
		} else {
			this._data.imageURL = this._media.getPreviewBase64();
		}
	}

	onResize() {
		this.calc();
		this.animateGo();
	}

	calc() {
		let mbbEl = this._parent.$('.mbBrowser');
		let bcr = mbbEl.getBoundingClientRect();

		this._data.calc.height = bcr.height;

		let bcrWidth = bcr.width;

		let ar = this._media.getInfo('aspectRatio');
		let desiredWidth = Math.floor( bcr.height * ar );
		if (desiredWidth > (bcrWidth - 200)) {
			desiredWidth = bcrWidth - 200;
		}
		if (desiredWidth < 500) {
			desiredWidth = bcrWidth - 10;
		}

		let desiredHeight = desiredWidth / ar;
		if (desiredHeight > bcr.height + 150) {
			desiredHeight = bcr.height + 150;
			desiredWidth =  Math.floor( desiredHeight * ar );
		}

		this._data.calc.x = (bcrWidth - desiredWidth) / 2;
		this._data.calc.width = desiredWidth;
		this._data.calc.bcrWidth = bcrWidth;
		this._data.calc.bcrHeight = bcr.height;
		this._data.calc.height = desiredHeight;

		this._data.calc.y = bcr.top + Math.floor( (bcr.height - desiredHeight)/2 );
	}

	stopMedia() {

	}

	setToThePrev() {
		let el = this.$('.mbbPhoto');
		el.style.top = '' + this._data.calc.y + 'px';
		el.style.height = '' + this._data.calc.height + 'px';
		el.style.width = '' + this._data.calc.width + 'px';
		el.style.left = '-' + this._data.calc.width + 'px';
		el.style.right = ''+this._data.calc.bcrWidth+'px';
	}

	setToTheNext() {
		let el = this.$('.mbbPhoto');
		el.style.top = '' + this._data.calc.y + 'px';
		el.style.height = '' + this._data.calc.height + 'px';
		el.style.width = '' + this._data.calc.width + 'px';
		el.style.right = '-' + this._data.calc.width + 'px';
		el.style.left = ''+this._data.calc.bcrWidth+'px';
	}

	animateGo() {
		let el = this.$('.mbbPhoto');
		el.style.top = '' + this._data.calc.y + 'px';
		el.style.left = '' + this._data.calc.x + 'px';
		el.style.height = '' + this._data.calc.height + 'px';
		el.style.width = '' + this._data.calc.width + 'px';
		el.style.right = '' + (this._data.calc.bcrWidth - this._data.calc.width) + 'px';

		this.loadFull();
	}

};

module.exports = MBAbstract;
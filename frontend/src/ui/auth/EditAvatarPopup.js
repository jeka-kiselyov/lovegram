const UI = require('../../utils/UI.js');
const Icon = require('../icons/Icon.js');

class EditAvatarPopup extends UI {
	constructor(params) {
		super(params);


		this._data = {
			state: 'undefined',
			canvasDim: 400,
		};
		this._components = {
			IconAdd: this.newC(Icon, {icon: 'photo'}),
			IconClose: this.newC(Icon, {icon: 'close'}),
			IconOk: this.newC(Icon, {icon: 'check'}),
		};

		this._uploadedImageWidth = null;
		this._uploadedImageHeight = null;
		this._img = null;
		this._ctx = null;

		this._zoom = 80;
		this._offsetX = 0;
		this._offsetY = 0;

		this._data.visible = false;

		this._events = [
			['click', this.domId+'_close', 'close'],
			['click', this.domId+'_okButton', 'hide'],
		];
	}

	attachOutsideListener() {
		this._blurHandler = ()=>{
			this.close();
		};
		this.$('#imageCropPopup').focus();
		this.$('#imageCropPopup').addEventListener('blur', this._blurHandler, true);
	}

	show() {
		if (!this._data.visible) {
			this._data.visible = true;
			this.render();
			this.assignDomEvents(); // there should be no component events for this to work ok
		}

		this.$('#imageCropPopup').classList.add('visible');
		this.resizeCanvas();

		this.addListeners();
		setTimeout(()=>{
			this.attachOutsideListener();
		},1000); /// it just blurs out itselfs when file select
	}

	close() {
		this.$('#imageCropPopup').classList.remove('visible');
		this.removeAllListeners();
		this._data.visible = false;
	}

	hide() {
		this.$('#imageCropPopup').classList.remove('visible');
		this.removeAllListeners();
		this.resizeCanvas(512); // be sure it's 512x
		this.renderImg();
		this._data.visible = false;
		this.emit('image', this.getData());
	}

	removeAllListeners() {
		this.$('#imageCropPopup').removeEventListener('blur', this._blurHandler, true);
		this.$('#crop').removeEventListener('mousedown', this._eMousedown, false);
		this.$('#crop').removeEventListener('mousemove', this._eMousemove, false);
	    window.removeEventListener('mouseup', this._eMouseup, false);
		this.$('#crop').removeEventListener('touchstart', this._eMousedown, false);
		this.$('#crop').removeEventListener('touchmove', this._eMousemove, false);
	    window.removeEventListener('touchend', this._eMouseup, false);
		this.$('#crop').removeEventListener('mousewheel', this._eMousewheel);
		this.$('#crop').removeEventListener('wheel', this._eMousewheel);
	}

	selectFile() {
		const input = this.$('#'+this.domId+'_fileInput');
        // const input = document.createElement("input");
        // input.type = "file";
        // input.id = 'fileDialog';
        input.onchange = ()=>{
					// console.warn('image loaded', input.files);
        	if (input.files && input.files[0]) {
				var reader = new FileReader();
				reader.onload = (e)=>{
					this.setBGImage(e.target.result);
				  // $('#blah').attr('src', e.target.result);
				}
				reader.readAsDataURL(input.files[0]);
			}
		};

		// document.body.appendChild(input);
		// console.warn(input);
		input.click();
        // add onchange handler if you wish to get the file :)
        // input.trigger("click"); // opening dialog
	}


	getData() {
		const BASE64_MARKER = ';base64,';
		const dataURL = this._canvas.toDataURL();
		const base64Index = dataURL.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
		const base64 = dataURL.substring(base64Index);
		const raw = window.atob(base64);
		const rawLength = raw.length;
		const binary = new Uint8Array(new ArrayBuffer(rawLength));

		for(let i = 0; i < rawLength; i++) {
			binary[i] = raw.charCodeAt(i);
		}

		return {
			binary: binary,
			dataURL: dataURL
		};
	}

	addListeners() {
		let originalClientX = null;
		let originalClientY = null;
		let originalOX = null;
		let originalOY = null;
		let moving = false;
		let touchId = false;

		let pinchTouchId = false;
		let pinchClientX = null;
		let pinchClientY = null;
		let pinchStartDistance = null;

		let lastMoveCall = 0;

		this._eMousedown = (e)=>{
				moving = true;
			// console.log(e);

				if (e.touches) {
					if (e.touches.length == 1) {
						// move
						touchId = e.touches[0].identifier;

						originalClientX = e.touches[0].clientX;
						originalClientY = e.touches[0].clientY;
					} else {
						// zoom
						touchId = e.touches[0].identifier;

						originalClientX = e.touches[0].clientX;
						originalClientY = e.touches[0].clientY;

						pinchTouchId = e.touches[1].identifier;
						pinchClientX = e.touches[1].clientX;
						pinchClientY = e.touches[1].clientY;

						let dx = Math.abs(originalClientX - pinchClientX);
						let dy = Math.abs(originalClientY - pinchClientY);
						pinchStartDistance = Math.sqrt(dx*dx+dy*dy);
					}

				} else {

					originalClientX = e.clientX;
					originalClientY = e.clientY;

				}

				originalOY = this._offsetY;
				originalOX = this._offsetX;

			    e.preventDefault();
			};
		this._eMousemove = (e)=>{
			//console.log(e);
			//console.log('mousemove');
			if (!moving) {
				return;
			}

		    const now = (new Date).getTime();
		    if (now - lastMoveCall < 33) { // throttle this sweetie to 30FPS max
				return;
		    }
		    lastMoveCall = now;

			let offsetX = 0;
			let offsetY = 0;
			if (e.touches) {
				if (e.touches.length == 1) {
					// move
					for (let touch of e.touches) {
						if (touch.identifier == touchId) {
							offsetX = touch.clientX - originalClientX;
							offsetY = touch.clientY - originalClientY;
						}
					}
				} else {
					// zoom
					let originalTouch = e.touches[0];
					let pinchTouch = e.touches[1];

					if (originalTouch && pinchTouch && pinchStartDistance) {
						// distance between touches was:
						let dx = Math.abs(originalTouch.clientX - pinchTouch.clientX);
						let dy = Math.abs(originalTouch.clientY - pinchTouch.clientY);
						let curPinchDistance = Math.sqrt(dx*dx+dy*dy);

						if (curPinchDistance > pinchStartDistance) {
							this._zoom*= 1.05;
							this.checkZoomAndRenderImg();
						} else {
							this._zoom*= 0.95;
							this.checkZoomAndRenderImg();
						}
					}
				}
			} else {
				offsetX = e.clientX - originalClientX;
				offsetY = e.clientY - originalClientY;
			}

			if (offsetY && offsetX) {
				this._offsetX = originalOX - offsetX;
				this._offsetY = originalOY - offsetY;
				this.renderImg();
			}

			e.preventDefault();
		};
		this._eMouseup = ()=>{
    		moving = false;
		};
		this._eMousewheel = (e)=>{
			if (e.deltaY > 0) {
				this._zoom*= 1.05;
			} else {
				this._zoom*= 0.95;
			}
			this.checkZoomAndRenderImg();
			e.preventDefault();
		};

		this.$('#crop').addEventListener('mousedown', this._eMousedown, false);
		this.$('#crop').addEventListener('mousemove', this._eMousemove, false);
	    window.addEventListener('mouseup', this._eMouseup, false);
		this.$('#crop').addEventListener('touchstart', this._eMousedown, false);
		this.$('#crop').addEventListener('touchmove', this._eMousemove, false);
	    window.addEventListener('touchend', this._eMouseup, false);
		this.$('#crop').addEventListener('mousewheel', this._eMousewheel);
		this.$('#crop').addEventListener('wheel', this._eMousewheel);
	}

	checkZoomAndRenderImg() {
		if (this._zoom < 10) {
			this._zoom = 10;
		}
		if (this._zoom > 100) {
			this._zoom = 100;
		}
		this.renderImg();
	}

	resizeCanvas(dim) {

		if (!dim) {
			dim = this.$('#crop').offsetWidth;
		}
		this._data.canvasDim = dim;
		this._canvas = this.$('#my_canvas_id');
		this._canvas.style.width = ''+this._data.canvasDim+'px';
		this._canvas.style.height = ''+this._data.canvasDim+'px';

	}

	renderImg() {
		// console.log(this._img);
		// console.log(this._uploadedImageWidth);
		// console.log(this._uploadedImageHeight);
		this._canvas = this.$('#my_canvas_id');
		// console.log(this._canvas);
		var ctx = this._canvas.getContext('2d');
		ctx.canvas.width = this._data.canvasDim;
		ctx.canvas.height = this._data.canvasDim;

		let maxim = Math.min(this._uploadedImageWidth / 2, this._uploadedImageHeight / 2);
		maxim = maxim;

		maxim = maxim * (this._zoom / 100);

		this._cX = this._uploadedImageWidth / 2 + this._offsetX;
		this._cY = this._uploadedImageHeight / 2 + this._offsetY;

		if (this._cX + maxim > this._uploadedImageWidth) {
			this._cX = this._uploadedImageWidth - maxim;
		}
		if (this._cY + maxim > this._uploadedImageHeight) {
			this._cY = this._uploadedImageHeight - maxim;
		}
		if (this._cX - maxim < 0) {
			this._cX = maxim;
		}
		if (this._cY - maxim < 0) {
			this._cY = maxim;
		}

		let area  = maxim*2;

		ctx.drawImage(this._img, this._cX - maxim, this._cY - maxim, area, area, 0, 0, this._data.canvasDim, this._data.canvasDim); // Or at whatever offset you like
	}

	setBGImage(src) {

		this._zoom = 80;
		this._offsetX = 0;
		this._offsetY = 0;

		var img = new Image;
		// img.src = src;

		// var myCanvas = document.getElementById('my_canvas_id');
		// var ctx = myCanvas.getContext('2d');
		// var img = new Image;
		img.onload = ()=>{
			this._img = img; //// @todo: add auto-rotation based on EXIF
			this._uploadedImageWidth = img.width;
			this._uploadedImageHeight = img.height;
			// console.error('rendering');
			// console.error('rendering');
			this.show();
			this.renderImg();
			// ctx.drawImage(img,0,0); // Or at whatever offset you like
		};
		img.src = src;
	}

	template() {
		return `
			<input type="file" id="{{domId}}_fileInput" class="hidden">
			{{if (options.visible)}}
			<div class="imageCropPopup" id="imageCropPopup" tabindex="-1">
				<div class="cropPopup" id="cropPopup">
					<div class="cropPopupContainer">
						<div class="popupIcon" id="{{domId}}_close">{{component(options.components.IconClose)}}{{/component}}</div>
						<h3 id="testh">Drag to Reposition</h3>
						<div id="crop">
							<div id="cropOverlay"></div>
							<canvas id="my_canvas_id"></canvas>
						</div>
						<div class="okButton" id="{{domId}}_okButton">{{component(options.components.IconOk)}}{{/component}}</div>
					</div>
				</div>
			</div>
			{{/if}}
		`;
	}
}

module.exports = EditAvatarPopup;

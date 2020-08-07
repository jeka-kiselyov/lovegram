const UI = window.classes.UI;
const AppIcon = require('../../icons/AppIcon.js');
const Button = window.classes.Button;
const UIInput = window.classes.UIInput;

const Layouter = require('../utils/Layouter.js');

class Upload extends UI {
	constructor(params) {
		super(params);

		this._components.CloseIcon = this.newC(AppIcon, {icon: 'close'});
		this._components.Button = this.newC(Button, {title: 'Send', loadingTitle: 'Sending...'});
		this._components.CaptionInput = this.newC(UIInput, {label: 'Caption'});

		this._events = [
			['click', 'uploadClose', 'onClose'],
			['click', 'uploadPreviewAlbum', 'onAlbumClick'],
		];

		this._componentEvents = [
			['click', 'Button', 'sendFiles'],
		];

		this._files = [];
		this._uploadingMedia = false;
	}

	buttonLoading(loading) {
		if (loading) {
			this.$('.uploadButton').style.display = 'none';
			this.$('.uploadLoading').style.display = 'block';
		} else {
			this.$('.uploadButton').style.display = 'block';
			this.$('.uploadLoading').style.display = 'none';
		}
	}

	sendFiles() {
		this.emit('sendFiles', {files: this._files, caption: this._components.CaptionInput.val()});
		this.buttonLoading(true);
		setTimeout(()=>{
			this.hide();
		}, 2000);
	}

	onClose() {
		this.hide();
	}

	show() {
		this.$('#uploadTop').style.display = 'block';
		this.$('.popupOverlay').classList.add('active');
		this.loaded();
		this.initScrollBarOn(this.$('.uploadPreview'));
	}

	hide() {
		this.$('.popupOverlay').classList.remove('active');
		this.$('.popupOverlay').classList.add('fading');
		setTimeout(()=>{
			this.$('.popupOverlay').classList.remove('fading');
			this.$('#uploadTop').style.display = 'none';
			this.buttonLoading(false);
		}, 500);
	}

	async readFile(inputFile) {
		let readTheData = (ifile, method)=>{
			return new Promise((res, rej)=>{
				let reader = new FileReader();
				reader.onload = (e)=>{
					res(e.target.result);
				}
				reader.onerror = (e)=>{
					rej(e);
				}
				reader.onabort = ()=>{
					rej();
				}
				reader[method](ifile);
			});
		};

		let dims = (ifile)=>{
			return new Promise((res,rej)=>{
				const img = new Image();
				img.onload = function () {
					res([this.width, this.height]);
		        };
		        img.onerror = function() {
		        	res([100,100]); // ???
		        };
		        img.src = ifile.dataURL;
			});
		};

		try {

			let ab = await readTheData(inputFile, 'readAsArrayBuffer');

			let filename = (''+inputFile.name) || 'undefined';
			let ext = (filename.lastIndexOf('.') != -1) ? (filename.substr(filename.lastIndexOf('.') + 1)).toLowerCase() : '';

			let fileData = {
				ab: ab,
				name: inputFile.name,
				size: inputFile.size,
				filename: filename,
				ext: ext,
				type: 'doc',
				aspectRatio: 1,
			};

			// nice one. https://stackoverflow.com/a/20732091/1119169  thanks Andrew!
		    const sizeI = Math.floor( Math.log(fileData.size) / Math.log(1024) );
		    fileData.sizeHuman = ( fileData.size / Math.pow(1024, sizeI) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][sizeI];

		    fileData.color = ((''+ext+' ').charCodeAt(0) % 8 + 1);

			fileData.random = (''+Math.random()).split('.').join('');

			let photoExts = ['png', 'jpg', 'jpeg'];
			let videoExts = ['mp4', 'mpeg', 'avi', 'mov'];

			if (photoExts.indexOf(ext) != -1 && this._uploadingMedia) {
				fileData.type = 'photo';
			} else if (videoExts.indexOf(ext) != -1 && this._uploadingMedia) {
				fileData.type = 'video';
			}

			if (fileData.type == 'photo') {

				// let dataURL = await readTheData(inputFile, 'readAsDataURL'); // ? URL.createObjectURL(file);
				fileData.dataURL = URL.createObjectURL(inputFile);
				[fileData.width, fileData.height] = await dims(fileData); // parallelize?
			} else if (fileData.type == 'video') {
				fileData.width = 100;
				fileData.height = 100;
			}

			this._files.push(fileData);
			return fileData;
		} catch(e) {
			// console.log(e);
			return false;
		}
	}

	loaded() {
		// console.error(this._files);
		this.updateTitle();
		this.generateUploadPreview();
	}

	updateTitle() {
		let suffix = {
			doc: 'File',
			video: 'Video',
			photo: 'Photo',
		};

		let title = 'Send '+( (this._files.length > 1) ? this._files.length : '' ) + ' ' + suffix[this._files[0].type] + ( (this._files.length > 1) ? 's' : '' );
		this.$('.uploadTitle').innerHTML = title;
	}

	onAlbumClick(e) {
		const base = this.$();
		let closest = event.target.closest('.upiRemove');
		if (closest && base.contains(closest)) {
			const el = closest.parentElement;
			if (el) {
				const id = el.id.split('uploadPreviewItem_').join('');
				let ri = null;
				for (let i = 0; i < this._files.length; i++) {
					if (this._files[i].random == id) {
						ri = i;
					}
				}

				if (ri !== null) {
					this._files.splice(ri, 1);
					el.remove();

					if (!this._files.length) {
						this.hide();
					} else {
						this.doCalcs();
						this.updateTitle();
					}
				}
			}
		}
	}

	doCalcs() {
		this._layouter = new Layouter(this._files, {maxWidth: 384});
		this._files = this._layouter.layout();

		for (let file of this._files) {
			const el = this.$('#uploadPreviewItem_'+file.random);
			if (el) {
				el.style.left = '' + file.pos.left + 'px';
				el.style.top = '' + file.pos.top + 'px';
				el.style.width = '' + file.pos.width + 'px';
				el.style.height = '' + file.pos.height + 'px';
			}
		}

		this.$('#uploadPreviewAlbum').style.height = this._layouter._height+'px';
		this.initScrollBarOn(this.$('.uploadPreview'));
	}

	swapItems(id1, id2) {
		if (id1 == id2) {
			return;
		}

		id1 = id1.split('uploadPreviewItem_').join('');
		id2 = id2.split('uploadPreviewItem_').join('');

		let toMove1 = null;
		let i1 = null;
		let toMove2 = null;
		let i2 = null;
		// let insertBeforeI = null;

		for (let i = 0; i < this._files.length; i++) {
			if (this._files[i].random == id1) {
				toMove1 = this._files[i];
				i1 = i;
			}
			if (this._files[i].random == id2) {
				toMove2 = this._files[i];
				i2 = i;
			}
		}

		this._files[i1] = toMove2;
		this._files[i2] = toMove1;

		this.doCalcs();
	}

	async generateVideoPreview(file, tryToSliceLength) {
		let respAB = file.ab;
		if (tryToSliceLength) {
			respAB = file.ab.slice(0, tryToSliceLength);
		}

		let response = new Response(
				respAB,
				{
					status: 206,
					statusText: 'Partial Content',
					headers: [
						['Content-Type', 'video/mp4'],
						['Content-Length', file.ab.byteLength],
						['Content-Range', '0-'+(respAB.byteLength - 1)+'/'+file.ab.byteLength ]]
				});

		let blob = await response.blob();
		let blobUrl = URL.createObjectURL(blob);

		let promise = new Promise((res, rej)=>{
			let video = document.createElement('video');

			video.addEventListener('error', function(event) {
				rej();
			}, true);

			video.onloadeddata = (event) => {
				let width = video.videoWidth;
				let height = video.videoHeight;

				let canvas = document.createElement('canvas');
			    canvas.width = width;
			    canvas.height = height;

			    file.aspectRatio = (height ? (width/height) : 1);
			    file.width = width;
			    file.height = height;

			    this.doCalcs();

			    let ctx = canvas.getContext("2d");
			    ctx.imageSmoothingEnabled = true;
			    ctx.drawImage(video, 0, 0, width, height);

			    let blankCanvas =  document.createElement('canvas');
			    blankCanvas.width = width;
			    blankCanvas.height = height;

			    if (canvas.toDataURL() == blankCanvas.toDataURL()) {
			    	rej();
			    }

			    canvas.toBlob((canvasBlob)=>{
						let canvasBlobUrl = URL.createObjectURL(canvasBlob);
						res(canvasBlobUrl);
			    	});
			};

			video.preload = 'metadata';
			video.src = blobUrl;
			// Load video in Safari / IE11
			video.muted = true;
			video.playsInline = true;
			video.play();
		});

		return await promise;
	}

	generateUploadPreviewForFile(file) {
		const closeHTML = this._components.CloseIcon.render({noDOM: true});

		if (file.type == 'photo') {
			return '<div class="uploadPreviewItem" draggable="true" id="uploadPreviewItem_'+file.random+'"  style="background-image: url(\''+file.dataURL+'\'); '+file.style+'"><div class="upiRemove">'+closeHTML+'</div></div>';
		} else if (file.type == 'video') {
			return '<div class="uploadPreviewItem" draggable="true" id="uploadPreviewItem_'+file.random+'" style="border: 1px solid #eee;"><div class="upiRemove">'+closeHTML+'</div></div>';
		} else if (file.type == 'doc') {
			return `<div class="uploadDocItem">
				<div class="rsDoc">
			 		<div class="rsDocIcon avatarC${file.color}">${file.ext}</div>
			 		<div class="rsDocName">${file.filename}</div>
			 		<div class="rsDocMeta">${file.sizeHuman}</div>
			 	</div>
			</div>`;
		}
	}

	async generateUploadPreview() {
		this.doCalcs();

		let html = '';
		for (let file of this._files) {
			html += this.generateUploadPreviewForFile(file);
		}

		this.$('.uploadPreviewAlbum').innerHTML = html;

		for (let file of this._files) {
			const itemEl = this.$('#uploadPreviewItem_'+file.random);

			if (itemEl) {
			    itemEl.addEventListener('dragstart', (ev)=>{
					ev.dataTransfer.dropEffect = "move";
					ev.dataTransfer.setData("text/plain", ev.target.id);
				});
			 //    itemEl.addEventListener('touchstart', (ev)=>{
			 //    	this._touchedItem = ev.target.id;
				// });
			    itemEl.addEventListener('touchend', (ev)=>{
			    	if (ev.target && ev.target.classList.contains('uploadPreviewItem')) {

				    	if (ev.changedTouches && ev.changedTouches[0]) {
				    		let x = ev.changedTouches[0].clientX;
				    		let y = ev.changedTouches[0].clientY;

				    		for (let file of this._files) {
				    			const cont = this.$('#uploadPreviewItem_'+file.random);
				    			const clientRect = cont.getBoundingClientRect();

				    			if (x > clientRect.left && x < (clientRect.left + clientRect.width) && y > clientRect.top && y < (clientRect.top+clientRect.height)) {
				    				return this.swapItems(cont.id, ev.target.id);
				    			}
				    		}
				    	}
			    	}
			    	// console.error(ev);
				});

				itemEl.addEventListener('dragover', (ev)=>{
					ev.preventDefault();
					ev.dataTransfer.dropEffect = "move";
				});

				itemEl.addEventListener('drop', (ev)=>{
					ev.preventDefault();
					let toId = ev.target.id;
					let fromId = ev.dataTransfer.getData("text/plain");
					this.swapItems(toId, fromId);
				});
			}

			if (itemEl && file.type == 'video' && !file.previewGenerated) {
				let blobUrl = null;
				try {
					blobUrl = await this.generateVideoPreview(file, 256*1024);
				} catch(e) {
					try {
						blobUrl = await this.generateVideoPreview(file, 5*1024*1024);
					} catch(e) {
						try {
							blobUrl = await this.generateVideoPreview(file, 10*1024*1024);
						} catch(e) {
						}
					}
				}

				if (blobUrl) {
					itemEl.style.backgroundImage = "url('"+blobUrl+"')";
				} else {
					itemEl.style.backgroundColor = "black";
				}

				itemEl.innerHTML+= '<div class=playIcon></div>';

				file.previewGenerated = true;
			}
		}
	}

	selectFiles(forMedia) {
		this._uploadingMedia = forMedia;

		let input = this.$('#'+this.domId+'_fileInput_files');
		if (forMedia) {
			input = this.$('#'+this.domId+'_fileInput_media');
		}

		this._files = [];
        input.onchange = ()=>{
        	if (input.files) {
        		let promises = [];
        		for (let inputFile of input.files) {
        			promises.push(this.readFile(inputFile));
        		}

        		Promise.all(promises)
        			.then(()=>{
        				this.show();
        				input.value = '';
        			});
			}
		};
		input.click();
	}

	template() {
		return `
			<div id="uploadTop">
				<div class="popupOverlay">
					<div class="popup">
						<input type="file" id="{{domId}}_fileInput_media" class="hidden"  multiple="multiple" accept="image/*,video/*,.jpg,.png,.mp4">
						<input type="file" id="{{domId}}_fileInput_files" class="hidden"  multiple="multiple">
						<div class="uploadPanel">
							<div class="uploadClose" id="uploadClose">{{component(options.components.CloseIcon)}}{{/component}}</div>
							<div class="uploadButton">{{component(options.components.Button)}}{{/component}}</div>
							<div class="uploadLoading">
								<div class="cssload-zenith dark"></div>
							</div>
							<div class="uploadTitle">Send 3 photos</div>
						</div>

						<div class="uploadPreview">
							<div class="uploadPreviewAlbum" id="uploadPreviewAlbum"></div>
						</div>

						<div class="uploadCaption">
							{{component(options.components.CaptionInput)}}{{/component}}
						</div>
					</div>
				</div>
			</div>
		`;
	}
};

module.exports = Upload;

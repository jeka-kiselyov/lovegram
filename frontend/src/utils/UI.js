const Template = require('./Template.js');
const EventTarget = require('./EventTarget.js');

class UI extends EventTarget {
	constructor(params) {
		super();

		this._user = params.user;
		this._app = params.app;
		this._parent = params.parent;

		this._data = {};
		this._components = {};
		this._domId = ('el'+Math.random()).split('.').join('');
		this._events = [];
		this._componentEvents = [];

		this._eventsAssigned = false;

		if (this.constructor.template) {
			// there's template, pre-compile it
			this._compiledTemplate = Template.Compile(this.constructor.template);
		}

		this._noDiv = false;
	}

	avHTML(peer, className) {
		const selector = '#avatar_'+this._domId+'_'+peer._id;
		let isVisible = false;

		let ih = '';
		if (this._parent._avatarsMemory && this._parent._avatarsMemory[peer._id] && this._parent._avatarsMemoryC[peer._id]) {
			this._parent._avatarsMemoryC[peer._id]--;
			className = className + ' wantmemory';
			// let node = this._parent._avatarsMemory[peer._id].shift();
			// 	console.error('appended cloned', node);
			// // ih = `<div class="avatarBack" style="background-image: url('${peer.getAvatarBlobURLSync()}');"></div>`;
			// isVisible = true;
			// this.nextTick(()=>{
			// 	console.error('appended cloned');
			// 	this.$(selector).appendChild(node);
			// });
		} else {

			if (peer.isMine && peer.isMine()) {
				ih = '<div class="avatarBack avatarMine"></div>';
				isVisible = true;
			} else {
				if (peer.hasAvatar()) {
					ih = `<div class="avatarBack" data-loaded="1" style="background-image: url('${peer.getAvatarBlobURLSync()}');"></div>`;
					isVisible = true;
				} else {
					ih = `<div class="avatarBack panelTopAvatarBack"></div><div class="avatarInitials avatarC${peer.getAvatarColor()}">${peer.getAvatarInitials()}</div>`;
				}

				if (peer._peerUser) {
					let oc = '';
					if (peer._peerUser._isOnline) {
						oc = 'online';
					};
					ih+= `<div class="onlineBadge ${oc}"><div class="dot"></div></div>`;
				}


				if (peer.hasAvatar() === null) {
					// load avatar on the next tick, so we have the time to check out the cache
					setTimeout(()=>{
						// if we loaded it from cache -
						if (peer.getAvatarBlobURLSync()) {
							let blobURL = peer.getAvatarBlobURLSync();
							const cont = this.$(selector);
							if (cont) {
								if (blobURL) {
									const avBack = cont.querySelector('.avatarBack');
									avBack.style.backgroundImage = "url('"+blobURL+"')";
									avBack.dataset.loaded = 1;
								}
								if (!isVisible) {
									cont.classList.add('visible');
								}
							}
						} else {
							// if not - lets load little later so we set html for loaded first
							setTimeout(()=>{
								peer.getAvatarBlobURL()
									.then((blobURL)=>{
										const cont = this.$(selector);
										if (cont) {
											if (blobURL) {
												const avBack = cont.querySelector('.avatarBack');
												avBack.style.backgroundImage = "url('"+blobURL+"')";
												avBack.dataset.loaded = 1;
											}
											if (!isVisible) {
												cont.classList.add('visible');
											}
										}
									});
							}, 20);
						}
					}, 200);
				} else if (!isVisible) {
					this.nextTick(()=>{
						this.$(selector) && this.$(selector).classList.add('visible');
					});
				}
			}
		}

		if (isVisible) {
			className = ''+className+' visible';
		}

		return `
		<div class="${className} avatar" id="avatar_${this._domId}_${peer._id}" data-id="${peer._id}">
			${ih}
		</div>
		`;
	}

	// doAvatar(where, selector) {
	// 	if (where) {
	// 		if (where.hasAvatar() === null) {
	// 			where.getAvatarBlobURL()
	// 				.then((blobURL)=>{
	// 					if (blobURL) {
	// 						this.$(selector).querySelector(' .avatarBack').style.backgroundImage = "url('"+blobURL+"')";
	// 					}
	// 					this.$(selector).classList.add('visible');
	// 				});
	// 		} else {
	// 			this.nextTick(()=>{
	// 				this.$(selector).classList.add('visible');
	// 			});
	// 		}
	// 	}
	// }

	rippleOn(el, e) {
		console.error('ripple on', e);

		// el.classList.remove('rippled');
		// document.querySelectorAll('.ripple').forEach((el)=>{
		// 	el.remove();
		// });

	    const x = e.offsetX;
	    const y = e.offsetY;
	    const w = el.offsetWidth;

	    const ripple = document.createElement('span');

	    ripple.className = 'ripple';
	    // ripple.style.left = x + 'px';
	    // ripple.style.top  = y + 'px';
	    ripple.style.setProperty('--scale', w);

	    el.prepend(ripple);

	    setTimeout(() => {
			// el.classList.add('rippled');
			ripple.parentNode.removeChild(ripple);
	    }, 500);
	}

	escapeHTML(str) {
		return (''+str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
	}

	nl2br(str) {
		return (''+str).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1 <br /> $2');
	}

	initScrollBarOn(container, forceReInit) {
		if (!container) {
			if (this._ps) {
				this._ps.destroy();
				this._ps = null;
			}
			return false;
		}

		if (this._ps && !forceReInit) {
			this._ps.update();
			return true;
		}

		if (this._ps) {
			this._ps.destroy();
		}

		this._ps = new window.classes.PerfectScrollbar(container, {
					wheelSpeed: 1,
					wheelPropagation: false,
					minScrollbarLength: 40,
					suppressScrollX: true,
				});
	}

	async loadJSON(url, noparse) {
		let curl = './tg/'+url;
		if (this._user._protocol) {
			let cached = await this._user._protocol.getCachedResources([{url: curl}]);
			if (cached && cached.length && cached[0].json) {
				return JSON.parse(cached[0].json);
			}
		}

		let reqs = await new Promise((resolve, reject)=>{
	        var oReq = new XMLHttpRequest;
	        oReq.open("GET", url);
	        oReq.onload = function (oEvent) {
	        	resolve(oReq.responseText);
	        };
	        oReq.send();
	    });

	    this._user._protocol.putToCacheAndForget({url: curl, binary: reqs});

	    return JSON.parse(reqs);
	}

	get domId() {
		return this._domId;
	}

	nextTick(f) {
		setTimeout(f, 1);
	}

	debounce(func) {
		let timeout;

		return (function() {
			let later = ()=>{
				timeout = null;
				func.apply(this, arguments);
			};
		    let callNow = !timeout;
		    clearTimeout(timeout);
		    timeout = setTimeout(later, 100);

		    if (callNow) {
		    	func.apply(this, arguments);
		    }
		});
	}

	$(selector) {
		const c = document.getElementById(this.domId);
		if (!selector) {
			return c;
		}
		return (c ? c.querySelector(selector) : null);
	}

	$$(selector) {
		const c = this.$();
		return (c ? c.querySelectorAll(selector) : []);
	}

	newC(cClass, options = {}) {
		options.user = this._user;
		options.app = this._app;
		options.parent = this;
		return new cClass(options);
	}

	assignDomEvents() {
		for (let ev of this._events) {
			let obj = document.getElementById(ev[1]);
			let handler = this[ev[2]];

			if (!ev[3]) {
				if (ev[0] == 'scroll') {
					// debounce scroll
					ev[3] = this.debounce((e)=>{
						handler.call(this, e);
					});
				} else {
					if (ev[0] == 'nodebouncescroll') {
						ev[0] = 'scroll';
					}

					ev[3] = (e)=>{
						handler.call(this, e);
					};
				}
			}

			if (obj && handler) {
				obj.addEventListener(ev[0], ev[3]);
			}
		}

		if (this._components) {
			for (let ci in this._components) {
				if (this._components[ci] && this._components[ci].assignDomEvents) {
					this._components[ci].assignDomEvents();
				}
			}
		}

		for (let cEv of this._componentEvents) {
			let c = this._components[cEv[1]];
			let handler = this[cEv[2]];

			if (!cEv[3]) {
				cEv[3] = (data)=>{
					handler.call(this, data);
				};
			}

			if (c && handler) {
				// c.assignDomEvents();
				c.addEventListener(cEv[0], cEv[3]);
			}
		}
	}

	/**
	 * Set focus to selector's element if device is not touch (it's bad UX on touch devices to display keyboard on start)
	 * @param  {[type]} selector [description]
	 * @return {[type]}          [description]
	 */
	preFocus(selector) {
		if (!this.isTouchDevice()) {
			this.nextTick(()=>{
				const el = this.$(selector);
				if (el) {
					el.focus();
				}
			});
		}
	}

	isTouchDevice() {
		// Thanks bolmaster2 https://stackoverflow.com/a/4819886/1119169
		var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
		var mq = function(query) {
			return window.matchMedia(query).matches;
		}

		if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
			return true;
		}

		// include the 'heartz' as a way to have a non matching MQ to help terminate the join
		// https://git.io/vznFH
		var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
		return mq(query);
	}

	render(params) {
		params = params || {};

		this._data.components = this._components;
		this._data.domId = this._domId;
		this._data.self = this;

		let html = '';
		if (this._compiledTemplate) {
			html = this._compiledTemplate(this._data, Template);
		} else {
			html = Template.Render(this.template(), this._data);
		}

		if (!params.noDOM) {
			// const html = Template.Render(this.template(), this._data);
			const domElement = document.getElementById(this._domId);

			if (domElement) {
				if (html.indexOf('id="'+this._domId+'"') != -1) {
					domElement.outerHTML = html;
				} else {
					domElement.innerHTML = html;
				}
				this.assignDomEvents();
			}

			if (this.afterRender) {
				this.afterRender();
			}
		}

		if (params.withDiv) {
			if (html.indexOf('id="'+this._domId+'"') != -1) {
				// there's domId tag
				return html;
			} else {
				return '<div id='+this._domId+'>'+html+'</div>';
			}
		}

		return html;
	}
}

module.exports = UI;
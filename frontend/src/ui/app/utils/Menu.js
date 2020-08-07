
const AppIcon = require('../../icons/AppIcon.js');
const AppUI = require('../../../utils/AppUI.js');

class Menu extends AppUI {
	constructor(params) {
		super(params);

		this._data.items = params.items;

		this._events = [
			// ['mouseenter', this.domId+'_top', 'onMouseEnter'],
			// ['mouseleave', this.domId+'_top', 'onMouseLeave'],
			['click', this.domId+'_top', 'onClick'],
		];

		this._components = [];
		for (let item of this._data.items) {
			if (!this._components['icon_'+item[1]]) {
				this._components['icon_'+item[1]] = this.newC(AppIcon, {icon: item[1]});
			}
		}

		this._data.offsetX = -37;
		this._data.offsetY = 15;
	}

	onClick(e) {
		const base = this.$('#'+this.domId+'_top');
		const closest = e.target.closest('.menuItem');
		if (closest && base.contains(closest) && closest.dataset.action) {
			this.emit(closest.dataset.action);
			this.emit('action', closest.dataset.action);
			this.hide();
		}
	}

	show(nearMouseEvent, items, className) {
		// if (this.__leaveInterval) {
		// 	clearInterval(this.__leaveInterval);
		// }

		if (items) {
			this._data.items = items;

			console.error(this._data.items);
			for (let item of this._data.items) {
				if (!this._components['icon_'+item[1]]) {
					this._components['icon_'+item[1]] = this.newC(AppIcon, {icon: item[1]});
				}
			}

			this.render();
		}

		this.$('.menuTop').className = 'menuTop'+(className ? (' '+className) : '');

		if (nearMouseEvent && nearMouseEvent.clientX) {
			let windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
			let windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

			let cX = nearMouseEvent.clientX;
			let cY = nearMouseEvent.clientY;
			let tX = cX - 10;
			let tY = cY - 10;

			let menuStyle = 'tl';
			if (cX > windowWidth / 2) {
				if (cY > windowHeight / 2) {
					menuStyle = 'br';
				} else {
					menuStyle = 'tr';
				}
			} else {
				if (cY > windowHeight / 2) {
					menuStyle = 'bl';
				} else {
					menuStyle = 'tl';
				}
			}

			this.$('.menuTop').classList.remove('tl');
			this.$('.menuTop').classList.remove('tr');
			this.$('.menuTop').classList.remove('br');
			this.$('.menuTop').classList.remove('bl');
			this.$('.menuTop').classList.add(menuStyle);

			this.$('.menu').style.bottom = 'auto';
			this.$('.menu').style.right = 'auto';
			this.$('.menuContainer').style.position = 'fixed';
			this.$('.menu').style.position = 'fixed';

			this.$('.menu').style.left = '' + tX + 'px';
			this.$('.menu').style.top = '' + tY + 'px';

			if (menuStyle == 'br' || menuStyle == 'bl') {
				this.$('.menu').style.marginTop = '-'+(46*this._data.items.length)+'px';
			} else {
				this.$('.menu').style.marginTop = '0px';
			}
		}


		this.$('.menuTop').style.display = 'block';
		this.$('.menu').classList.add('active');

		this.mouseupUpG(()=>{
			this.hide();
		});
	}

	hide() {
		if (this.$('.menu')) {
			this.$('.menu').classList.remove('active');
		}
	}

	// onMouseLeave() {
	// 	if (this.__leaveInterval) {
	// 		clearInterval(this.__leaveInterval);
	// 	}
	// 	this.__leaveInterval = setInterval(()=>{
	// 		this.hide();
	// 	}, 100);
	// }

	// onMouseEnter() {
	// 	if (this.__leaveInterval) {
	// 		clearInterval(this.__leaveInterval);
	// 	}
	// 	this.show(true);
	// }

	template() {
		return `
			<div class="menuTop" id="{{domId}}_top">
				<div class="menuContainer">
					<div class="menu" style="bottom: {{offsetY}}px; right: {{offsetX}}px;">
						{{each(options.items)}}
						<div class="menuItem" data-action="{{@this[0]}}">
							<div class="miIcon">{{component(options.components['icon_'+@this[1]])}}{{/component}}</div>
							<div class="mtTitle">{{if (@this[3])}}<div class="scBlockBadge scBlockBadgeVisible scBlockMuted">{{@this[3]}}</div>{{/if}}{{@this[2]}}</div>
						</div>
						{{/each}}
					</div>
				</div>
			</div>
		`;
	}
};

module.exports = Menu;

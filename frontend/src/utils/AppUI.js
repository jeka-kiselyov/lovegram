const UI = window.classes.UI;
const Icon = window.classes.Icon;
const AppIcon = require('../ui/icons/AppIcon.js');

class AppUI extends UI {
	static getIconHTML(icon) {
		if (!AppUI.__iconsCache) {
			AppUI.__iconsCache = {};
		}
		if (AppUI.__iconsCache[icon]) {
			return AppUI.__iconsCache[icon];
		}

		let className = AppIcon;
		if (icon == 'check' || icon == 'eye') {
			className = Icon;
		}
		let c = new className({icon: icon});
		let html = c.render({noDOM: true});

		AppUI.__iconsCache[icon] = html;

		return html;
	}

	mouseupUpG(cb) {
		let es = ['mousedown', 'touchstart'];
		this.__globalMouseupCatchD = new Date();
		this.__globalMouseupCatch = (e) => {

			// console.error(e);
			if (((new Date()).getTime() - this.__globalMouseupCatchD.getTime()) < 200) return;
			if (this.$() && this.$().contains(e.target)) return;
			this.nextTick(()=>{
				es.forEach((e)=>{ document.removeEventListener(e, this.__globalMouseupCatch); });
			});
			cb();
		};
		es.forEach((e)=>{ document.addEventListener(e, this.__globalMouseupCatch); });
	}

	// onSwipe() {
	// 	this._xDown = null;
	// 	this._yDown = null;
	// 	this.__handleTouchStart = (e) => {
	// 		this._xDown = e.touches[0].clientX;
	// 		this._yDown = e.touches[0].clientY;
	// 	};

	// 	this.__handleTouchMove = (e) => {
	// 	    if (!this._xDown || !this._yDown) {
	// 	        return;
	// 	    }

	// 	    let xUp = e.touches[0].clientX;
	// 	    let yUp = e.touches[0].clientY;

	// 	    let xDiff = this._xDown - xUp;
	// 	    let yDiff = this._yDown - yUp;
	// 	    if(Math.abs( xDiff )+Math.abs( yDiff )>150){ //to deal with to short swipes

	// 	    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {most significant
	// 	        if ( xDiff > 0 ) {/* left swipe */
	// 	            alert('left!');
	// 	        } else {/* right swipe */
	// 	            alert('right!');
	// 	        }
	// 	    } else {
	// 	        if ( yDiff > 0 ) {/* up swipe */
	// 	            alert('Up!');
	// 	        } else { /* down swipe */
	// 	            alert('Down!');
	// 	        }
	// 	    }
	// 	    /* reset values */
	// 	    this._xDown  = null;
	// 	    this._yDown = null;
	// 	    }
	// 	};

	// 	document.addEventListener('touchstart', this.__handleTouchStart, false);
	// 	document.addEventListener('touchmove', this.__handleTouchMove, false);
	// }
}

module.exports = AppUI;
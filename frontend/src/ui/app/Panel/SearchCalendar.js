const AppUI = require('../../../utils/AppUI.js');
const Format = require('../../../utils/Format.js');
const Icon = require('../../icons/Icon.js');

class SearchCalendar extends AppUI {
	constructor(params) {
		super(params);

		this._year = 2020;
		this._month = 7;

		this._events = [
			['click', 'calendarPrev', 'onPrev'],
			['click', 'calendarNext', 'onNext'],
			['click', 'calendarItems', 'onClick'],
			['click', 'calendarPopupTop', 'onClickOut'],
		];

		this._components.NavIcon = this.newC(Icon, {icon: 'up'});
	}

	onClickOut(e) {
		let thingsToMiss = ['.popup'];
		for (let thingToMiss of thingsToMiss) {
			if (e.target.closest(thingToMiss)) {
				return false;
			}
		}

		this.hide();
	}

	onClick(e) {
		let closest = e.target.closest('span');
		if (closest.dataset.day && closest.dataset.message) {
			// alert(closest.dataset.message);
			this.emit('messageId', closest.dataset.message);
			this.hide();
		}
	}

	onNext() {
		this.$('#calendarItemsNext').classList.add('gocur');
		this.$('#calendarItemsCurrent').classList.add('goprev');
		setTimeout(()=>{
			this._month++;
			if (this._month > 11) {
				this._month = 0; this._year++;
			}

			this.update();
		}, 500);
	}

	onPrev() {
		this.$('#calendarItemsPrev').classList.add('gocur');
		this.$('#calendarItemsCurrent').classList.add('gonext');
		setTimeout(()=>{
			this._month--;
			if (this._month < 0) {
				this._month = 11; this._year--;
			}
			this.update();
		}, 500);
	}

	update() {
		this.$('#calendarItems').innerHTML = '<div id="calendarItemsPrev"></div><div id="calendarItemsCurrent"></div><div id="calendarItemsNext"></div>';
		this.$('#calendarItemsCurrent').innerHTML = this.getHTML(0);
		this.$('#calendarItemsNext').innerHTML = this.getHTML(1);
		this.$('#calendarItemsPrev').innerHTML = this.getHTML(-1);
	    this.$('#calendarCur').innerText = ''+Format.monthsNames[this._month]+' '+this._year;

	    this._peerManager._activePeer.getDaysMessages(this._month, this._year, (days)=>{
	    	this.daysData(days);
	    });
	}

	daysData(days) {
		// console.error(days); alert(1)
		this.$('#calendarItemsCurrent').querySelectorAll('span').forEach((el)=>{
			try {
				days[el.dataset.day-1].el = el;
			} catch(e) { console.error(e); };
		});
		console.error(days);
		for (let i = 1; i <= days.length; i++) {
			console.error(days[i-1].has);
			days[i-1].el.classList[(days[i-1].has ? 'add':'remove')]('has');
			days[i-1].el.dataset.message = days[i-1].id;
		}
	}

	getHTML(off) {
		const cCell = (n)=>{
			return '<span data-day="'+n+'"><i>'+n+'</i></span>';
		};

		let html = '';
		let firstDay = (new Date(this._year, this._month+off)).getDay() - 1;
		let daysInMonth = 32 - new Date(this._year, this._month+off, 32).getDate();
		let date = 1;
	    for (let i = 0; i < 6; i++) { // rows
	        // cells
	        for (let j = 0; j < 7; j++) {
	            if (i === 0 && j < firstDay) {
	            	html+=cCell('&nbsp;');
	            } else if (date > daysInMonth) {
	                break;
	            } else {
	            	html+=cCell(date++);
	            }

	        }
	    }


	    return html;
	}

	show(params) {
		this._peerManager = params.peerManager;
		this.$('#calendarPopupTop').style.display = 'block';
		this.$('.popupOverlay').classList.add('active');

		this.update();
	}

	hide() {
		this.$('.popupOverlay').classList.remove('active');
		this.$('.popupOverlay').classList.add('fading');
		setTimeout(()=>{
			this.$('.popupOverlay').classList.remove('fading');
			this.$('#calendarPopupTop').style.display = 'none';
		}, 500);
	}

	template() {
		return `
			<div id="calendarPopupTop" style="display: none;">
				<div class="popupOverlay">
					<div class="popup">

						<div id="calendarTitle">Wed, May 27</div>
						<div id="calendarNav">
							<div id="calendarPrev">{{component(options.components.NavIcon)}}{{/component}}</div>
							<div id="calendarCur">May 2020</div>
							<div id="calendarNext">{{component(options.components.NavIcon)}}{{/component}}</div>
						</div>

						<div id="calendarDays">
							<span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
						</div>

						<div id="calendarItems">
						</div>
					</div>
				</div>
			</div>
		`;
	}
}

module.exports = SearchCalendar;
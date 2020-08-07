const EmojiDialogItem = require('./EmojiDialogItem.js');
const AppIcon = require('../../icons/AppIcon.js');

class Emoji extends EmojiDialogItem {
	constructor(params) {
		super(params);
	}

	show() {
		this.init();
	}

	async init() {
		if (await this.sureSingle('init')) return false;

		this._data.mostRecentEmoji = [];
		this._data.emojiData = await this.loadJSON('assets/data/emoji.json');

		this._components['IconSmile'] = this.newC(AppIcon, {icon: 'smile'});

		this._components['IconRecent'] = this.newC(AppIcon, {icon: 'recent'});
		this._components['IconAnimal'] = this.newC(AppIcon, {icon: 'animal'});
		this._components['IconEats'] = this.newC(AppIcon, {icon: 'eats'});
		this._components['IconCar'] = this.newC(AppIcon, {icon: 'car'});
		this._components['IconSport'] = this.newC(AppIcon, {icon: 'sport'});
		this._components['IconLamp'] = this.newC(AppIcon, {icon: 'lamp'});
		this._components['IconFlag'] = this.newC(AppIcon, {icon: 'flag'});

		this._events = [
			['click', 'emojiNav', 'onNavClick'],
			['scroll', 'emojiList', 'onScroll'],
			['click', 'emojiList', 'onClick'],
			['click', 'emojiCats', 'onCatClick'],
		];

		this._data.initialized = true;

		this.render();
		this.initScrollbar();
		this.fulfilSingle('init', true);
	}

	addToMostRecent(emoji) {
		if (this._data.mostRecentEmoji.indexOf(emoji) === -1) {
			this._data.mostRecentEmoji.unshift(emoji);
			this._data.mostRecentEmoji = this._data.mostRecentEmoji.slice(0, 18);
		}

		let html = '';
		for (let re of this._data.mostRecentEmoji) {
			html+='<span>'+re+'</span>';
		}
		this.$('#recentEmoji').innerHTML = html;
		this.calcScrollOffsets(true);
	}

	onClick(e) {
		const base = this.$('#emojiList');
		const closest = e.target.closest('span');

		if (closest && base.contains(closest)) {
			this._parent._parent._components.Panel.onEmoji(closest.innerHTML);
			// this.emit('emoji', closest.innerHTML);
			this.addToMostRecent(closest.innerHTML);
		}
	}

	calcScrollOffsets(forceRecalc) {
		if (this.__emojiDivOffsets && !forceRecalc) {
			return this.__emojiDivOffsets;
		}

		let offsets = [];
		// let parentEl = this.$('#emojiList');
		// let parentOffset = parentEl ? parentEl.offsetTop : 0;
		let parentOffset = 0; // if position: relative

		let emojiDivs = this.$$('.emojiDiv');
		for (let emojiDiv of emojiDivs) {
			let offset = {
				targetName: emojiDiv.dataset.name,
				offsetTop: emojiDiv.offsetTop - parentOffset,
			};

			offsets.push(offset);
		}

		let emojiCats = this.$$('.emojiCat');
		for (let emojiCat of emojiCats) {
			for (let offset of offsets) {
				if (emojiCat.dataset.target == offset.targetName) {
					offset.cat = emojiCat;
				}
			}
		}

		offsets.reverse();
		this.__emojiDivOffsets = offsets;

		return offsets;
	}

	onScroll(e) {
		// this.initScrollbar();
		if (e && e.target) {
			let scrollTop = e.target.scrollTop;

			let offsets = this.calcScrollOffsets();
			let set = false;
			for (let offset of offsets) {
				if (scrollTop >= offset.offsetTop && !set) {
					offset.cat.classList.add('active');
					set = true;
				} else {
					offset.cat.classList.remove('active');
				}
			}

			if (!set) {
				offsets[offsets.length-1].cat.classList.add('active');
			}
		}
	}

	onCatClick(e) {
		const base = this.$('#emojiCats');
		const closest = e.target.closest('.emojiCat');

		if (closest && base.contains(closest)) {
			let targetName = closest.dataset.target;
			let contentDiv = this.$('.emojiList');
			let targetDiv = null;
			let emojiDivs = this.$$('.emojiDiv');

			for (let emojiDiv of emojiDivs) {
				if (emojiDiv.dataset && emojiDiv.dataset.name == targetName) {
					targetDiv = emojiDiv;
				}
			}

			if (targetDiv && contentDiv) {
				// let parentEl = this.$('#emojiList');
				// let parentOffset = parentEl ? parentEl.offsetTop : 0;
				let parentOffset = 0;

				contentDiv.scrollTop = targetDiv.offsetTop - parentOffset;
			}
		}
	}

};

Emoji.template = `
		{{if (options.initialized)}}
		<div class="emojiCats active" id="emojiCats">
			<div data-target="Recent" class="emojiCat">{{component(options.components.IconRecent)}}{{/component}}</div>
			<div data-target="Smileys & Emotion" class="emojiCat">{{component(options.components.IconSmile)}}{{/component}}</div>
			<div data-target="Animals & Nature" class="emojiCat">{{component(options.components.IconAnimal)}}{{/component}}</div>
			<div data-target="Food & Drink" class="emojiCat">{{component(options.components.IconEats)}}{{/component}}</div>
			<div data-target="Travel & Places" class="emojiCat">{{component(options.components.IconCar)}}{{/component}}</div>
			<div data-target="Activities" class="emojiCat">{{component(options.components.IconSport)}}{{/component}}</div>
			<div data-target="Objects" class="emojiCat">{{component(options.components.IconLamp)}}{{/component}}</div>
			<div data-target="Flags" class="emojiCat">{{component(options.components.IconFlag)}}{{/component}}</div>
		</div>
		<div class="emojiList active emojiScroll" id="emojiList">
				<div data-name="Recent" class="emojiDiv">
					<h5>Recent</h5>

					<div id="recentEmoji">
					{{each(options.mostRecentEmoji)}}
						<span>{{@this}}</span>
					{{/each}}
					</div>
				</div>
			{{foreach(options.emojiData)}}
				<div data-name="{{@key}}" class="emojiDiv">
					<h5>{{@key}}</h5>
					{{each(@this)}}<span>{{@this}}</span>{{/each}}
				</div>
			{{/foreach}}
		</div>
		{{#else}}
		<div class="appLoading">
			<div class="cssload-zenith dark"></div>
		</div>
		{{/if}}
		`;

module.exports = Emoji;
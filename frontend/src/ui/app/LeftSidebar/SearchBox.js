const UI = window.classes.UI;
const AppIcon = require('../../icons/AppIcon.js');

class SearchBox extends UI {
	constructor(params) {
		super(params);

		this._components = {
			Icon: this.newC(AppIcon, {icon: 'search'}),
		};

		this._events = [
			['keydown', this._domId+'_search_input', 'onSearch'],
			['blur', this._domId+'_search_input', 'onSearch']
		];
		this._searchQ = '';
		this._data.placeholder = 'Search';
	}

	focus() {
		this.$('#'+this._domId+'_search_input').focus();
	}

	setPlaceholder(v) {
		this._data.placeholder = v;
		this.$('#'+this._domId+'_search_input').placeholder = v;
	}

	onSearch() {
		this.nextTick(()=>{
			let val = this.$('#'+this._domId+'_search_input').value;
			if (val != this._searchQ) {
				this._searchQ = val;
				this.emit('search', val);
			}
		});
	}

	setActive(active) {
		if (active) {
			this.$('.searchBox').classList.add('active');
		} else {
			this.$('.searchBox').classList.remove('active');
			this.$('#'+this._domId+'_search_input').value = '';
		}
	}

	template() {
		return `
			<div class="searchBox">
				<div class="searchIcon">{{component(options.components.Icon)}}{{/component}}</div>
				<div class="searchInput">
					<input type="text" id="{{domId}}_search_input" placeholder="{{placeholder}}">
				</div>
			</div>
		`;
	}
};

module.exports = SearchBox;

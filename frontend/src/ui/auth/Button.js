const UI = require('../../utils/UI.js');

class Buttton extends UI {
	constructor(params) {
		super(params);


		this._data = {
			data: 'some',
			title: params.title || 'Next',
			loadingTItle: params.loadingTitle || 'Please wait...',
			showhidden: true
		};
		// this._domId = 'button'; // should be auto-generated
		this._events = [
			['click', 'the_button_'+this._domId, 'onClick']
		];
	}

	setTitle(title) {
		this._data.title = title;
	}

	setLoading(loading = true) {
		try {
			if (loading) {
				this.$('.buttonTitle').innerHTML = this._data.loadingTItle;
				this.$().classList.add('loadingButton');
			} else {
				this.$('.buttonTitle').innerHTML = this._data.title;
				this.$().classList.remove('loadingButton');
			}
		} catch(e) {}
	}

	data(name, value) {
		this._data[name] = value;
		this.render();
	}

	onClick() {
		this.emit('click');
	}

	template() {
		return `
			<div class="button">
				<div class="buttonBorder" id="the_button_{{domId}}">
					<span class="buttonTitle">{{title}}</span>
					<div class="cssload-container"><div class="cssload-zenith"></div></div>
				</div>
			</div>
		`;
			// <input type="button" value="test" id="realbutton">
	}
};

module.exports = Buttton;

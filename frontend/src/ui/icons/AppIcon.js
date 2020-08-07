const UI = window.classes.UI;

class AppIcon extends UI {
	constructor(params) {
		super(params);
		// this._flip = params.flip || false;

		this._data.icon = params.icon || 'up';
		// this._data.flip = this._flip;
		//
	}

	d(icon) {
		return AppIcon.json[icon];
	}

	static async load(user) {
		if (AppIcon.json) return true;
		let i = new AppIcon({user: user});
		AppIcon.json = await i.loadJSON('assets/data/icons.json');
		// console.error(AppIcon.json);
	}
};

AppIcon.template = `
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {{if(options.flip)}}class="flip"{{/if}}>
				<g fill="none" fill-rule="evenodd">
					{{if (options.icon=='2checks')}}
				    <polygon points="0 0 19 0 19 14 0 14"/>
					{{#else}}
					<polygon points="0 0 24 0 24 24 0 24"/>
					{{/if}}
					<path fill="#000" fill-rule="nonzero" d="{{self.d(options.icon)}}"/>
    			</g>
			</svg>
		`;

module.exports = AppIcon;




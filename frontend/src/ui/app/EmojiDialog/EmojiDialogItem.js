const AppUI = require('../../../utils/AppUI.js');

class EmojiDialogItem extends AppUI {
	constructor(params) {
		super(params);
	}

	initScrollbar() {
		this._ps = new window.classes.PerfectScrollbar(this.$('.emojiScroll'), {
			wheelSpeed: 1,
			wheelPropagation: false,
			minScrollbarLength: 40,
			suppressScrollX: true,
		});
	}

	hidden() {

	}
}

module.exports = EmojiDialogItem;

const RightSidebarAbstract = require('./RightSidebarAbstract.js');
const AppIcon = require('../../../icons/AppIcon.js');
// const Checkbox = window.classes.Checkbox;

const RightSidebarMedia = require('./RightSidebarMedia.js');
const RightSidebarDocs = require('./RightSidebarDocs.js');
const RightSidebarAudio = require('./RightSidebarAudio.js');
const RightSidebarWebpages = require('./RightSidebarWebpages.js')

class RightSidebarInfo extends RightSidebarAbstract {
	constructor(params) {
		super(params);

		this._components = {
			InfoIcon: this.newC(AppIcon, {icon: 'info'}),
			UsernameIcon: this.newC(AppIcon, {icon: 'username'}),
			// Checkbox: this.newC(Checkbox),

			RightSidebarMedia: this.newC(RightSidebarMedia),
			RightSidebarDocs: this.newC(RightSidebarDocs),
			RightSidebarAudio: this.newC(RightSidebarAudio),
			RightSidebarWebpages: this.newC(RightSidebarWebpages),
		};
		this._componentEvents = [
			// ['initScroll', 'RightSidebarMedia', 'reInitScroll'],
		];
		this._data = {
		};
		this._events = [
			['click', 'rsInfoBlocksNavs', 'onNavClick'],
		];

		this._targets = ['Media', 'Docs', 'Audio', 'Webpages'];
		this._data.defaultTarget = this._app._config.getSetting('rightSidebarInfoDefTarget', 'Media');


		window.addEventListener('resize', ()=>{
			this.afterRender();
		});
	}

	onNavClick(e) {
		const base = this.$('#rsInfoBlocksNavs');
		const closest = e.target.closest('.rsInfoBlocksNav');

		if (closest && base.contains(closest)) {
			let target = closest.dataset.target;
			this.switchInfoBlock(target);
		}
	}

	switchInfoBlock(target) {
		if (!target) {
			target = this._app._config.getSetting('rightSidebarInfoDefTarget');
		}

		// let targets = ['Media', 'Docs', 'Audio', 'Webpages'];
		for (let pTarget of this._targets) {
			if (pTarget == target) {
				this.$('#rs'+pTarget).classList.add('active');
				this._components['RightSidebar'+pTarget].setVisible();
				this._app._config.setSetting('rightSidebarInfoDefTarget', pTarget);
				this._data.defaultTarget = pTarget;
				// this._components['RightSidebar'+pTarget].reinitScrollBar();
			}  else {
				this.$('#rs'+pTarget).classList.remove('active');
			}
		}

		let navItems = this.$$('.rsInfoBlocksNav');
		for (let navItem of navItems) {
			if (navItem.dataset && navItem.dataset.target == target) {
				navItem.classList.add('active');
			} else {
				navItem.classList.remove('active');
			}
		}
	}

	afterRender() {
		this.nextTick(()=>{
			if (this._data.peer) {
				this._data.peer.getFullInfo()
					.then((fullInfo)=>{
						this.updateWithFullInfo(fullInfo);

						let container = this.$('#rsInfoBlocks');
						let topContainer = this.$('#rightSidebarInfo');
						if (container && topContainer) {
							container.style.height = '' +(topContainer.offsetHeight - container.offsetTop) + 'px';

							for (let pTarget of this._targets) {
								this._components['RightSidebar'+pTarget].reinitScrollBar();
							}
						}

						this.switchInfoBlock();
					});
			}
			// setInterval(()=>{
			// 	this._ps.update();
			// }, 1000);
		});
		// if (this.$('#rsInfoBlocks')) {

		// 	setInterval(()=>{
		// 		this._ps.update();
		// 	}, 1000);
		// }
	}

	setPeer(peer) {
		if (this._data.peer && this._data.peer._id == peer._id) {
			return false;
		}

		for (let pTarget of this._targets) {
			this._components['RightSidebar'+pTarget].setPeer(peer);
		}


		// this._components.RightSidebarMedia.setPeer(peer);
		// this._components.RightSidebarDocs.setPeer(peer);
		// this._components.RightSidebarAudio.setPeer(peer);
		this._data.peer = peer;

		// this._data.peer.getFullInfo()
		// 	.then((fullInfo)=>{
		// 		this.updateWithFullInfo(fullInfo);
		// 		this.workOnPeerAvatar();
		// 	});
	}

	updateWithFullInfo(fullInfo) {
		let fields = ['about', 'username'];

		for (let field of fields) {
			if (fullInfo[field]) {
				this.$('.rsInfoItem_'+field).querySelector('.rsiValue').innerHTML = this.nl2br(this.escapeHTML(fullInfo[field]));
				this.$('.rsInfoItem_'+field).style.display = 'block';
			} else {
				this.$('.rsInfoItem_'+field).style.display = 'none';
			}
		}
	}

	template() {
		return `
			<div class="rightSidebarInfo rightSidebarBlock {{if (options.active)}} active{{/if}}" id="rightSidebarInfo">
				<div class="rsInfoProfile">
					<div class="rsInfoAvatar">

						{{self.avHTML(options.peer, 'panelTopAvatar avatarHuge')|safe}}

					</div>
					<div class="rsInfoName">{{peer.getDisplayName()}}</div>
					{{js(options.infoString = options.peer.getInfoString())/}}
					<div class="rsInfoStatus {{if (options.infoString == 'online')}}rsInfoStatusOnline{{/if}}">{{infoString}}</div>
				</div>

				<div class="rsInfoItems">
					<div class="rsInfoItem rsInfoItem_about" {{if (!options.peer._fullInfo || ! options.peer._fullInfo.about)}}style="display: none;"{{/if}}>
						<div class="rsiIcon">{{component(options.components.InfoIcon)}}{{/component}}</div>
						<div class="rsiValue">{{if (options.peer._fullInfo && options.peer._fullInfo.about)}}{{peer._fullInfo.about|nl2br}}{{/if}}&nbsp;</div>
						<div class="rsiField">Bio</div>
					</div>
					<div class="rsInfoItem rsInfoItem_username" {{if (!options.peer._fullInfo || ! options.peer._fullInfo.username)}} style="display: none; background: red;" {{/if}}>
						<div class="rsiIcon">{{component(options.components.UsernameIcon)}}{{/component}}</div>
						<div class="rsiValue">{{if (options.peer._fullInfo && options.peer._fullInfo.username)}}{{peer._fullInfo.username}}{{/if}}&nbsp;</div>
						<div class="rsiField">Username</div>
					</div>
				</div>

				<div class="rsInfoBlocksNavs" id="rsInfoBlocksNavs">
					<div class="rsInfoBlocksNav" data-target="Media">Media</div>
					<div class="rsInfoBlocksNav" data-target="Docs">Docs</div>
					<div class="rsInfoBlocksNav" data-target="Audio">Audio</div>
					<div class="rsInfoBlocksNav active" data-target="Webpages">Links</div>
				</div>

				<div class="rsInfoBlocks" id="rsInfoBlocks">
					<div class="rsInfoBlock" id="rsMedia">{{component(options.components.RightSidebarMedia)}}{{/component}}</div>
					<div class="rsInfoBlock" id="rsDocs">{{component(options.components.RightSidebarDocs)}}{{/component}}</div>
					<div class="rsInfoBlock" id="rsAudio">{{component(options.components.RightSidebarAudio)}}{{/component}}</div>
					<div class="rsInfoBlock active" id="rsWebpages">{{component(options.components.RightSidebarWebpages)}}{{/component}}</div>
				</div>

			</div>
		`;
	}
};

module.exports = RightSidebarInfo;
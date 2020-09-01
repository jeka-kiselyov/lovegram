const RightSidebarAbstract = require('./RightSidebarAbstract.js');
const Icon = window.classes.Icon;
const PeerBlock = require('../../LeftSidebar/PeerBlock.js');

class RightSidebarPoll extends RightSidebarAbstract {
	constructor(params) {
		super(params);
		this._data.isLoading = true;

		this._components.IconDown = this.newC(Icon, {flip: true});

		this._events = [
			['click', 'sfpPoll'+this.domId, 'onMore'],
		];
	}

	onMore(e) {
		let uniq = e.target.closest('.scBlock').dataset.more;
		for (let answer of this._data.poll._answers) {
			if (answer.uniq == uniq) {
				this.loadMore(answer);
			}
		}
	}

	async setParams(params) {
		if (this._data.poll && this._data.poll._id == params.poll._id) return;

		this._data.poll = params.poll;

		this._data.isLoading = true;
		this.render();
		this._rendered = {};

		await this._data.poll.fetch();

		let promises = [];
		for (let answer of this._data.poll._answers) {
			promises.push(this._data.poll.getPollVotes(answer));
		}

		await Promise.all(promises);

		this._data.isLoading = false;
		this.render();

		this.updateDOM();
	}

	updateDOM() {
		for (let answer of this._data.poll._answers) {
			if (!this._rendered[answer.uniq]) this._rendered[answer.uniq] = {};
			this.updateAnswer(answer);
		}
		this.initScrollBarOn(this.$('.rightSidebarBlock'), true);
	}

	updateAnswer(answer) {
		const cont = this.$('#rspAnswer_'+answer.uniq);
		cont.querySelector('.pc').innerHTML = ''+answer.percents+'%';

		let html = '';
		try {
			for (let user of this._data.poll._votesList[answer.uniq]) {
				if (!this._rendered[answer.uniq][user._id]) {
					console.error(user);

					// should be added
					const c = this.newC(PeerBlock, {peer: user, info: ' '});
					html+=c.render({withdiv: true, noDOM: true});
					this._rendered[answer.uniq][user._id] = true;
				}
			}

		} catch(e) { }

		if (html) {
			cont.querySelector('.sfpFoldersList_include').insertAdjacentHTML('beforeend', html);
		}

		const morecont = cont.querySelector('.scBlockMore_include');
		let c = answer.voters; // @todo - minus count shown

		// console.error(this.$('.sfpFoldersList_include'));

		c-=cont.querySelector('.sfpFoldersList_include').querySelectorAll('.scBlock').length;

		let t = 'Show '+c+' more voter'+(c > 1 ? 's' : '');
		morecont.querySelector('.pmore').innerHTML = t;
		morecont.classList[(c > 0 ? 'add' : 'remove')]('visible');
	}

	async setActive(active = true) {
		this._data.active = active;
		this.$('.rightSidebarBlock').classList[active ? 'add' : 'remove']('active');
	}

	async loadMore(answer) {
		await this._data.poll.getPollVotes(answer);
		this.updateAnswer(answer);
	}

	afterRender() {
		// console.error('poll afterRender ');
	}

	template() {
		return `
			<div class="rightSidebarPoll rightSidebarBlock {{if (options.active)}} active{{/if}}" id="rightSidebarPoll">
				{{if (options.isLoading)}}
				<div class="appLoading">
					<div class="cssload-zenith dark"></div>
				</div>
				{{#else}}
					<h1>{{poll.question}}</h1>

					<div id="sfpPoll{{domId}}">
					{{each(options.poll._answers)}}
					<div class="sfpFolders sfpFoldersManage" id="rspAnswer_{{@this.uniq}}">
						<h4>{{@this.text}}<span class="pc">75%</span></h4>

						<div class="sfpFoldersList">
							<div class="sfpFoldersList_include">

							</div>
						</div>

						<div class="scBlock scBlockMore scBlockMore_include scBlockType" id="rspMore_{{@this.uniq}}" data-more="{{@this.uniq}}">
							<div class="scBlockIcon">{{component(options.components.IconDown)}}{{/component}}</div>
							<div class="scBlockMessage">
								<div class="scBlockTitle pmore"></div>
							</div>
						</div>

					</div>
					{{/each}}
					</div>


				{{/if}}
			</div>
		`;
	}
};

module.exports = RightSidebarPoll;
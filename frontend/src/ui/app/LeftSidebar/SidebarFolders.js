const SidebarAbstract = require('./SidebarAbstract.js');

class SidebarFolders extends SidebarAbstract {
	constructor(params) {
		super(params);

		this._title = 'Chat Folders';

		this._events = [
			['click', 'sfpFolders', 'onFolder'],
			['click', 'sfpCreate', 'onNew'],
		];
		this._suggested = [];
	}


	onNew() {
		this._parent.showBlock('ManageFolder', {folder: this._peerManager.getEmptyFolder()});
	}

	onFolder(e) {
		let id = e.target.closest('.sfpFolder').dataset.id;
		if (id.indexOf('rec_') != -1) {
			// create recommended
			// console.error(this._suggested);
			// alert(id);

			// console.error(this._suggested[id.split('rec_').join('')].filter);
			id = id.split('rec_').join('');
			console.error(this._suggested);

			// const filter = this._suggested[id.split('rec_').join('')].filter;
			// this._peerManager.createSuggestedFolder(filter);
			// Dialog
			// this._peerManager.
			for (let i = 0; i < this._suggested.length; i++) {
				if (this._suggested[i].filter.id == id) {
					const filter = this._suggested[i].filter;
					this._suggested.splice(i, 1);
					filter.id = 0;
					this._peerManager.createSuggestedFolder(filter);
					break;
				}
			}
			e.target.closest('.sfpFolder').remove();
		} else {
			// edit existing
			this._parent.showBlock('ManageFolder', {folder: this._peerManager._folders[id]});
		}
	}

	async init() {
		if (await this.sureSingle('init')) return;

		this._suggested = await this._peerManager.getSuggestedFolders();

		// console.error(this._suggested);

		// this._peerManager.on('folders',()=>{
		// 	this.updateFolders();
		// });


		this._data.active = true;
		this.render();

		this.loadTGS('Folders_1');

		this._peerManager.on('folders',()=>{
			this.updateFolders();
		});

		this.updateFolders();

		this.fulfilSingle('init', true);
	}

	getFolderHTML(folder) {
		return '<div class="sfpFolder scBlock" id="sfpFolder_'+folder._id+'" data-id="'+folder._id+'"><span>'+this.escapeHTML(folder.title)+'</span><div class="sfpDesc">'+folder.info+'</div></div>';
	}

	updateFolders() {
		let cont = this.$('.sfpFoldersList');

		const fthere = [];
		for (let id in this._peerManager._folders) {
			if (id != 1) { // skip archived
				const folder = this._peerManager._folders[id];
				const icont = this.$('#sfpFolder_'+id);
				if (icont) {
					// @todo: update title
					icont.querySelector('span').innerHTML = this.escapeHTML(folder.title);
					icont.querySelector('.sfpDesc').innerHTML = folder.info;
				} else {
					cont.insertAdjacentHTML('beforeend', this.getFolderHTML(folder));
				}
				fthere.push(id);
			}
		}

		console.error('showing', fthere);

		this.$$('.sfpFolder').forEach((el)=>{
		console.error('showing', el);
			if (el.id.indexOf('rec_') == -1 && fthere.indexOf(el.dataset.id) == -1) {
				el.remove();
			}
		});

		cont = this.$('.sfpRecommendedList');
		for (let su of this._suggested) {
			if (this.$('#sfpFolder_rec_'+su.filter.id)) {
			} else {
				cont.insertAdjacentHTML('beforeend', this.getFolderHTML({_id: ('rec_'+su.filter.id), title: su.filter.title, info: su.description}));
			}
		}
	}

	afterActive() {
		this.nextTick(()=>{
			this.init();
		});
		// alert(1)
	}

	template() {
		return `
			<div class="sidebarFolders sidebarBlock {{if (options.active)}} active{{/if}}" id="sidebarFolders">
			{{if (!options.active)}}
				<div class="appLoading">
					<div class="cssload-zenith dark"></div>
				</div>
			{{#else}}
				<div class="sidebarScroll">
					<div class="sfpIcon tgs"></div>
					<div class="sfpInfo">Create folders for different groups of chats<br>and quickly switch between them.</div>
					<div class="sfpCreate" id="sfpCreate">
						<div class="sfpCreateIcon">{{self.AppUI.getIconHTML('plus')|safe}}</div>
						Create Folder
					</div>
					<div id="sfpFolders">
					<div class="sfpFolders">
						<h4>Folders</h4>
						<div class="sfpFoldersList">

						</div>
					</div>
					<div class="sfpRecommended">
						<h4>Recommended folders</h4>

						<div class="sfpRecommendedList">

						</div>
					</div>
					</div>
				</div>
			{{/if}}
			</div>
		`;
	}
};

module.exports = SidebarFolders;
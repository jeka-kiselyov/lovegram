const SidebarAbstract = require('./SidebarAbstract.js');
const UIInput = window.classes.UIInput;
const PeerBlock = require('./PeerBlock.js');
const Icon = window.classes.Icon;

class ManageFolder extends SidebarAbstract {
	constructor(params) {
		super(params);
		this._back = 'Folders';
		this._title = 'Folders';

		this._components.Title = this.newC(UIInput, {label: 'Folder Name'});

		this._components.IconDown = this.newC(Icon, {flip: true})

		this._events = [
			['click', 'scBlockAdd'+this._domId, 'onInclude'],
			['click', 'scBlockMore_include'+this._domId, 'onInclude'],
			['click', 'scBlockRemove'+this._domId, 'onExclude'],
			['click', 'scBlockMore_exclude'+this._domId, 'onExclude'],
		];


		// this._components.include = [];
		// this._components.exclude = [];

	}

	async onMenu(action) {
		if (action == 'delete') {
			await this._folder.remove();
			this._parent.onBurger();
		}
	}

	afterUnActive(params) {
		this.persist();
		// alert(1)
	}

	onOk() {
		// this.persist();
		this._parent.onBurger();
	}

	onExclude() {
		this._parent.showBlock('FolderPeers', {folder: this._folder, exclude: true});
	}

	onInclude() {
		this._parent.showBlock('FolderPeers', {folder: this._folder});
	}

	persist() {
		if (this._folder) {

			this._folder._apiObject.title = this._components.Title.val();
			this._folder.persist();
		}
	}

	async init(params = {}) {
		if (params.folder) {
			this._folder = params.folder;
		} else {
			// we are here back from folder peers
			this.persist();
		}
		// if (await this.sureSingle('init')) return;

		// this._suggested = await this._peerManager.getSuggestedFolders();

		// console.error(this._suggested);

		// this._peerManager.on('folders',()=>{
		// 	this.updateFolders();
		// });


		this._data.active = true;

		this._cs = {
			include: {},
			exclude: {},
		};

		this.render();

		this.loadTGS('Folders_2', true);

		this._components.Title.val(this._folder.title);
		this._parent.setTitle((this._folder._id ? 'Edit' : 'New')+' Folder', true, (this._folder._id ? [['delete', 'delete', 'Delete Folder']]: false));

		// this.updateFolders();

		// this.fulfilSingle('init', true);
	}

	async rerender() {
		const peers = await this._folder.getPeers();
		let posa = ['bots', 'contacts', 'non_contacts','groups','broadcasts'];
		let cnt = 0;

		const upMore = (ref, cont) => {
			cont.style.display = (ref.length ? 'block' : 'none');
			cont.querySelector('.scBlockTitle').innerHTML = 'Show '+ref.length+' more chat'+(ref.length > 1 ? 's' : '');
		}

		const upd = (ref, cont) => {
			let cnt = 0;
			for (let pa of posa) {
				if (!ref[pa] && this._folder._apiObject.pFlags[pa]) {
					// add pa
					const c = this.newC(PeerBlock, {type: pa.split('exclude_').join('')});
					// this._components.include.push(c);
					ref[pa] = c;
					cnt++;
					cont.insertAdjacentHTML('beforeend', c.render({withdiv: true, noDOM: true}));
				} else if (ref[pa]) {
					if (!this._folder._apiObject.pFlags[pa]) {
						// remove pa
						this.$('#'+ref[pa]._domId).remove();
						// for (let i = 0; i < this._components.include.length; i++) {
						// 	if (this._components.include[i]._domId == this._cs.include[pa]._domId) {
						// 		this._components.include.splice(i, 1); break;
						// 	}
						// }
						delete ref[pa];
					} else {
						cnt++;
					}
				}
			}

			return cnt;
		}

		cnt = upd(this._cs.include, this.$('.sfpFoldersList_include'));
		upMore(this._folder._apiObject.include_peers, this.$('.scBlockMore_include'));

		// console.error(this._folder._apiObject);
		// for (let pa of posa) {
		// 	if (!this._cs.include[pa] && this._folder._apiObject.pFlags[pa]) {
		// 		// add pa
		// 		const c = this.newC(PeerBlock, {type: pa});
		// 		// this._components.include.push(c);
		// 		this._cs.include[pa] = c;
		// 		this.$('#sfpFoldersList_include').insertAdjacentHTML('beforeend', c.render({withdiv: true, noDOM: true}));
		// 	} else if (this._cs.include[pa] && !this._folder._apiObject[pa]) {
		// 		// remove pa
		// 		this.$('#'+this._cs.include[pa]._domId).remove();
		// 		// for (let i = 0; i < this._components.include.length; i++) {
		// 		// 	if (this._components.include[i]._domId == this._cs.include[pa]._domId) {
		// 		// 		this._components.include.splice(i, 1); break;
		// 		// 	}
		// 		// }
		// 		delete this._cs.include[pa];
		// 	}
		// }

		posa = ['exclude_muted','exclude_read','exclude_archived'];

		upd(this._cs.exclude, this.$('.sfpFoldersList_exclude'));
		upMore(this._folder._apiObject.exclude_peers, this.$('.scBlockMore_exclude'));

		this.reinitScrollBar(true);
		// add peers if < 5
	}

	afterRender() {
		if (!this._data.active) return;
		this.rerender();

		setTimeout(()=>{
			this.rerender();
		}, 2000);

		// const upList = (ref)=>{
		// 	const items = this._folder._apiObject[ref+'_peers'];
		// 	const cont = this.$('#sfpFoldersList_'+ref);
		// };

		// upList('include')
		// upList('exclude');
	}

	afterActive(params) {
		this.nextTick(()=>{
			this.init(params);
		});
		// alert(1)
	}

	template() {
		return `
			<div class="manageFolder sidebarBlock {{if (options.active)}} active{{/if}}" id="manageFolder_{{domId}}">
			{{if (!options.active)}}
				<div class="appLoading">
					<div class="cssload-zenith dark"></div>
				</div>
			{{#else}}
				<div class="sidebarScroll">
					<div class="sfpIcon tgs"></div>
					<div class="sfpInfo">Choose chats and types of chats that will<br> appear and never appear in this folder.</div>
					<div class="sfpTitle">{{component(options.components.Title)}}{{/component}}</div>

					<div class="sfpFolders sfpFoldersManage">
						<h4>Included chats</h4>

						<div class="scBlock scBlockAdd scBlockType"  id="scBlockAdd{{domId}}">
							<div class="scBlockIcon">{{self.AppUI.getIconHTML('plus')|safe}}</div>
							<div class="scBlockMessage">
								<div class="scBlockTitle">Add Chats</div>
							</div>
						</div>

						<div class="sfpFoldersList">
							<div class="sfpFoldersList_include">

							</div>
						</div>

						<div class="scBlock scBlockMore scBlockMore_include scBlockType"  id="scBlockMore_include{{domId}}">
							<div class="scBlockIcon">{{component(options.components.IconDown)}}{{/component}}</div>
							<div class="scBlockMessage">
								<div class="scBlockTitle"></div>
							</div>
						</div>

					</div>

					<div class="sfpFolders sfpFoldersManage">
						<h4>Excluded chats</h4>

						<div class="scBlock scBlockRemove scBlockType" id="scBlockRemove{{domId}}">
							<div class="scBlockIcon">{{self.AppUI.getIconHTML('delete')|safe}}</div>
							<div class="scBlockMessage">
								<div class="scBlockTitle">Remove Chats</div>
							</div>
						</div>

						<div class="sfpFoldersList">
							<div class="sfpFoldersList_exclude">

							</div>
						</div>

						<div class="scBlock scBlockMore scBlockMore_exclude scBlockType"  id="scBlockMore_exclude{{domId}}">
							<div class="scBlockIcon">{{component(options.components.IconDown)}}{{/component}}</div>
							<div class="scBlockMessage">
								<div class="scBlockTitle">Show 18 more chats</div>
							</div>
						</div>
					</div>


				</div>

			{{/if}}
			</div>
		`;
	}
};

module.exports = ManageFolder;
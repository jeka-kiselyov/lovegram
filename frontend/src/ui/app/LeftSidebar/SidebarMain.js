
const SidebarAbstract = require('./SidebarAbstract.js');
const SidebarDialogs = require('./SidebarDialogs.js');
// const AppIcon = require('../../icons/AppIcon.js');

class SidebarMain extends SidebarAbstract {
	constructor(params) {
		super(params);

		this._components = {
			SidebarDialogs: this.newC(SidebarDialogs, {active: true, filter: (peer)=>{ return (peer && !peer.isArchived()); } }),
			folders: {},
		};

		this._events = [
			['click', 'smFolders', 'onFolder'],
			// ['click', 'cTop', 'onTest'],
		];

		this._peerManager.on('folders', ()=>{
			setTimeout(()=>{
				this.folders();
			}, 20);
		});
		this._renderedFolders = {};

		this._peerManager.on('folder',(params)=>{
			if (this._peerManager._folders[params.folderId]._isRemoved) {
				this.removeFolder(params.folderId);
			} else if (!this._renderedFolders[params.folderId]) {
				this.folders();
			}
		});
		this._peerManager.on('initialPeer',(params)=>{
			if (!this.isTouchDevice()) {
				// if we are on desktop
				this.setActivePeer(params.peer);
				this._app._interface.onPeerSelected({peer: params.peer});
			}
		});

		this._components.SidebarDialogs.setActive(true);
		this._updateBadgeTO = {};
	}

	async updateBadge(folder) {
		if (!folder) {
			// update all folders badges
			const a = []; for (let i in this._renderedFolders) { a.push(this.updateBadge(this._peerManager._folders[i])); }
			return await Promise.all(a);
		}

		let to = 200;

		if (this._updateBadgeTO[folder._id]) {
			clearTimeout(this._updateBadgeTO[folder._id]);
			to = 1000;
		}

		this._updateBadgeTO[folder._id] = setTimeout(async()=>{
			let c = await folder.getBadgeCount();
			if (c) {
				this.$('#scFolderBadge_'+folder._id).innerHTML = c;
				this.$('#scFolderBadge_'+folder._id).classList.add('scBlockBadgeVisible');
			} else {
				this.$('#scFolderBadge_'+folder._id).classList.remove('scBlockBadgeVisible');
			}
		}, to);
	}

	setActivePeer(peer) {
		for (let c in this._components.folders) {
			this._components.folders[c].setActivePeer(peer);
		}
		this._components.SidebarDialogs.setActivePeer(peer);
	}

	removeFolder(id) {
		this._components.folders[id].$().remove();
		delete this._renderedFolders[id];
		delete this._components.folders[id];
		this.$$('.smfItem').forEach((el)=>{
			if (el.dataset.id == id) el.remove();
		});
	}

	folders() {
		// we are rebuilding folders here
		const cont = this.$('.smfScroll');
		const dcont = this.$('.smDialogsFolders');

		for (let id in this._peerManager._folders) {
			const folder = this._peerManager._folders[id];
			if (!this._renderedFolders[id] && id != 1) {
				// add html
				cont.innerHTML += `<div class="smfItem" data-id="${folder._id}">${this.escapeHTML(folder.title)}<div class="scBlockBadge" id="scFolderBadge_${folder._id}">43</div></div>`;
				this._renderedFolders[id] = true;
				this._components.folders[id] = this.newC(SidebarDialogs, {active: false, folder: folder });
				dcont.insertAdjacentHTML('beforeend', '<div class="smf" id="smf_'+id+'" data-id="'+id+'">'+this._components.folders[id].render({withDiv: true})+'</div>');
				// this._components.folders[id].peers();

				// this._components.folders[id].peers();

				// const c = this._components.folders[id];
				// setTimeout(()=>{
				// 	c.peers();
				// 	alert();
				// },1000);
				this.updateBadge(folder);
			}
		}

		for (let id in this._renderedFolders) {
			if (!this._peerManager._folders[id]) {
				this.removeFolder(id);
				// folder to be removed
			}
		}
	}

	onFolder(e) {
		const base = this.$('#smFolders');
		let closest = event.target.closest('.smfItem');
		if (closest && base.contains(closest)) {
			this.selectFolder(closest.dataset.id);

			let was = false;
			this.$$('.smf').forEach((el)=>{
				if (el.dataset.id == closest.dataset.id) {
					was = true;
					el.classList.add('active');
					// el.classList.remove('hideToLeft');
				} else {
					el.classList.remove('active');
					// if (!was) {
					// 	el.classList.add('hideToLeft');
					// } else {
					// 	el.classList.remove('hideToLeft');
					// }
				}
			});

			this._components.folders[closest.dataset.id].setActive(true);
		}
	}

	selectFolder(id) {
		let fel = null; let afel = null;
		this.$$('.smfItem').forEach((el)=>{
			el.classList[(el.dataset.id == id ? 'add' : 'remove')]('active');
			if (fel && !afel) {
				afel = el;
			}
			if (el.dataset.id == id) {
				fel = el;
			}
		});

		const osx = this.$('.smFolders').scrollLeft;
		const brcont = this.$('#smFolders').getBoundingClientRect();
		let sx = 0;

		let slast = afel || fel;
		let abr = slast.getBoundingClientRect();
		if ((abr.x + osx + abr.width + 20) > (osx + brcont.width)) {
			sx = (osx + abr.x - brcont.width + abr.width + 15); // 15 - margin
		}
		this.$('.smFolders').scrollLeft = sx;
	}

	afterRender() {}

	template() {
		return `
			<div class="SidebarMain sidebarBlock active">
				<div class="smFolders" id="smFolders">
					<div class="smfScroll">
						<div class="smfItem active" data-id="0">All</div>
					</div>
				</div>
				<div class="smDialogs smf active" data-id="0">
					{{component(options.components.SidebarDialogs)}}{{/component}}
				</div>
				<div class="smDialogsFolders">

				</div>
			</div>
		`;
	}
};

module.exports = SidebarMain;
const UI = window.classes.UI;
const Format = require('../../../utils/Format.js');

class SearchBlock extends UI {
	constructor(params) {
		super(params);

		// this._domId = 'scblock_'+params.peer._id;

		this._components = {
		};
		this._data.peer = params.peer;
		this._data.peerMessage = params.peerMessage;
		this._data.search = params.search;

		this._data.title = this.escapeHTML(params.peer.getDisplayName());
		if (params.search && !params.peerMessage) {
			let guessWord = Format.guessWord(this._data.title, params.search);

			if (guessWord) {
				let pos = this._data.title.toLowerCase().indexOf(guessWord);
				this._data.title = this._data.title.substring(0,pos) + "<span class='search'>" + this._data.title.substring(pos,pos+guessWord.length) + "</span>" + this._data.title.substring(pos+guessWord.length);
			}

			this._data.info = params.peer.getInfoType();
			if (!guessWord) {
				let username = params.peer._apiObject.username;
				if (username) {
					guessWord = Format.guessWord(username, params.search);
					if (guessWord) {
						this._data.info = "<span class='search'>@"+username+"</span>";
					}
				}
			}

		}

		this._noDiv = true; // do not wrap in extra div


		// this.doAvatar(this._data.peer, '.avatar');
		// if (this._data.peer.hasAvatar() === null) {
		// 	this._data.peer.getAvatarBlobURL()
		// 		.then((blobURL)=>{
		// 			if (blobURL) {
		// 				this.$('.avatarBack').style.backgroundImage = "url('"+blobURL+"')";
		// 			}
		// 		});
		// }
	}
};
//
SearchBlock.template = `
			<div class="scBlock" id="{{domId}}" title="{{peer._id}}" data-id="{{peer._id}}" {{if (options.peerMessage)}} data-message-id="{{peerMessage._id}}" {{/if}}>

				{{self.avHTML(options.peer)|safe}}

				<div class="scBlockMeta">
					{{if (options.peerMessage)}}
					<div class="scBlockTime" id="scblock_time_{{peer._id}}">{{peer.getDisplayTime(options.peerMessage._date)}}</div>
					{{#else}}
					{{/if}}
				</div>

				<div class="scBlockMessage">
					<div class="scBlockTitle">{{title|safe}}</div>
					{{if (options.peerMessage)}}
					<div class="scBlockBody">{{peerMessage.getDisplayMessage(false, options.search)|safe}}</div>
					{{#else}}
					<div class="scBlockBody">{{info|safe}}</div>
					{{/if}}
				</div>
			</div>
		`;

module.exports = SearchBlock;

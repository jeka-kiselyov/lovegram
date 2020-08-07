describe('peerManager', function () {
	it('_mePeerUser', async function () {
		chai.expect(app._peerManager._mePeerUser).to.be.an('object');
		chai.expect(app._peerManager._mePeerUser.isMe()).to.be.true;
	});
	it('_mePeerUser._peer', async function () {
		chai.expect(app._peerManager._mePeerUser._peer).to.be.an('object');
		chai.expect(app._peerManager._mePeerUser._peer._peerUser.isMe()).to.be.true;

		chai.expect(app._peerManager._mePeerUser).to.deep.equal(app._peerManager._mePeerUser._peer._peerUser);
	});
});

describe('peerManager', function () {
	let cs = app._interface._components.LeftSidebar._components.SidebarDialogs._components.peers;
	for (let c of cs) {
		let peer = c._data.peer;
		let testFunction = function(peer) {
			return async function() {
				const updateObject = {
					"_": "updateShortChatMessage",
					"pFlags": {
					"out": true
					},
					"flags": 2,
					"id": 177374,
					"from_id": 213086,
					"message": "2",
					"pts": 375876,
					"pts_count": 1,
					"date": 1586898508,
					"to_id": {
					}
				};
				const updateObject2 = {
					"_": "updateShortChatMessage",
					"pFlags": {
					"out": true
					},
					"flags": 2,
					"id": 177374,
					"from_id": 213086,
					"message": "2",
					"pts": 375876,
					"pts_count": 1,
					"date": 1586898508,
				};
				if (peer._type == 'chat') {
					updateObject.to_id._ = 'peerChat';
					updateObject.to_id.chat_id = peer._apiObject.id;
					updateObject2.chat_id = peer._apiObject.id;
				}
				if (peer._type == 'channel') {
					updateObject.to_id._ = 'peerChannel';
					updateObject.to_id.channel_id = peer._apiObject.id;
					updateObject2.channel_id = peer._apiObject.id;
				}
				if (peer._type == 'dialog') {
					updateObject.to_id._ = 'peerUser';
					updateObject.to_id.user_id = peer._apiObject.peer.user_id;
					updateObject2.user_id = peer._apiObject.peer.user_id;
				}
				chai.expect(peer).to.be.an('object');

				const peerByUpdate = await app._peerManager.peerByApiShortObject(updateObject);
				chai.expect(peerByUpdate).to.be.an('object');
				chai.expect(peerByUpdate._id).to.equal(peer._id);

				const peerByUpdate2 = await app._peerManager.peerByApiShortObject(updateObject2);
				chai.expect(peerByUpdate2).to.be.an('object');
				chai.expect(peerByUpdate2._id).to.equal(peer._id);

			};
		};
		it('peerByApiShortObject() - '+peer._id, testFunction(peer));
	}


});


describe('peerManager by message update', function () {
	let cs = app._interface._components.LeftSidebar._components.SidebarDialogs._components.peers;
	for (let c of cs) {
		let peer = c._data.peer;
		let testFunction = function(peer) {
			return async function() {
				const updateObject = {
				  "_": "updateDeleteMessages",
				  "messages": [
				    // 176782
				  ],
				  "pts": 375913,
				  "pts_count": 1
				};
				if (peer._messages.length) {
					updateObject.messages.push(peer._messages[0]._id);
				} else {
					return;
				}
				chai.expect(peer).to.be.an('object');

				const peerByUpdate = await app._peerManager.peerByApiShortObject(updateObject, true); // true - search by messages too
				chai.expect(peerByUpdate).to.be.an('object', 'so there is no message '+updateObject.messages[0]);
				chai.expect(peerByUpdate._id).to.equal(peer._id);
			};
		};

		if (peer._messages.length)
		it('peerByApiShortObject() - '+peer._id, testFunction(peer));
	}


});
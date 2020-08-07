const messageClasses = {
	Text: require('./Text.js'),
	Sticker: require('./Sticker.js'),
	Album: require('./Album.js'),
	// SinglePhoto: require('./SinglePhoto.js'),
	// PhotoWithText: require('./PhotoWithText.js'),
	GIF: require('./GIF.js'),
	SingleVideo: require('./SingleVideo.js'),
	VideoWithText: require('./VideoWithText.js'),
	RoundVideo: require('./RoundVideo.js'),
	Downloadable: require('./Downloadable.js'),
	Poll: require('./Poll.js'),
	AudioPlayer: require('./AudioPlayer.js'),
	Service: require('./Service.js'),
};

class MessagesFactory {
	static factory(peerMessage) {
		let className = 'Text';
		if (peerMessage.isService()) {
			className = 'Service';
		} else if (peerMessage.getGroupId()) {
			className = 'Album';
		} else if (peerMessage._sticker) {
			className = 'Sticker';
		} else if (peerMessage._doc) {
			className = 'Downloadable';
		} else if (peerMessage._poll) {
			className = 'Poll';
		} else if (peerMessage._audio) {
			className = 'AudioPlayer';
		} else if (peerMessage._media) {
			if (peerMessage._media.isPhoto()) {
				if (!peerMessage._message) {
					className = 'Album';
				} else {
					className = 'Album';
				}
			} else if (peerMessage._media.isVideo()) {
				if (peerMessage._media.isGIF()) {
					className = 'GIF';
				} else if (peerMessage._media.isRoundVideo()) {
					className = 'RoundVideo';
				} else if (!peerMessage._message) {
					className = 'SingleVideo';
				} else {
					className = 'VideoWithText';
				}
			}
		}
		return messageClasses[className];
	}
};

module.exports = MessagesFactory;
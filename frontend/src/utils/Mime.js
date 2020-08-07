
class Mime {
	constructor() {
	}

	static filenameToMime(filename) {
		try {
			let ext = filename.substr(filename.lastIndexOf('.') + 1);
			if (Mime.d[ext]) {
				return Mime.d[ext];
			}
		} catch(e) {
		}
		return 'application/octet-stream';
	}
}

Mime.d = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	json: 'application/json',
	mp4: 'video/mp4',
	mp3: 'audio/mp3',
	oga: 'audio/ogg',
	ogg: 'audio/ogg',
	wav: 'audio/wav',
	weba: 'audio/webm',
};

module.exports = Mime;
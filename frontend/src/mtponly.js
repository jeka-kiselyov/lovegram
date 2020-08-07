const mt = require('./protocol/tele/lib/telejs.js');

window.mtproto = mt;

if (window.mtProtoIsReady) {
	window.mtProtoIsReady();	//;
}
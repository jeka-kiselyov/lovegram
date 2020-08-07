// const mt = require('./protocol/tele/lib/telejs.js'); // don't need mt library here
const lottie = require('./utils/lottie.min.js');

// console.log(mtproto);
// console.log(mt);
// console.log(mt2);

// window.mtproto = mt;
window.lottie = lottie;
window.lottie.setQuality('high');

if (window.mtProtoIsReady) {
	window.mtProtoIsReady();	//;
}
// console.log('should be lottie');
if (window.lottieIsReady) {
	try {
		window.lottieIsReady();	//;
	} catch(e) {

	}
}
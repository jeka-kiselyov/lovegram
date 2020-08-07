const Sqrl = require('squirrelly');

Sqrl.defineHelper('component', function(args, content, blocks) {
	let component = null;
	if (args[0] && args[0].domId) {
		component = args[0];
	}

	if (component) {
		// const componentDomId = component.domId;
		return component.render({withDiv: true});
	} else {
		return '';
	}
});

Sqrl.defineFilter('nl2br', function(str) {
	return (''+str).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1 <br /> $2');
})

// need this to enable autocomple-off hasck
// Sqrl.defineHelper('rand', function(str) {
// 	return (''+Math.rand()).split('.').join();
// });

// const monthesNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Sqrl.defineFilter('time', function(str) {
// 	const now = new Date();
// 	const date = new Date(str*1000);

// 	if (now - date < 86400000) {
// 		// > 1 day
// 		return ('0'+date.getHours()).substr(-2)+':'+('0'+date.getMinutes()).substr(-2);
// 	} else {
// 		return ''+monthesNames[date.getMonth()]+'&nbsp;'+date.getDate();
// 	}
// });

module.exports = Sqrl;
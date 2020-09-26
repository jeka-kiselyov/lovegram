const path = require('path');

module.exports = {
	mode: 'development',
	entry: path.join(__dirname, '../src/protocol/ServiceWorker.js'),
	output: {
		path:  path.join(__dirname, '../dist'),
		filename: 'sw.js'
	},
	module: {
	    rules: [
		]
	},
	plugins: [
	]
};
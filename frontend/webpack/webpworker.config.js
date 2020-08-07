const path = require('path');

module.exports = {
	mode: 'development',
	entry: path.join(__dirname, '../src/protocol/WEBPWorker.js'),
	output: {
		path:  path.join(__dirname, '../dist'),
		filename: 'webpworker.js'
	},
	module: {
	    rules: [
		]
	},
	plugins: [
	]
};
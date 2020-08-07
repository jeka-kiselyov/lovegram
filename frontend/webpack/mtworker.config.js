const path = require('path');

module.exports = {
	mode: 'development',
	entry: path.join(__dirname, '../src/protocol/APIWorker.js'),
	output: {
		path:  path.join(__dirname, '../dist'),
		filename: 'mtworker.js'
	},
	module: {
	    rules: [
		]
	},
	plugins: [
	]
};
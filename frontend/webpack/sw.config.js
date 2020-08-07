const path = require('path');

module.exports = {
	mode: 'development',
	entry: path.join(__dirname, '../src/utils/offline_sw.js'),
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
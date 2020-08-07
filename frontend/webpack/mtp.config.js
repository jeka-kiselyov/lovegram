const path = require('path');

module.exports = {
	mode: 'development',
	entry: path.join(__dirname, '../src/mtp.js'),
	output: {
		path:  path.join(__dirname, '../dist'),
		filename: 'mtp.js'
	},
	module: {
	    rules: [
		]
	},
	plugins: [
	]
};
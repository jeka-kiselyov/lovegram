const path = require('path');

module.exports = {
	mode: 'development',
	entry: path.join(__dirname, '../src/app.js'),
	output: {
		path:  path.join(__dirname, '../dist'),
		filename: 'app.js'
	},
	module: {
	    rules: [
		]
	},
	plugins: [
	]
};
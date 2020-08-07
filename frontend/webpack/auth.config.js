const path = require('path');

module.exports = {
	mode: 'development',
	entry: path.join(__dirname, '../src/auth.js'),
	output: {
		path:  path.join(__dirname, '../dist'),
		filename: 'auth.js'
	},
	module: {
	    rules: [
		]
	},
	plugins: [
	],
	optimization: {
	},
};
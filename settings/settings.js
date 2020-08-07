if (typeof __webpack_require__ === 'function') {
	throw new Error("You'd better not include this little piece for frontend scripts, honey");
}

const path = require('path');
const pjson = require(path.join(__dirname, '../package.json'));

let isHeroku = false;
if ( (process.env._ && process.env._.indexOf("heroku")  != -1) || (process.env.NODE && ~process.env.NODE.indexOf("heroku") != -1) ) {
	isHeroku = true;
}

module.exports = {
	"name": pjson.description || pjson.name,
	"version": pjson.version,
	"debug": true,
	"paths": {
		"commands": path.join(__dirname, "../commands"),
		"models": path.join(__dirname, "../models"),
	},
	server: {
		enableLivereload: isHeroku ? false : true,      /// enable LiveReload server. Set to true for dev env
		enableWebpackWatch: isHeroku ? false : true,    /// enable WebPack compiling. Set to true for dev env
		enableWebpackBuild: isHeroku ? false : true,    /// build frontend sources codes each start. Set to true for dev env
		port: process.env.PORT || 9090
	}
};
var fs = require("fs").promises,
	util = require("util");
var ytdl = require("./ytdl.js");

exports.cleanup = async function() {
	
	// Schedule next cleanup
	setTimeout(exports.cleanup, 100000);
}


var fs = require("fs"),
	crypto = require("crypto");
var ytdl = require("./ytdl.js");

function getFilename(url) {
	fs.mkdirSync("caches", { recursive:true }); // make sure caches directory exists
	let sha = crypto.createHash("sha1");
	sha.update(url);
	let filename = "caches/" + sha.digest("hex");
	return filename;
}

exports.cleanup = async function() {
	
	// Schedule next cleanup
	setTimeout(exports.cleanup, 100000);
}

exports.pull = async function(url) {
	let filename = getFilename(url);
	try {
		await fs.statSync(filename); // if this fails the catch block goes
		return filename;
	}
	catch {
		await ytdl.fetch(url, filename);
		return filename;
	}
}

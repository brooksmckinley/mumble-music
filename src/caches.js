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

exports.cleanup = function() {
	console.info("[DEBUG] Cleanup started.");
	let timeout = JSON.parse(fs.readFileSync("config.json")).cache;
	let minTime = Date.now() - (timeout * 1000);
	if (!timeout) return; // If it's indefinite, return immediately
	fs.readdir("caches", (err, files) => {
		if (err) {
			console.warn("[WARN] Cleanup failed: " + err);
			return;
		}
		for (let file of files) {
			let stat = fs.statSync("caches/" + file);
			if (stat.mtimeMs < minTime) {
				console.debug("[DEBUG] Removing " + file);
				fs.unlinkSync("caches/" + file);
			}
		}
	});
	// Schedule next cleanup
	setTimeout(exports.cleanup, 100000);
}

exports.pull = async function(url) {
	let filename = getFilename(url);
	try {
		fs.statSync(filename); // if this fails the catch block goes
		fs.utimesSync(filename, Date.now() / 1000, Date.now() / 1000); // Touch file for cleanup routine
		return filename;
	}
	catch {
		await ytdl.fetch(url, filename);
		return filename;
	}
}

var child_process = require("child_process");
var fs = require("fs");

//new stuff below

exports.details = function(url) {
	return new Promise((resolve, reject) => {
		let proc = child_process.spawn("youtube-dl", ["-j", "--no-playlist", "--playlist-items", "1", url]);
		let data = "";
		proc.stdout.on("data", (d) => data += d.toString());
		proc.stdout.on("end", () => {
			try {
				resolve(JSON.parse(data));
			} catch {
				reject("Error getting video information.");
			}
		});
		proc.on("exit", (code) => {
			if (code != 0) reject("Error getting video information.");
		});
		proc.on("error", (e) => reject("Error getting video information."));
	});
}

exports.download = function(url, filename) {
	let running = true;
	let res = new Promise((resolve, reject) => {
		let args = ["--no-playlist", "-R", "1", "--abort-on-unavailable-fragment", "--socket-timeout", "30", "--playlist-items", "1", "--exec", "ffmpeg -i {} -ar 48000 -ac 1 -c:a pcm_s16le -f s16le -y " + filename + "; rm {}"];
		// Only download the audio if it's on YouTube
		if (url.match("^http(s)?://(www\.youtube\.com|youtu\.be|youtube\.com)") || url.startsWith("ytsearch:")) {
			args.push("-f");
			args.push("bestaudio");
			// That didn't work
			//args.push("best"); // Because this format seems to be the least likely to have issues
		} 
		args.push(url);
		console.debug("[INFO] Downloading " + url);
		let proc = child_process.spawn("youtube-dl", args);
		proc.on("exit", (code) => {
			if (code == 0) {
				running = false;
				resolve();
			}
			else {
				running = false;
				reject("Error downloading link.");
			}
		});
		proc.on("error", (e) => {
			reject("Error downloading link.");
			running = false;
			console.log(e)
		});
	});
	res.isRunning = () => {
		return running;
	};
	return res;
}

exports.fetch = async function(url, filename) {
	let args = ["--no-playlist", "-R", "1", "--abort-on-unavailable-fragment", "--socket-timeout", "30", "--playlist-items", "1", "-o", filename];
	// Only download the audio if it's on YouTube
	if (url.match("^http(s)?://(www\.youtube\.com|youtu\.be|youtube\.com)") || url.startsWith("ytsearch:")) {
		args.push("-f");
		args.push("bestaudio");
	} 
	args.push(url);
	console.debug("[INFO] Fetching " + url);
	let proc = child_process.spawn("youtube-dl", args);
	proc.on("exit", (code) => {
		if (code == 0) {
			return;
		}
		else {
			running = false;
			throw "Error downloading link.";
		}
	});
	proc.on("error", (e) => {
		throw "Error downloading link.";
		console.log(e)
	});
}

// Returns promise that resolves when the first 3 songs have been added or all of the songs have been added.
exports.populateQueue = function(url) {
	return new Promise((resolve, reject) => {
		let playlist = [];
		let proc = child_process.spawn("youtube-dl", ["--flat-playlist", "-J", url]);
		let data = ""
		proc.stdout.on("data", (d) => data += d);
		proc.on("exit", (code) => {
			if (code != 0) {
				console.warn("[WARN] Error processing playlist (process failed)");
				reject("Error parsing playlist (process failed)")
			}
			// parse
			try {
				let res = JSON.parse(data);
				if (!res.entries) reject("Not a playlist.");
				else resolve(res.entries);
			}
			catch (e) {
				reject("Error parsing playlist");
				console.warn("[WARN] Error processing playlist: " + e);
			}
		});
	});
}

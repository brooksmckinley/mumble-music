var child_process = require("child_process");
var fs = require("fs");
var caches = require("./caches.js");

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
	let res = new Promise(async (resolve, reject) => {
		try {
			let cacheName = await caches.pull(url);
			await transcode(cacheName, filename);
		}
		catch (e) {
			running = false;
			throw "Error downloading link.";
		}
		running = false;
		return;
	});
	res.isRunning = () => {
		return running;
	};
	return res;
}

exports.fetch = function(url, filename) {
	return new Promise((resolve, reject) => {
		let args = ["--no-playlist", "-R", "1", "--abort-on-unavailable-fragment", "--socket-timeout", "30", "--playlist-items", "1", "--no-continue", "-o", filename];
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
				resolve();
			}
			else {
				reject("Error fetching link.");
			}
		});
		proc.on("error", (e) => {
			reject("Error fetching link.");
			console.log(e)
		});
	});
}

function transcode(inF, outF) {
	return new Promise((res, rej) => {
		let args = ["-i", inF, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", "-f", "s16le", "-y", outF];
		console.debug("[INFO] Transcoding " + inF + " to " + outF);
		let proc = child_process.spawn("ffmpeg", args);
		proc.on("exit", (code) => {
			if (code == 0) res();
			else rej("Error transcoding: " + code);
		});
		proc.on("error", (e) => {
			rej("Error transcoding: " + e);
		});
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

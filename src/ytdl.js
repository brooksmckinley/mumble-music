var child_process = require("child_process");
var fs = require("fs");
var caches = require("./caches.js");

var downloads = new Map();

exports.details = function(url) {
	return new Promise((resolve, reject) => {
		let args = ["-j", "--no-playlist", "--playlist-items", "1"];
		if (global.config.proxy) {
			args.push("--proxy");
			args.push(global.config.proxy);
		}
		args.push(url);
		let proc = child_process.spawn("youtube-dl", args);
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
			reject(e);
		}
		running = false;
		resolve();
	});
	res.isRunning = () => {
		return running;
	};
	return res;
}

exports.fetch = function(url, filename) {
	let promise = downloads.get(url);
	let res;
	if (!promise) {
		res = new Promise((resolve, reject) => {
			let args = ["-f", "bestaudio/best", "--no-playlist", "-R", "1", "--abort-on-unavailable-fragment", "--socket-timeout", "30", "--playlist-items", "1", "--no-continue", "--no-mtime", "-o", filename];
			if (global.config.proxy) {
				args.push("--proxy");
				args.push(global.config.proxy);
			}
			if (global.config.external_downloader) {
				args.push("--external-downloader");
				args.push(global.config.external_downloader);
			}
			if (global.config.external_downloader_args) {
				args.push("--external-downloader-args");
				args.push(global.config.external_downloader_args);
			}
			args.push(url);
			console.debug("[INFO] Fetching " + url);
			let proc = child_process.spawn("youtube-dl", args);
			proc.on("exit", (code) => {
				if (code == 0) {
					downloads.delete(url);
					resolve();
				}
				else {
					downloads.delete(url);
					reject("Error fetching link.");
				}
			});
			proc.on("error", (e) => {
				downloads.delete(url);
				reject("Error fetching link.");
				console.log(e)
			});
		});
		downloads.set(url, res);
	}
	else { // sneakily put the old promise in
		res = promise;
	}
	return res;
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
				else resolve(res);
			}
			catch (e) {
				reject("Error parsing playlist");
				console.warn("[WARN] Error processing playlist: " + e);
			}
		});
	});
}

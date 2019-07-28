var ytdl = require("./ytdl.js");
var Player = require("./Player.js");
var fs = require("fs");
var hhmmss = require("hh-mm-ss");

function SongQueue(config) {
	this.queue = [];
	this.lastID = 0;
	this.maxDuration = config.maxlength;
} 

SongQueue.prototype.isPlaying = function() {
	if (!this.player) return false;
	return this.player.isPlaying;
}

SongQueue.prototype.isPaused = function() {
	if (this.player) return false;
	return this.player.isPaused;
}

SongQueue.prototype.addSong = function(url) {
	return new Promise((resolve, reject) => {
		ytdl.details(url).then((details) => {
			if (details.duration > this.maxDuration) {
				reject("video too long");
				return;
			}
			let id = this.lastID++;
			let p = ytdl.download(url, ".tmp." + id + ".wav").then(() => {
				let song = new Song(details.title, details.duration, id);
				this.queue.push(song);
				resolve(song);
			}).catch((e) => reject(e));
		}).catch((e) => reject(e));
	});
}

SongQueue.prototype.start = function(connection) {
	if (!this.player) {
		this.player = new Player(connection);
	}
	if (!this.player.isPlaying) {
		this._nextSong();
	}
}

SongQueue.prototype._nextSong = function() {
	if (this.queue.length == 0) return;
	let song = this.queue.shift();
	this.nowPlaying = song;
	this.player.playFile(".tmp." + song.id + ".wav").then(() => this._nextSong());
}

SongQueue.prototype.getQueue = function() {
	res = "";
	for (let song of this.queue) {
		res += song.name + ": " + hhmmss.fromS(song.duration) + "\n";
	}
	return res;
}

// Exposing functions of the player

SongQueue.prototype.skip = function() {
	if (this.player) {
		this.player.stop();
		this._nextSong();
	}
}

SongQueue.prototype.pause = function() {
	if (this.player) {
		this.player.pause();
	}
}

SongQueue.prototype.resume = function() {
	if (this.player) {
		this.player.resume();
	}
}

SongQueue.prototype.setGain = function(gain) {
	if (this.player) {
		this.player.setGain(gain);
	}
}

function Song(name, duration, id) {
	this.name = name;
	this.duration = duration;
	this.id = id;
}


module.exports = SongQueue;
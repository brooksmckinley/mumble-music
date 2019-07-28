var Player = require("./Player.js"),
	ytdl = require("./ytdl.js");

var fs = require("fs");

exports.startPlaylist = function(url, id, connection, callback) {
	return new Promise((resolve, reject) => {
		ytdl.populateQueue(url).then((queue) => {
			let playlist = new Playlist(queue, url, id, connection, callback);
			// Download then play
			playlist._download().then(() => playlist._nextSong());
			// Now that the structure is constructed, resolve.
			resolve(playlist);
		}).catch((e) => reject(e));
	});
}

function Playlist(queue, url, id, connection, callback) {
	this.queue = queue;
	this.url = url;
	this.id = id;
	this.player = new Player(connection);
	this.callback = callback;
	this.nowPlaying = null;
	this.nextSong = null;
	this.ready = false;
	this.lastID = 0;
}

Playlist.prototype._download = function() {
	return new Promise((resolve, reject) => {
		this.nextSong = this.queue.shift();
		this.ready = false;
		this.nextSong.filename = ".tmp.playlist." + this.id + "." + this.lastID++ + ".wav";
		ytdl.download(this.nextSong.webpage_url, this.nextSong.filename).then(() => {
			this.ready = true;
			if (!this.isPlaying()) resolve(); // Only resolve if not playing. If it's playing, the next song will automatically be played
		});
	});
}

Playlist.prototype._nextSong = function() {
	// Delete the next song if the bot is stopped
	if (this.isStopped) {
		try {
			fs.unlinkSync(this.nextSong.filename);
		}
		catch (e) {} // fail silently
		return;
	}
	if (this.nextSong == undefined) {
		this.callback();
		return;
	}
	if (this.ready) {
		this.nowPlaying = this.nextSong;
		this.player.playFile(this.nowPlaying.filename).then(() => this._nextSong());
		// Download the next song
		this._download().then(() => this._nextSong());
	}
}

Playlist.prototype.stop = function() {
	this.player.stop();
	// attempt to delete next song, if it fails try again when it finishes.
	try {
		fs.unlinkSync(this.nextSong.filename);
	}
	catch (e) {
		console.warn("[WARN] Unlink failed: " + e);
	} // fail silently
	this.isStopped = true;
	this.callback();
}

// Exposing data structures of the player

Playlist.prototype.isPlaying = function() {
	if (!this.player) return false;
	return this.player.isPlaying;
}

Playlist.prototype.isPaused = function() {
	if (this.player) return false;
	return this.player.isPaused;
}

// Exposing functions of the player

Playlist.prototype.skip = function() {
	if (this.player) {
		this.player.stop();
		this._nextSong();
	}
}

Playlist.prototype.pause = function() {
	if (this.player) {
		this.player.pause();
	}
}

Playlist.prototype.resume = function() {
	if (this.player) {
		this.player.resume();
	}
}

Playlist.prototype.setGain = function(gain) {
	if (this.player) {
		this.player.setGain(gain);
	}
}
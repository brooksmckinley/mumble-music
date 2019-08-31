var Player = require("./Player.js"),
ytdl = require("./ytdl.js");

var fs = require("fs");

const songPlaceholder = {
		title: "Loading..."
}

exports.startPlaylist = function(url, id, connection, config, shuffle, callback) {
	return new Promise((resolve, reject) => {
		ytdl.populateQueue(url).then((queue) => {
			let playlist = new Playlist(queue, url, id, connection, config, callback);
			if (shuffle) playlist._shuffle();
			// Download then play
			playlist._download().then(() => playlist._nextSong());
			// Now that the structure is constructed, resolve.
			resolve(playlist);
		}).catch((e) => reject(e));
	});
}
//
//exports.shufflePlaylist = function(url, id, connection, config, callback) {
//	return new Promise((resolve, reject) => {
//		// Call above function and shuffle
//		exports.startPlaylist(url, id, connection, config, callback).then((playlist) => {
//			playlist._shuffle();
//			resolve(playlist);
//		}).catch((e) => reject(e));
//	});
//}

function Playlist(queue, url, id, connection, config, callback) {
	this.queue = queue;
	this.url = url;
	this.id = id;
	this.player = new Player(connection);
	this.callback = callback;
	this.nextSong = null;
	this.ready = false;
	this.lastID = 0;
	this.maxDuration = config.maxlength;
}

// Fisher–Yates Shuffle O(n)
Playlist.prototype._shuffle = function() {
	let back = this.queue.length;
	while (back) {
		let front = Math.floor(Math.random() * back--);
		// swap front and back
		let tmp = this.queue[back];
		this.queue[back] = this.queue[front];
		this.queue[front] = tmp;
	}
}

Playlist.prototype._download = function() {
	return new Promise((resolve, reject) => {
		this.ready = false;
		this.nextSong = songPlaceholder;
		this._getNextSong().then((song) => {
			this.nextSong = song;
			this.nextSong.filename = ".tmp.playlist." + this.id + "." + this.lastID++ + ".wav";
			ytdl.download(this.nextSong.webpage_url, this.nextSong.filename).then(() => {
				this.ready = true;
				if (!this.isPlaying()) resolve(); // Only resolve if not playing. If it's playing, the next song will automatically be played
			}).catch((e) => {
				// skip song
				console.warn("[WARN] Error downloading link: " + e);
				this._download().then(resolve).catch(reject);
			});
		}).catch((e) => {
			if (!e) {
				// Song is not found, so mark nextSong as undefined and return silently
				this.nextSong = undefined;
				if (!this.isPlaying()) resolve(); // same as above
			}
			else {
				reject(e);
			}
		});
	});
}

//Gets next PLAYABLE song
//Skips unplayable songs
Playlist.prototype._getNextSong = function() {
	return new Promise((resolve, reject) => {
		let next = this.queue.shift();
		if (!next) {
			reject();
			return;
		}
		console.debug("[DEBUG] Getting details for " + next.url);
		ytdl.details(next.url).then((details) => {
			if (details.duration > this.maxDuration) {
				// try to call again if video is invalid
				this._getNextSong().then(resolve).catch((e) => reject(e));
			}
			else resolve(details);
		}).catch((e) => {
			// If error, call again
			console.warn("[ERROR] Error getting details: " + e);
			this._getNextSong().then(resolve).catch((e) => reject(e));
			return;
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
		if (this.nextSong) fs.unlinkSync(this.nextSong.filename);
	}
	catch (e) {
		console.warn("[WARN] Unlink failed: " + e);
	} // fail silently
	this.isStopped = true;
	this.callback();
}

//Exposing data structures of the player

Playlist.prototype.isPlaying = function() {
	if (!this.player) return false;
	return this.player.isPlaying;
}

Playlist.prototype.isPaused = function() {
	if (this.player) return false;
	return this.player.isPaused;
}

//Exposing functions of the player

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

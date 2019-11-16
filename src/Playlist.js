var hhmmss = require("hh-mm-ss");

var Player = require("./Player.js"),
ytdl = require("./ytdl.js");

var fs = require("fs");

const songPlaceholder = {
		title: "Loading..."
}

exports.startPlaylist = async function(url, id, connection, channel, shuffle, callback) {
	let ytdlPlaylist = await ytdl.populateQueue(url);
	let queue = ytdlPlaylist.entries;
	let playlist = new Playlist(queue, url, ytdlPlaylist.title, id, connection, channel, callback);
	if (shuffle) playlist._shuffle();
	//playlist._download().then(() => playlist._nextSong());
	playlist._start().catch((e) => {
		callback();
		throw e;
	}); // callback if fail
	return playlist;
}

function Playlist(queue, url, name, id, connection, channel, callback) {
	this.queue = queue;
	this.url = url;
	this.name = name;
	if (this.url.includes("youtube\.com")) 
		this.youtube = true;
	else 
		this.youtube = false;
	this.id = id;
	this.player = new Player(connection);
	this.channel = channel;
	this.callback = callback;
	this.nextSong = null;
	this.ready = false;
	this.lastID = 0;
	this.maxDuration = global.config.maxlength;
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

Playlist.prototype._start = async function() {
	let song = await this._getNextSong();
	let file = ytdl.download(song.webpage_url, song.filename);
	while (song != undefined) {
		// Prepare song for playing
		this.nowPlaying = song;
		let nextSong, nextFile;
		let gn = () => { 
			this.nextSong = songPlaceholder;
			nextSong = this._getNextSong(); // Start getting next song immediately
			nextSong.then((res) => { 
				if (!res) {
					this.nextSong = undefined;
					return;
				}
				this.nextSong = res;
				nextFile = ytdl.download(res.webpage_url, res.filename); // Seperate lines to preserve isRunning()
				nextFile.catch((e) => {
					console.warn("[WARN] Error downloading link: " + e);
					gn();
				}); // call again if error
			});
		};
		gn();
		try {
			if (file.isRunning()) {
				this.channel.sendMessage("Downloading song...");
			}
			await file;
		}
		catch (e) {
			console.warn("[WARN] Error downloading link: " + e);
			song = await nextSong; // Skip song
			file = nextFile; // nextFile set when nextSong resolves
			continue;
		}
		if (this.isStopped) { // Clean up if someone stopped before the download finished
			fs.unlinkSync(song.filename);
			let ns = await nextSong;
			await nextFile; // wait for download
			if (ns) fs.unlinkSync(ns.filename);
			return; 
		}
		await this.player.playFile(song.filename);
		if (this.isStopped) { // Return if someone stopped during the playlist
			let ns = await nextSong;
			await nextFile;
			if (ns) fs.unlinkSync(ns.filename);
			return;
		}
		song = await nextSong;
		file = nextFile;
	}
	this.callback();
}

//Gets next PLAYABLE song
//Skips unplayable songs
Playlist.prototype._getNextSong = async function() {
	let next = this.queue.shift();
	if (!next) {
		return;
	}
	// Set URL
	if (this.youtube) next.url = "https://youtu.be/" + next.url;
	console.debug("[DEBUG] Getting details for " + next.url);
	try {
		let details = await ytdl.details(next.url);
		if (details.duration > this.maxDuration) {
			return this._getNextSong(); // call again if unplayable
		}
		// Set filename
		details.filename = ".tmp.playlist." + this.id + "." + this.lastID++ + ".wav";
		return details;

	}
	catch (e) {
		console.warn("[ERROR] Error getting details: " + e);
		return this._getNextSong(); // call again if error
	}
	
}

Playlist.prototype.getCurrentDuration = function() {
	if (this.isPlaying()) return hhmmss.fromS(this.nowPlaying.duration);
}

Playlist.prototype.stop = function() {
	this.player.stop();
	this.isStopped = true;
	this.callback();
}

Playlist.prototype.skip = function() {
	this.player.stop();
}

//Exposing data structures of the player

Playlist.prototype.isPlaying = function() {
	if (!this.player) return false;
	return this.player.isPlaying;
}

Playlist.prototype.isPaused = function() {
	if (!this.player) return false;
	return this.player.isPaused;
}

//Exposing functions of the player

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

Playlist.prototype.getGain = function() {
	if (this.player) {
		return this.player.gain;
	}
}

Playlist.prototype.getCurrentPos = function() {
	if (this.player) {
		return hhmmss.fromS(this.player.getCurrentPos());
	}
}

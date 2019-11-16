var fs = require('fs');

function Database(name) {
	this.name = name;
	try {
		this.db = JSON.parse(fs.readFileSync(name));
	}
	catch {
		this.db = {};
		this.db.playlists = {};
		this.db.songs = {};
		this._save();
	}
}

function SongEntry(name, duration, plays) {
	this.name = name;
	this.duration = duration;
	this.plays = plays;
}

function PlaylistEntry(name, plays) {
	this.name = name;
	this.plays = plays;
}

Database.prototype.incrementSong = function(url, name, duration) {
	if (this.db.songs[url]) {
		this.db.songs[url].plays++;
	}
	else {
		this.db.songs[url] = new SongEntry(name, duration, 0);
	}
	this._save();
}

Database.prototype.incrementPlaylist = function(url, name) {
	if (this.db.playlists[url]) {
		this.db.playlists[url].plays++;
	}
	else {
		this.db.playlists[url] = new PlaylistEntry(url, name);
	}
	this._save();
}

Database.prototype.getSong = function(url) {
	return this.db.songs[url];
}

// Get top X songs
// Defaults: Get top ten from entire server
Database.prototype.getTopXSongs = function(x) {
	if (!x) x = 10;
	let tmpdb = Object.values(this.db.songs);
	tmpdb.sort((song) => { return song.plays });
	return tmpdb.slice(0, x);
}

// Same as getTopXSongs
Database.prototype.getTopXPlaylists = function(x) {
	if (!x) x = 10;
	let tmpdb = Object.values(this.db.playlists);
	tmpdb.sort((entry) => { return entry.plays });
	return tmpdb.slice(0, x);
}

Database.prototype._save = function() {
	fs.writeFileSync(this.name, JSON.stringify(this.db));
}

module.exports = Database;

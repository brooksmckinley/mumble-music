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

Database.prototype.incrementPlaylist = function(url) {
}

Database.prototype.getSong = function(url) {
}

Database.prototype.getTopTenSongs = function(user) {
}

Database.prototype.getTopTenPlaylists = function(user) {
}

Database.prototype._save = function() {
	fs.writeFileSync(this.name, JSON.stringify(this.db));
}

module.exports = Database;

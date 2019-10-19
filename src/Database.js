var fs = require('fs');

function Database(name) {
	this.name = name;
	try {
		this.db = JSON.parse(fs.readFileSync(name));
	}
	catch {
		this.db = {};
		this.db.playlists = [];
		this.db.songs = [];
		this._save();
	}
}

Database.prototype.increment = function(song) {
}

Database.prototype.getSong = function(song) {
}

Database.prototype.getTopTenSongs = function(user) {
}

Database.prototype.getTopTenPlaylists = function(user) {
}

Database.prototype._save = function() {
	fs.writeFile(this.name, JSON.stringify(this.db));
}

module.exports = Database;

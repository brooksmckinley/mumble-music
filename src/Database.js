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

Database.prototype.incrementSong = function(url) {
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

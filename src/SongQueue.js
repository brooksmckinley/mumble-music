var ytdl = require("./ytdl.js");
var fs = require("fs");
var hhmmss = require("hh-mm-ss");

function SongQueue(config) {
	this.queue = [];
	this.lastID = 0;
	this.isPlaying = false;
	this.maxDuration = config.maxlength;
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
	console.log("start called: " + this.isPlaying);
	if (!this.isPlaying) {	
		this.stream = connection.inputStream();
		this.stream.setGain(0.25);
		this.connection = connection;
		this._play();
	}
}

SongQueue.prototype._play = function() {
	let song = this.queue.shift();
	let songData = fs.readFileSync(".tmp." + song.id + ".wav");
	this.stream.write(songData);
	this.nowPlaying = song;
	this.isPlaying = true;
	fs.unlinkSync(".tmp." + song.id + ".wav");
	// Re-call _play() if no one skipped the song
	setTimeout(() => {
		if (this.nowPlaying.id == song.id) {
			console.log("song timeout");
			if (this.queue.length == 0) this.isPlaying = false;
			else this._play();
		}
	}, (song.duration + 3) * 1000);
}

SongQueue.prototype.skip = function() {
	this.stream.close();
	this.stream = this.connection.inputStream();
	this.isPlaying = false;
	this.stream.setGain(0.25);
	if (this.queue.length != 0) this._play();
}

SongQueue.prototype.getQueue = function() {
	res = "";
	for (let song of this.queue) {
		res += song.name + ": " + hhmmss.fromS(song.duration) + "\n";
	}
	return res;
}

function Song(name, duration, id) {
	this.name = name;
	this.duration = duration;
	this.id = id;
}


module.exports = SongQueue;
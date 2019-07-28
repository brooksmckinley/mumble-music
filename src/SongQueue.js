var ytdl = require("./ytdl.js");
var fs = require("fs");
var hhmmss = require("hh-mm-ss");

function SongQueue(config) {
	this.queue = [];
	this.lastID = 0;
	this.isPlaying = false;
	this.maxDuration = config.maxlength;
	this.gain = 0.25;
	this.buf = Buffer.alloc(48000);
} 

SongQueue.prototype._createStream = function() {
	this.stream = this.connection.inputStream();
	this.stream.setGain(this.gain);
	this.stream.on('drain', () => this._fillBuf());
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
	console.debug("[DEBUG] isPlaying: " + this.isPlaying);
	if (!this.isPlaying) {	
		this.connection = connection;
		this._createStream();
		this._play();
	}
}

SongQueue.prototype._fillBuf = function() {
	if (this.isPlaying) {
		fs.read(this.fd, this.buf, 0, 48000, null, (err, bytesRead, buffer) => {
			if (err) throw err;
			this.stream.write(buffer);
			if (bytesRead == 0) {
				console.info("[INFO] Song timeout.");
				this._delete();
				if (this.queue.length == 0) this.isPlaying = false;
				else this._play();
			}
		});
	}
}

SongQueue.prototype._delete = function() {
	fs.closeSync(this.fd);
	fs.unlinkSync(".tmp." + this.nowPlaying.id + ".wav");
}

SongQueue.prototype._play = function() {
	let song = this.queue.shift();
	this.nowPlaying = song;
	this.isPlaying = true;
	this.fd = fs.openSync(".tmp." + song.id + ".wav", 'r', 666);
	this._fillBuf();
}

SongQueue.prototype.skip = function() {
	if (this.isPlaying) {
		this.stream.close();
		this._delete();
		this._createStream();
		this.isPlaying = false;
		this.isPaused = false;
		if (this.queue.length != 0) this._play();
	}
}

SongQueue.prototype.pause = function() {
	this.stream.close();
	this._createStream();
	this.isPaused = true;
}

SongQueue.prototype.resume = function() {
	if (this.isPaused) this._fillBuf();
	this.isPaused = false;
}

SongQueue.prototype.getQueue = function() {
	res = "";
	for (let song of this.queue) {
		res += song.name + ": " + hhmmss.fromS(song.duration) + "\n";
	}
	return res;
}

SongQueue.prototype.setGain = function(gain) {
	this.gain = gain;
	if (this.isPlaying) {
		this.stream.setGain(gain);
	}
}
function Song(name, duration, id) {
	this.name = name;
	this.duration = duration;
	this.id = id;
}


module.exports = SongQueue;
var mumble = require("mumble"),
fs = require("fs");

var ytdl = require("./src/ytdl.js"),
SongQueue = require("./src/SongQueue.js"),
Playlist = require("./src/Playlist.js"),
Database = require("./src/Database.js");

global.config = JSON.parse(fs.readFileSync("config.json")); 

// Start cache cleanup routine
require ("./src/caches.js").cleanup();

const Modes = {
		QUEUE: 0,
		PLAYLIST: 1
};

var playing = false;
var mode = Modes.QUEUE;
var queue;
var playlist;
var db = new Database("statistics.json");
var playlistID = 0; // ID for playlist temp files to prevent collisions
var channel = undefined;

// TODO: Please refactor
function onMessage(msg, user, connection) {
	// Queue mode commands
	if (mode == Modes.QUEUE) {
		if (msg.startsWith("!play ") || msg.startsWith("!search ")) {
			let arg,url;
			if (msg.startsWith("!play ")) {
				arg = msg.substring(6);
				if (arg == "" || !arg.match(".*href=\"[^\"]*\".*")) return; // check for a link
				url = arg.substring(arg.indexOf("href=\"") + 6, arg.indexOf("\"", arg.indexOf("href=\"") + 6));
				console.info("[INFO] Trying to play " + url + " from " + user.name);
			}
			else {
				arg = msg.substring(8);
				console.info("[INFO] Searching for " + arg);
				url = "ytsearch:" + arg;
			}
			queue.addSong(url).then((song) => {
				console.info("[INFO] Added \"" + song.name + "\" to queue.");
				db.incrementSong(song.url, song.name, song.duration);
				channel.sendMessage("Added \"" + song.name + "\" to queue.");
				if (queue.isPaused())
					channel.sendMessage("Bot is paused.");
				queue.start();
			}).catch((e) => {
				console.warn("[WARN] Error adding " + url + ": " + e);
				channel.sendMessage("Error adding " + url + ": " + e);
			});
		}
		if (msg == "!skip") {
			if (queue.isPlaying()) {
				console.info("[INFO] Skipping \"" + queue.nowPlaying.name + "\"");
				queue.skip();
			}
		}
		if (msg == "!queue" || msg == "!q") {
			let msg = "";
			if (queue.isPlaying()) 
				msg += "Now playing: " + queue.nowPlaying.name + " (" + queue.getCurrentPos() + "/" + queue.getCurrentDuration() + ")" + "<br>";
			msg += "<b>Current queue: " + queue.getQueueLength() + "</b><br>" 
			msg += queue.getQueue().replace(/\n/g, "<br>");
			channel.sendMessage(msg);
		}
	}
	
	// Playlist mode commands
	if (mode == Modes.PLAYLIST) {
		if (msg.startsWith("!play ") || msg.startsWith("!search "))
			channel.sendMessage("Error: Bot is in playlist mode. Type !stop to return the bot to queue mode.");
		if (msg == "!skip" && playlist.isPlaying()) {
			console.info("[INFO/Playlist] Skipping " + playlist.nowPlaying.title);
			playlist.skip();
		}
		if ((msg == "!queue" || msg == "!q") && playlist.isPlaying()) {
			res = "Now playing: " + playlist.nowPlaying.title + " (" + playlist.getCurrentPos() + "/" + playlist.getCurrentDuration() + ")<br>";
			if (playlist.nextSong)
				res += "Next: " + playlist.nextSong.title;
			channel.sendMessage(res);
		}
		if (msg == "!stop") {
			playlist.stop();
		}
	}

	// Global commands
	if (msg.startsWith("!playlist ") || msg.startsWith("!shuffle ")) {
		if (mode == Modes.PLAYLIST) {
			channel.sendMessage("Already playing a playlist!");
			return;
		}
		let arg,url,shuffle;
		if (msg.startsWith("!playlist ")) {
			arg = msg.substring(10);
			if (arg == "" || !arg.match(".*href=\"[^\"]*\".*")) return; // check for a link
			url = arg.substring(arg.indexOf("href=\"") + 6, arg.indexOf("\"", arg.indexOf("href=\"") + 6));
			shuffle = false;
			console.info("[INFO] Starting playlist " + url);
		}
		else {
			arg = msg.substring(9);
			if (arg == "" || !arg.match(".*href=\"*\".*")) return; // check for a link
			url = arg.substring(arg.indexOf("href=\"") + 6, arg.indexOf("\"", arg.indexOf("href=\"") + 6));
			shuffle = true;
			console.info("[INFO] Shuffling playlist " + url);
		}
		Playlist.startPlaylist(url, playlistID++, connection, channel, shuffle, () => {
			// shift modes back
			mode = Modes.QUEUE;
			playlist = undefined;
			console.debug("[DEBUG] Playlist stopped.");
			queue.resume();
		}).then((pl) => {
			playlist = pl;
			// shift modes
			mode = Modes.PLAYLIST;
			console.debug("[DEBUG] Playlist started.");
			db.incrementPlaylist(pl.ytdlID, pl.url, pl.name);
			queue.pause();
		}).catch((e) => {
			channel.sendMessage("Error starting playlist: " + e);
		});
	}
	if (msg.startsWith("!vol ")) {
		let gain = msg.substring(5) / 100;
		let target = getTarget();
		if (gain > 0 && gain <= 1) {
			target.setGain(gain);
			console.info("[INFO] Set volume to " + gain);
		}
		else {
			console.warn("[WARN] Invalid volume: " + gain);
			channel.sendMessage("Invalid volume. Please only use a volume from 1 to 100.");
		}
	}
	if (msg == "!vol") {
		let gain = getTarget().getGain();
		if (gain) {
			channel.sendMessage("Current volume: " + gain * 100 + "%");
		}
	}
	if (msg == "!pause") {
		let target = getTarget();
		console.info("[INFO] Paused.");
		target.pause();
	}
	if (msg == "!resume") {
		let target = getTarget();
		target.resume();
		console.info("[INFO] Resumed.");
	}
	if (msg == "!debug") {
		console.log(queue);
	}
	if (msg == "!help") { 
		channel.sendMessage("Command list: <br>" +
				"<ul>" +
				"<li><span style='font-family: monospace'>!play [url]</span>: Adds the URL to the queue.</li>" +
				"<li><span style='font-family: monospace'>!playlist [url]</span>: Plays the linked playlist and puts the bot in playlist mode.</li>" +
				"<li><span style='font-family: monospace'>!shuffle [url]</span>: Shuffles and plays the linked playlist.</li>" +
				"<li><span style='font-family: monospace'>!stop</span>: Stops playing the current playlist and returns the bot to queue mode.</li>" +
				"<li><span style='font-family: monospace'>!search [title]</span>: Searches YouTube for the video title and adds the first result to the queue.</li>" +
				"<li><span style='font-family: monospace'>!skip</span>: Skips the current song.</li>" +
				"<li><span style='font-family: monospace'>!pause</span>: Pauses the bot at the current location in the queue.</li>" +
				"<li><span style='font-family: monospace'>!resume</span>: Resumes the bot where it left off.</li>" +
				"<li><span style='font-family: monospace'>!queue</span>: Displays a list of all the songs in the queue.</li>" +
				"<li><span style='font-family: monospace'>!vol [volume]</span>: Sets the volume of the music bot. Volume must be a number between 1 and 100.</li>" +
				"<li><span style='font-family: monospace'>!help</span>: Displays this message.</li>" +
				"<li><span style='font-family: monospace'>!top</span>: Displays the top songs.</li>" +
		"</ul>");
	}
	if (msg == "!top") {
		let res = "<b>Top 10 songs: </b>";
		res += "<ol>";
		for (let song of db.getTopXSongs()) {
			let key = song[0];
			let val = song[1];
			res += `<li><a href="${key}">${val.name}</a></li>`;
		}
		res += "</ol>";
		res += "<b>Top 10 playlists: </b>";
		res += "<ol>";
		for (let playlist of db.getTopXPlaylists()) {
			res += `<li><a href="${playlist.url}">${playlist.name}</a></li>`;
		}
		res += "</ol>";
		channel.sendMessage(res);
	}
}

function getTarget() {
	if (mode == Modes.QUEUE) return queue;
	else if (mode == Modes.PLAYLIST) return playlist;
}

function connect() {
	let options = null;
	if (global.config.privkey && global.config.cert) options = {
		key: fs.readFileSync(global.config.privkey),
		cert: fs.readFileSync(global.config.cert)
	};
	mumble.connect(global.config.server, options, (e, connection) => {
		if (e) {
			console.error("[ERR] Unable to connect to the mumble server.");
			throw e;
		}
		queue = new SongQueue(connection);
		connection.authenticate(global.config.name, global.config.password);
		connection.on("initialized", () => {
			// Set bitrate only if specified
			if (global.config.bitrate) connection.connection.setBitrate(global.config.bitrate);
			channel = connection.channelByName(global.config.channel);
			if (!channel) channel = connection.rootChannel;
			// Automatically move back
			connection.on("user-move", (user) => {
				if (user.name == global.config.name) channel.join();
			})
			channel.join();
		})
		connection.on("message", (msg, user) => onMessage(msg, user, connection));
		// When the socket's closed, reconnect.
		// I wouldn't have to do this if there was an event for it
		connection.connection.socket.socket._events.close.push(() => {
			// Reset globals
			playing = false;
			queue = undefined;
			channel = undefined;
			// Reconnect
			console.warn("[WARN] Connection lost. Reconnecting...")
			connect();
		})
	});
}

connect();

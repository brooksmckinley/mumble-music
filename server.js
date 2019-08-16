var mumble = require("mumble"),
fs = require("fs");

var ytdl = require("./src/ytdl.js"),
SongQueue = require("./src/SongQueue.js"),
Playlist = require("./src/Playlist.js");

var config = JSON.parse(fs.readFileSync("config.json")); 

const Modes = {
		QUEUE: 0,
		PLAYLIST: 1
};

var playing = false;
var mode = Modes.QUEUE;
var queue = new SongQueue(config);
var playlist;
var playlistID = 0; // ID for playlist temp files to prevent collisions
var channel = undefined;


function onMessage(msg, user, connection) {
	// Queue mode commands
	if (mode == Modes.QUEUE) {
		if (msg.startsWith("!play ")) {
			let arg = msg.substring(6);
			if (arg == "" || !arg.match(".*href=\"*\".*")) return; // check for a link
			let url = arg.substring(arg.indexOf("href=\"") + 6, arg.indexOf("\"", arg.indexOf("href=\"") + 6));
			console.info("[INFO] Trying to play " + url + " from " + user.name);

			queue.addSong(url).then((song) => {
				console.info("[INFO] Added \"" + song.name + "\" to queue.");
				channel.sendMessage("Added \"" + song.name + "\" to queue.");
				queue.start(connection);
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
		if (msg == "!queue") {
			let msg = "";
			if (queue.isPlaying()) 
				msg += "Now playing: " + queue.nowPlaying.name + "<br>";
			msg += "Current queue: <br>" + queue.getQueue().replace(/\n/g, "<br>");
			channel.sendMessage(msg);
		}
		if (msg.startsWith("!search ")) {
			let arg = msg.substring(8);
			console.info("[INFO] Searching for " + arg);
			let url = "ytsearch:" + arg;

			queue.addSong(url).then((song) => {
				console.info("[INFO] Added \"" + song.name + "\" to queue.");
				channel.sendMessage("Added \"" + song.name + "\" to queue.");
				queue.start(connection);
			}).catch((e) => {
				console.warn("[WARN] Error adding \"" + arg + "\": " + e);
				channel.sendMessage("Error adding \"" + arg + "\": " + e);
			});
		}

	}
	
	// Playlist mode commands
	if (mode == Modes.PLAYLIST) {
		if (msg.startsWith("!play " || msg.startsWith("!search ")))
			channel.sendMessage("Error: Bot is in playlist mode. Type !stop to return the bot to queue mode.");
		if (msg == "!skip" && playlist.isPlaying()) {
			console.info("[INFO/Playlist] Skipping " + playlist.nowPlaying.title);
			playlist.skip();
		}
		if (msg == "!queue" && playlist.isPlaying()) {
			res = "Now playing: " + playlist.nowPlaying.title + "<br>";
			if (playlist.nextSong)
				res += "Next: " + playlist.nextSong.title;
			channel.sendMessage(res);
		}
		if (msg == "!stop") {
			playlist.stop();
		}
	}

	// Global commands
	if (msg.startsWith("!playlist ")) {
		if (mode == Modes.PLAYLIST) {
			channel.sendMessage("Already playing a playlist!");
		}
		let arg = msg.substring(10);
		if (arg == "" || !arg.match(".*href=\"*\".*")) return; // check for a link
		let url = arg.substring(arg.indexOf("href=\"") + 6, arg.indexOf("\"", arg.indexOf("href=\"") + 6));
		console.info("[INFO] Starting playlist " + url);
		Playlist.startPlaylist(url, playlistID++, connection, config, false, () => {
			// shift modes back
			mode = Modes.QUEUE;
			playlist = undefined;
			queue.resume();
		}).then((pl) => {
			playlist = pl;
			// shift modes
			mode = Modes.PLAYLIST;
			queue.pause();
		}).catch((e) => {
			channel.sendMessage("Error starting playlist: " + e);
		});
	}
	// FIXME: Do this without repetition
	if (msg.startsWith("!shuffle ")) {
		if (mode == Modes.PLAYLIST) {
			channel.sendMessage("Already playing a playlist!");
			return;
		}
		let arg = msg.substring(9);
		if (arg == "" || !arg.match(".*href=\"*\".*")) return; // check for a link
		let url = arg.substring(arg.indexOf("href=\"") + 6, arg.indexOf("\"", arg.indexOf("href=\"") + 6));
		console.info("[INFO] Starting playlist " + url);
		Playlist.startPlaylist(url, playlistID++, connection, config, true, () => {
			// shift modes back
			mode = Modes.QUEUE;
			playlist = undefined;
			queue.resume();
		}).then((pl) => {
			playlist = pl;
			// shift modes
			mode = Modes.PLAYLIST;
			queue.pause();
		}).catch((e) => {
			channel.sendMessage("Error starting playlist: " + e);
		});
	}
	if (msg.startsWith("!vol ")) {
		let arg = msg.substring(5);
		let target = getTarget();
		if (arg > 0 && arg <= 100) {
			let gain = arg / 100;
			target.setGain(gain);
			console.info("[INFO] Set volume to " + gain);
		}
		else {
			console.warn("[WARN] Invalid volume: " + arg);
			channel.sendMessage("Invalid volume. Please only use a volume from 1 to 100.");
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
		"</ul>");
	}
}

function getTarget() {
	if (mode == Modes.QUEUE) return queue;
	else if (mode == Modes.PLAYLIST) return playlist;
}

function connect() {
	mumble.connect(config.server, null, (e, connection) => {
		if (e) {
			console.error("[ERR] Unable to connect to the mumble server.");
			throw e;
		}
		connection.authenticate(config.name, config.password);
		connection.on("initialized", () => {
			// Set bitrate only if specified
			if (config.bitrate) connection.connection.setBitrate(config.bitrate);
			channel = connection.channelByName(config.channel);
			if (!channel) channel = connection.rootChannel;
			// Automatically move back
			connection.on("user-move", (user) => {
				if (user.name == config.name) channel.join();
			})
			channel.join();
		})
		connection.on("message", (msg, user) => onMessage(msg, user, connection));
		// When the socket's closed, reconnect.
		// I wouldn't have to do this if there was an event for it
		connection.connection.socket.socket._events.close.push(() => {
			// Reset globals
			playing = false;
			queue = new SongQueue(config);
			channel = undefined;
			// Reconnect
			console.warn("[WARN] Connection lost. Reconnecting...")
			connect();
		})
	});
}

connect();

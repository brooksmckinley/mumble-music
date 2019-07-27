var mumble = require("mumble"),
fs = require("fs");

var ytdl = require("./src/ytdl.js"),
SongQueue = require("./src/SongQueue.js");

var config = JSON.parse(fs.readFileSync("config.json")); 

var playing = false;
var queue = new SongQueue(config);
var channel = undefined;


function onMessage(msg, user, connection) {
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
		if (queue.isPlaying) {
			console.info("[INFO] Skipping \"" + queue.nowPlaying.name + "\"");
		}
		queue.skip();
	}
	if (msg == "!queue") {
		channel.sendMessage("Now playing: " + queue.nowPlaying.name + "<br>" +
				"Current queue: <br>" + queue.getQueue().replace(/\n/g, "<br>"));
	}
	if (msg == "!debug") {
		console.log(queue);
	}
	if (msg == "!help") {
		channel.sendMessage("Command list: <br>" +
				"<ul>" +
				"<li><span style='font-family: monospace'>!play [url]</span>: Adds the URL to the queue.</li>" +
				"<li><span style='font-family: monospace'>!search [title]</span>: Searches YouTube for the video title and adds the first result to the queue.</li>" +
				"<li><span style='font-family: monospace'>!skip</span>: Skips the current song.</li>" +
				"<li><span style='font-family: monospace'>!queue</span>: Displays a list of all the songs in the queue.</li>" +
				"<li><span style='font-family: monospace'>!vol [volume]</span>: Sets the volume of the music bot. Volume must be a number between 1 and 100.</li>" +
				"<li><span style='font-family: monospace'>!help</span>: Displays this message.</li>" +
		"</ul>");
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
	if (msg.startsWith("!vol ")) {
		let arg = msg.substring(5);
		if (arg > 0 && arg <= 100) {
			let gain = arg / 100;
			queue.setGain(gain);
			console.info("[INFO] Set volume to " + gain);
		}
		else {
			console.warn("[WARN] Invalid volume: " + arg);
			channel.sendMessage("Invalid volume. Please only use a volume from 1 to 100.");
		}
	}
	if (msg == "!pause") {
		console.info("[INFO] Paused.");
		queue.pause();
		channel.sendMessage("Paused.");
	}
	if (msg == "!resume") {
		queue.resume();
		console.info("[INFO] Resumed.");
	}
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

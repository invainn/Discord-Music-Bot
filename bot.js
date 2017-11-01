// Essentials
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const YT = require('simple-youtube-api');

// Discord client
const client = new Discord.Client();
const youtube = new YT(process.env.YT_API);
const token = process.env.TOKEN;

// Global variables
var guilds = {};

// Ready callback
client.on('ready', () => {
  console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', async (message) => {
  if(!message.guild) return;
  checkBanned(message);
  if(message.content.includes('_')) {
 	ytVid(message);
 	coinFlip(message);
  }
});

function guildInit(id) {
	guilds[id] = {}; // init object
	guilds[id].songs = []; // initialize the song queue
	guilds[id].songlist = []; // maintaining names of songs
	guilds[id].isSpeaking = false;
	guilds[id].dispatcher = null;
	guilds[id].stream = null;
}

function ytVid(message) {
	if(message.content.startsWith('_stop')) {
		stopCommand(message);
	} else if(message.content.startsWith('_skip')) {
		skipCommand(message);
	} else if(message.content.startsWith('_play https://www.youtube.com/')) {
		playCommand(message, false);
	} else if(message.content.startsWith('_vsearch')) {
		playCommand(message, true);
	} else if(message.content.startsWith('_queue')) {
		queueList(message);
	} else if(message.content.startsWith('_clear')) {
		clearQueue(message);
	} else if(message.content.startsWith('_help')) {
		helpCommand(message);
	} else if(message.content.startsWith('_volume')) {
		volumeCommand(message);
	}
}

function coinFlip(message) {
	if(message.content.startsWith('_coinflip')) {
		let result = Math.round(Math.random());

		if(result) {
			message.reply('Heads!');
		} else {
			message.reply('Tails!');
		}

	}
}

function helpCommand(message) {
	const embed = new Discord.RichEmbed()
	  .setAuthor("Commands", client.user.avatarURL)
	  .setDescription('These are currently the commands')
	  .setColor(0xecf0f1)
	  .setTimestamp()

	  .addField('_stop', 'Stops the current song')
	  .addField('_play [youtube_link]', 'Plays a youtube link')
	  .addField('_skip', 'Skips the current song')
	  .addField('_queue', 'Lists the songs in queue')
	  .addField('_volume [volume_num]', 'Changes volume of the current song')
	  .addField('_vsearch [search_string]', 'Searches a song from YT and plays the first result')
	  .addField('_clear', 'Clears the queue')
	  .addField('_coinflip', 'Flips a coin');

	  message.channel.send({embed});
}

function clearQueue(message) {
	if(guilds[message.guild.id].songs > 0) {
		guilds[message.guild.id].songs.length = 0;
		guilds[message.guild.id].songlist.length = 0;
	}
}

function queueList(message) {
	let builtString = '';
	if(guilds[message.guild.id].songlist.length > 0) {
		guilds[message.guild.id].songlist.forEach((song, i) => {
			builtString += ((i+1)+'. '+song+'\n');
		});
		const embed = new Discord.RichEmbed()
		  .setTitle("Songs in Queue -")
		  .setColor(0xecf0f1)
		  .setDescription(builtString)
		  .setTimestamp()
		message.channel.send({embed});
	} else {
		const embed = new Discord.RichEmbed()
		  .setTitle("No songs in Queue")
		  .setColor(0xecf0f1)
		  .setTimestamp()
		message.channel.send({embed});
	}
}

// need to implement fully
function volumeCommand(message) {
	if(message.member.voiceChannel.connection) {
		var pos = message.content.indexOf(' ');
		var volume = parseFloat(message.content.slice(pos+1, message.content.length));

		if(volume > 100 || volume < 0) {
			message.reply('volume out of range!');
			return;
		}

		guilds[message.guild.id].dispatcher.setVolume(volume/100.0);
		message.channel.send('Volume changed to: ' + volume);
	}
}

function stopCommand(message) {
	if(message.member.voiceChannel.connection) {
		message.member.voiceChannel.connection.disconnect();
		guilds[message.guild.id].isSpeaking = false;
		clearQueue(message);
	} else {
		message.reply('not in a channel');
	}
}

function skipCommand(message) {
	if(guilds[message.guild.id].dispatcher) {
		guilds[message.guild.id].dispatcher.end();
	}
}

async function playCommand(message, isSearch) {
  	if(message.member.voiceChannel) {
  		
	  	message.member.voiceChannel.join().then(connection => connection).catch(console.log);

	  	if(guilds[message.guild.id] === undefined) {
	  		guildInit(message.guild.id);
	  	}

	  	// vsearch
	  	if(isSearch) {
		  	let pos = message.content.indexOf(' ');
		  	let searchString = message.content.slice(pos+1, message.content.length);
		  	try {
		  		let videos = await youtube.searchVideos(searchString, 1);
		  		message.content = videos[0].url;
		  	} catch (e) {
		  		return message.channel.send('Unable to find video\n' + e);
		  	}
	  	}

	  	guilds[message.guild.id].songs.push(message);

	  	if(!guilds[message.guild.id].isSpeaking) {
	  		guilds[message.guild.id].isSpeaking = true;
	  		playYTvid(guilds[message.guild.id].songs.shift());
	  	} else {
	  		try {
	  			let video = await youtube.getVideoByID(getYTID(message))
	  				.then(v => {
	  					message.channel.send('Added ' + v.title + ' to queue');
	  					guilds[message.guild.id].songlist.push(v.title);
	  				})
	  				.catch(console.log);
	  		} catch (e) {
	  			console.log('Could not grab title\n' + e);
	  			message.channel.send('Unable to get title');

	  		}
	  	}
	} else {
	  	message.reply('join a channel');
	}
}

function getYTID(message) {
	var pos = message.content.indexOf('=');
  	var ytID = message.content.slice(pos+1, pos+12); // yt id is 11 chars
  	return ytID;
}

async function playYTvid(message) {
	// Start streaming if not playing
	guilds[message.guild.id].stream = ytdl('https://www.youtube.com/watch?v=' + getYTID(message), { filter: 'audioonly' });
	guilds[message.guild.id].dispatcher = message.member.voiceChannel.connection.playStream(guilds[message.guild.id].stream);
	guilds[message.guild.id].songlist.shift();

	try {
		var video = await youtube.getVideo('https://www.youtube.com/watch?v=' + getYTID(message))
			.then(v => {
				channelVideoMessage(message, v);
			})
			.catch(console.log);
	} catch (e) {
		message.channel.send('Unable to get video title');
		console.log(e);
	}

	// it works but it's not pretty
	guilds[message.guild.id].dispatcher.setMaxListeners(1);

	guilds[message.guild.id].dispatcher.on('end', () => {
		if(guilds[message.guild.id].isSpeaking && (guilds[message.guild.id].songs.length > 0)) {
			setTimeout(function() {
				playYTvid(guilds[message.guild.id].songs.shift());
			}, 100);
		} else {
			message.member.voiceChannel.connection.disconnect();
			guilds[message.guild.id].isSpeaking = false;
		}
	});
}

function channelVideoMessage(message, video) {
	let description;

	// description cannot exceed 2048 characters
	if(video.description.length > 512) description = video.description.substring(0, 511);

	const embed = new Discord.RichEmbed()
	  .setAuthor(video.title, video.maxRes.url)
	  .setDescription(description)
	  .setColor(0xecf0f1)
	  .setThumbnail(video.maxRes.url)
	  .setTimestamp()
	  .setURL(video.url);

	  message.channel.send('Playing');
	  message.channel.send({embed});
}

// Login
client.login(token);
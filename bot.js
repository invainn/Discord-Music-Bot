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
	} else if(message.content.startsWith('_skipto')) {
		skipToCommand(message.member, message.guild, message.channel, message.content);
	} else if(message.content.startsWith('_play https://www.youtube.com/')) {
		playCommand(message.member, message.guild, message.channel, message.content, false);
	} else if(message.content.startsWith('_vsearch')) {
		playCommand(message.member, message.guild, message.channel, message.content, true);
	} else if(message.content.startsWith('_queue')) {
		queueList(message);
	} else if(message.content.startsWith('_clear')) {
		clearQueue(message);
	} else if(message.content.startsWith('_help')) {
		helpCommand(message);
	} else if(message.content.startsWith('_playlist')) {
		playlistCommand(message.member, message.guild, message.channel, message.content);
	} else if(message.content.startsWith('_skip')) {
		skipCommand(message.guild);
	} else if(message.content.startsWith('_volume')) {
		volumeCommand(message);
	}
}

function skipToCommand(member, guild, channel, content) {
	if(guilds[guild.id].songs.length > 0) {
		let pos = content.indexOf(' ');
		let num = parseInt(content.slice(pos+1, content.length))-1;

		if(num > guilds[guild.id].songs.length-1 || num < 0) {
			return channel.send('Out of range!');
		} else {
			for(var i = 0; i < num; i++) {
				guilds[guild.id].songs.shift();
				guilds[guild.id].songlist.shift();
			}

			skipCommand(guild);
		}
	}
}

async function playlistCommand(member, guild, channel, content) {
	if(content.includes('https://www.youtube.com/playlist?list=')) {
		let pos = content.indexOf('=');
		let playlistID = content.slice(pos+1, content.length);

		const playlist = await youtube.getPlaylistByID(playlistID);
		const videos = await playlist.getVideos();

		for(const video of Object.values(videos)) {
			let tempVideo = await youtube.getVideoByID(video.id).then(v => {
			if(member.voiceChannel.connection) {
				guilds[guild.id].songs.push(v.id);
				guilds[guild.id].songlist.push(v.title);
			} else {
				let tempContent = 'https://www.youtube.com/watch?v=' + v.id;
				playCommand(member, guild, channel, tempContent, false);
			}
			}).catch(console.log);
		}
		channel.send('Added ' + playlist.title + ' playlist to queue!');
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
	  .addField('_coinflip', 'Flips a coin')
	  .addField('_playlist [playlist_link]', 'Plays entire playlist')
	  .addField('_skipto [song_number]', 'Skips to the song in the queue');

	  message.channel.send({embed});
}

function clearQueue(message) {
	if(guilds[message.guild.id].songs.length > 0) {
		guilds[message.guild.id].songs.length = 0;
		guilds[message.guild.id].songlist.length = 0;
	}
}

function queueList(message) {
	let builtString = '';
	if(guilds[message.guild.id].songlist.length) {
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
		message.reply('I\'m not in the channel');
	}
}

function skipCommand(guild) {
	if(guilds[guild.id].dispatcher) {
		guilds[guild.id].dispatcher.end();
	}
}

async function playCommand(member, guild, channel, content, isSearch) {
  	if(member.voiceChannel) {
  		
	  	member.voiceChannel.join().then(connection => connection).catch(console.log);

	  	if(guilds[guild.id] === undefined) {
	  		guildInit(guild.id);
	  	}

	  	// vsearch
	  	if(isSearch) {
		  	let pos = content.indexOf(' ');
		  	let searchString = content.slice(pos+1, content.length);
		  	try {
		  		let videos = await youtube.searchVideos(searchString, 1);
		  		content = videos[0].url;
		  	} catch (e) {
		  		return channel.send('Unable to find video\n' + e);
		  	}
	  	}

	  	guilds[guild.id].songs.push(getYTID(content));

	  	if(!guilds[guild.id].isSpeaking) {
	  		guilds[guild.id].isSpeaking = true;
	  		playYTvid(member, guild, channel, content, guilds[guild.id].songs.shift());
	  	} else {
	  		try {
	  			let video = await youtube.getVideoByID(getYTID(content))
	  				.then(v => {
	  					channel.send('Added ' + v.title + ' to queue');
	  					guilds[guild.id].songlist.push(v.title);
	  				})
	  				.catch(console.log);
	  		} catch (e) {
	  			console.log('Could not grab title\n' + e);
	  			channel.send('Unable to get title');

	  		}
	  	}
	} else {
	  	channel.send('Join a channel');
	}
}

function getYTID(content) {
	var pos = content.indexOf('=');
  	var ytID = content.slice(pos+1, pos+12); // yt id is 11 chars
  	return ytID;
}

async function playYTvid(member, guild, channel, content, videoID) {
	// Start streaming if not playing
	guilds[guild.id].stream = ytdl('https://www.youtube.com/watch?v=' + videoID, { filter: 'audioonly' });
	guilds[guild.id].dispatcher = member.voiceChannel.connection.playStream(guilds[guild.id].stream);
	guilds[guild.id].songlist.shift();

	try {
		var video = await youtube.getVideo('https://www.youtube.com/watch?v=' + videoID)
			.then(v => {
				channelVideoMessage(channel, v);
			})
			.catch(console.log);
	} catch (e) {
		channel.send('Unable to get video title');
		console.log(e);
	}

	// it works but it's not pretty
	guilds[guild.id].dispatcher.setMaxListeners(1);

	guilds[guild.id].dispatcher.on('end', () => {
		if(guilds[guild.id].isSpeaking && (guilds[guild.id].songs.length > 0)) {
			setTimeout(function() {
				playYTvid(member, guild, channel, content, guilds[guild.id].songs.shift());
			}, 100);
		} else {
			member.voiceChannel.connection.disconnect();
			guilds[guild.id].isSpeaking = false;
		}
	});
}

function channelVideoMessage(channel, video) {
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

	  channel.send('Playing');
	  channel.send({embed});
}

// Login
client.login(token);

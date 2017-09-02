// Essentials
const Discord = require('discord.js');
const client = new Discord.Client();
const token = 'redacted';

// YouTube init
const ytdl = require('ytdl-core');
const streamOptions = { seek: 0, volume: 1 };
var stream = null;
var dispatcher = null;
var songQueue = [];

// Ready callback
client.on('ready', () => {
  console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', message => {
  if (message.content === 'user') {
    message.channel.send(message.author.username);
  }

  if(!message.guild) return;

  if(message.content.includes('^play https://www.youtube.com/')) {
  	if(message.member.voiceChannel) {
	  	message.member.voiceChannel.join()
	  	    .catch(console.log);
	} else {
	  	message.reply('you need to join a channel');
	}

	if(message.member.voiceChannel.connection.speaking) {
		songQueue.push(message);
	}
	console.log(message.member.voiceChannel.connection.speaking);

	if(dispatcher == null) {
		// Start streaming youtube video
		stream = ytdl('https:://www.youtube.com/watch?v=' + getYTID(message), { filter: 'audioonly' });
		dispatcher = message.member.voiceChannel.connection.playStream(stream);
	}

	// Fires twice??
	dispatcher.once('end', () => {
		if(songQueue[0]) {
			stream = ytdl('https:://www.youtube.com/watch?v=' + getYTID(songQueue.shift()), { filter: 'audioonly' });
			dispatcher = message.member.voiceChannel.connection.playStream(stream);
		} else {
			message.reply('ending song');
		}
	});

	dispatcher.on('error', (err) => {
		console.log(err);
	});
  }

	if(message.content == '^skip') {
		if(dispatcher) dispatcher.end();
 	}

 	if(message.content == '^stop') {
 		if(message.member.voiceChannel.connection) message.member.voiceChannel.connection.disconnect();
 	}
});

function getYTID(message) {
	var pos = message.content.indexOf('=');
  	var ytID = message.content.slice(pos+1, message.content.length);
  	return ytID;
}


// Login
client.login(token);
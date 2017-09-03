// Essentials
const Discord = require('discord.js');
const client = new Discord.Client();
const token = 'MzUzNTA0NDAyODEzNzQ3MjAw.DIzxWQ.lRqA99P5NgfcAttGSLOvmPS-FYg';

// YouTube init
const ytdl = require('ytdl-core');
var voiceConnection = null;
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
	  	  .then(connection => {
	  	  	voiceConnection = connection;
	  	  })
	  	    .catch(console.log);
	} else {
	  	message.reply('you need to join a channel');
	}

	// if it's speaking, then enqueue, if not, play from dequeue, or play from message
	if(message.member.voiceChannel.connection.speaking) {
		songQueue.push(message);
	} else if(!songQueue[0]) {
		playYTvid(message);
	}
	console.log(message.member.voiceChannel.connection.speaking);

	// Fires twice??
	dispatcher.on('end', () => {
		if(songQueue[0]) {
			playYTvid(songQueue.shift());
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

function playYTvid(message) {
	// Start streaming if not playing
	stream = ytdl('https:://www.youtube.com/watch?v=' + getYTID(message), { filter: 'audioonly' });
	dispatcher = message.member.voiceChannel.connection.playStream(stream);
}


// Login
client.login(token);
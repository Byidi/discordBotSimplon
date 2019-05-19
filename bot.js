const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
const bookmarks = require('./bookmarks.js');
const tools = require('./tools.js');

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);

	bookmarks.prepareSql();
});

client.on('message', msg => {
	if (msg.content === 'ping') {
		msg.reply('pong');
	}

	if (msg.content.startsWith('!')){
		console.log("---------------------------------");
		console.log("msg : "+msg.content);

		if(!tools.isDMChannel(msg)){
			//msg.delete(500);
		}

		const regex_action = /^\!(.[^\s]+)/;
		const action = (regex_action.exec(msg.content) === null)?"":regex_action.exec(msg.content)[1];

		switch(action){
			case 'bm':
				bookmarks.action(msg);
			break;
			case 'help':
				// TODO: send to help global
			break;
			default:
				msg.author.send("Commande inconnue.\n Tape '!help' pour plus d'information");
		}
	}
});

client.login(auth.discord_token);

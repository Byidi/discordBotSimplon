const Discord = require('discord.js');
const Auth = require('./auth.json');
const Bookmarks = require('./bookmarks.js');
const Tools = require('./tools.js');

const client = new Discord.Client();

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);

	Bookmarks.prepareSql();
});

client.on('message', msg => {
	if(Tools.isInAuthorizedChan(msg)){
		if (msg.content === 'ping') {
			msg.reply('pong');
		}

		if (msg.content.startsWith('!')){
			if(!Tools.isDMChannel(msg)){
				msg.delete(500);
			}

			const regex_action = /^\!(.[^\s]+)/;
			const action = (regex_action.exec(msg.content) === null)?"":regex_action.exec(msg.content)[1];

			switch(action){
				case 'bm':
					Bookmarks.action(msg);
				break;
				case 'help':
					// TODO: send to help global
				break;
				default:
					msg.author.send("Commande inconnue.\n Tape '!help' pour plus d'information");
			}
		}
	}
});

client.login(Auth.discord_token);

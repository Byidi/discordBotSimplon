const discord = require('discord.js');
const tools = require('./tools.js');
const auth = require('./auth.json');
const config = require('./config.json');

const client = new discord.Client();
var plugins = {};

client.on('ready', () => {
	config.plugins.forEach(function(p){
		plugins[p['name']] = require(p['file']);
	});

	for(let name in plugins){
		if(typeof plugins[name].load !== 'undefined' && typeof plugins[name].load === 'function'){
			plugins[name].load();
		}
	};

	console.log(`Logged in as ${client.user.tag}!`);

});

client.on('message', msg => {
	if(tools.isInAuthorizedChan(msg)){
		if (msg.content === 'ping') {
			msg.reply('pong');
		}

		if (msg.content.startsWith('!')){
			if(!tools.isDMChannel(msg)){
				msg.delete(500);
			}

			const regex_action = /^\!(.[^\s]+)/;
			const action = (regex_action.exec(msg.content) === null)?"":regex_action.exec(msg.content)[1];
			console.log(msg.content);
			var plugin_action = false;
			for(let name in plugins){
				if(typeof plugins[name].command !== 'undefined' && typeof plugins[name].command === 'function'){
					if(plugins[name].command() == action){
						plugins[name].action(msg);
						plugin_action = true;
					}
				}
			}

			if(!plugin_action){
				switch(action){
					case 'help':
						for(var name in plugins){
							if(typeof plugins[name].help !== 'undefined' && typeof plugins[name].help === 'function'){
								plugins[name].help(msg);
							}
						}
					break;
					default:
						msg.author.send("Commande inconnue.\n Tape '!help' pour plus d'information");
				}
			}
		}
	}
});

client.login(auth.discord_token);

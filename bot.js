const Discord = require('discord.js');
const Tools = require('./tools.js');
const Auth = require('./auth.json');
const Config = require('./config.json');

// Config.plugins.forEach(function(plugin){
// 	console.log("Name : "+JSON.stringify(plugin));
// });


// const Bookmarks = require('./bookmarks.js');

const client = new Discord.Client();
var plugins = {};

client.on('ready', () => {
	Config.plugins.forEach(function(p){
		plugins[p['name']] = require(p['file']);
	});

	for(var name in plugins){
		if(typeof plugins[name].log !== 'undefined' && typeof plugins[name].log === 'function'){
			plugins[name].log();
		}
		if(typeof plugins[name].prepareSql !== 'undefined' && typeof plugins[name].prepareSql === 'function'){
			plugins[name].prepareSql();
		}
	};

	console.log(`Logged in as ${client.user.tag}!`);

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
			console.log(msg.content);
			plugin_action = false;
			for(var name in plugins){
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

client.login(Auth.discord_token);

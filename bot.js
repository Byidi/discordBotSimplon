const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');

const SQLite = require("better-sqlite3");
const sql = new SQLite('./sql/bookmark.sqlite');

function isURL(s) {
	 var regexp = /^(https?|ftp):\/\/[\w.-]+(?:\.[\w\.-]+)[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/
     return regexp.test(s);
}

function shortenTitle(title){
	console.log('title : '+title);
	console.log('title : '+JSON.stringify(title));
	return (title.length > 50)?title.substring(0, 50)+'...':title;
}

function getUnique(arr, comp) {
	const unique = arr.map(e => e[comp]).map((e, i, final) => final.indexOf(e) === i && i).filter(e => arr[e]).map(e => arr[e]);
	return unique;
}

function help(func, msg){
	const reply = new Discord.RichEmbed();
	switch(func){
		case 'bm':
			reply.setColor('#0099FF');
			reply.setTitle('Commande');
			reply.setDescription('\
				!bm add url tag1,tag2 : Ajoute un lien en rapport avec les tags. Nombre de tag non limité\n \
				!bm search tag1,tag2 : Recherche un lien en rapport avec les tags. Nombre de tag non limité \
			');
			msg.author.send(reply);
		break;
		default:
			reply.setColor('#0099FF');
			reply.setTitle('Commande');
			reply.setDescription('\
				!bm add url tag1,tag2 : Ajoute un lien en rapport avec les tags. Nombre de tag non limité\n \
				!bm search tag1,tag2 : Recherche un lien en rapport avec les tags. Nombre de tag non limité \
			');
			msg.author.send(reply);
	}
}

function saveBookmark(bm){
	new_bookmark = client.setBookmark.run(bm);
    bm['tags'].forEach(function(tag){
        tag_by_name = client.getTagByName.all(tag);
        if (tag_by_name.length == 0){
            new_tag = client.setTag.run({name:tag});
            tag_id = new_tag['lastInsertRowid'];
        }else{
            tag_id = tag_by_name[0]['id'];
        }
        client.setBookmarkTag.run({'id_bookmark':new_bookmark['lastInsertRowid'],'id_tag':tag_id});
    });
    return true;
}

function bookmarkAdd(args, msg){
	if(args.length != 3){
		msg.author.send("Commande incorrecte.\nTape '!bm help' pour plus d'information");
		return false;
	}
	if(sql.prepare("SELECT count(*) AS cmp FROM bookmark WHERE link='"+args[1]+"';").get()['cmp'] > 0){
		msg.author.send("Ce lien est déjà enregistré.");
		return false;
	}
	if(!isURL(args[1])){
		msg.author.send("Format de l'url incorrect.\nTape '!bm help' pour plus d'information");
		return false;
	}

	const bm = {
		id : '',
		link : args[1],
		tags : args[2].split(','),
		point : 0,
		user : msg.author.id
	}
	if(saveBookmark(bm)){
		const reply = new Discord.RichEmbed();
		reply.setColor('#0099FF');
		reply.setTitle(shortenTitle(args[1]));
		reply.setURL(bm['link']);
		reply.setDescription('**Tags : **'+args[2]);
		reply.setAuthor("Proposé par "+msg.author.username);

		msg.channel.send(reply);
		return true;
	}else{
		msg.author.send("Erreur lors de l'enregistrement de votre lien.");
		return false;
	}
}

function bookmarkSearch(args, msg){
    if(args.length != 2){
        msg.author.send("Commande incorrecte.\nTape '!bm help' pour plus d'information");
        return false;
    }

	bookmarks = [];
	args[1].split(',').forEach(function(tag){
		console.log("searching for "+tag);
		bookmarksByTag = client.getBookmarkByTagName.all(tag);
		bookmarks.push(bookmarksByTag);
		console.log("FIND by "+tag+" : "+JSON.stringify(bookmarksByTag));
	});
	console.log("ALL BOOKMARK FIND : "+JSON.stringify(bookmarks));
	console.log("ALL BOOKMARK FIND FILTER : "+JSON.stringify(getUnique(bookmarks,'id')));
	bookmarks = getUnique(bookmarks,'id');

	bookmarks[0].forEach(function(bm){
		console.log("bm : "+JSON.stringify(bm));
		const reply = new Discord.RichEmbed();
		reply.setColor('#0099FF');
		reply.setTitle(shortenTitle(bm['link']));
		reply.setURL(bm['link']);
		/********* TODO ***********/
		//reply.setAuthor("Proposé par "+client.fetchUser(bm['user']).username);

		msg.author.send(reply);
	});
	return true;
}

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);

	const table_bookmark = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'bookmark';").get();
	if (!table_bookmark['count(*)']) {
		sql.prepare("CREATE TABLE if not exists bookmark (id INTEGER PRIMARY KEY AUTOINCREMENT, link TEXT, point INTEGER, user INTEGER)").run();
		sql.prepare("CREATE UNIQUE INDEX index_bookmark ON bookmark(id);").run();
		sql.pragma("synchronous = 1");
		sql.pragma("journal_mode = wal");
	}

    const table_tag = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'tag';").get();
    if (!table_tag['count(*)']) {
        sql.prepare("CREATE TABLE if not exists tag (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)").run();
        sql.prepare("CREATE UNIQUE INDEX index_tag ON tag(id);").run();
        sql.pragma("synchronous = 1");
        sql.pragma("journal_mode = wal");
    }

    const table_bookmark_tag = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'bookmark_tag';").get();
    if (!table_bookmark_tag['count(*)']) {
        sql.prepare("CREATE TABLE if not exists bookmark_tag (id INTEGER PRIMARY KEY AUTOINCREMENT, id_tag INTEGER, id_bookmark INTEGER)").run();
        sql.prepare("CREATE UNIQUE INDEX index_bookmark_tag ON bookmark_tag(id);").run();
        sql.pragma("synchronous = 1");
        sql.pragma("journal_mode = wal");
    }

	client.setBookmark = sql.prepare('INSERT INTO bookmark (link, point, user) VALUES (@link, @point, @user)');
	client.setTag = sql.prepare('INSERT INTO tag(name) VALUES (@name)');
	client.setBookmarkTag = sql.prepare('INSERT INTO bookmark_tag (id_bookmark, id_tag) VALUES (@id_bookmark, @id_tag)');

	client.getTagByName = sql.prepare('SELECT * FROM tag WHERE name = ?');
	client.getBookmarkByTagName = sql.prepare('\
		SELECT DISTINCT \
			bookmark.id AS id, \
			bookmark.link AS link, \
			bookmark.point AS point, \
			bookmark.user AS user \
		FROM \
			bookmark, tag, bookmark_tag \
		WHERE \
			bookmark.id = bookmark_tag.id_bookmark AND \
			tag.id = bookmark_tag.id_tag AND \
			tag.name = ? \
	');
});

client.on('message', msg => {
	if (msg.content === 'ping') {
		msg.reply('pong');
		if(msg.channel.type != 'DMChannel'){
			msg.delete(500);
		}
	}

    if (msg.content.startsWith('!bm')){
		if(msg.channel.type != 'DMChannel'){
			msg.delete(500);
		}
		const args = msg.content.slice(4).split(' ');
		console.log("args"+JSON.stringify(args));
		console.log("action : "+args[0]);
		switch(args[0]){
			case 'add':
				bookmarkAdd(args, msg);
			break;
			case 'search':
                bookmarkSearch(args, msg);
			break;
			case 'help':
				help('bm', msg);
			break;
			default :
				msg.author.send("Commande inconnue.\n Tape '!bm help' pour plus d'information");
		}
	}
});

client.login(auth.discord_token);

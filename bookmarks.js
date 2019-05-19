const Discord = require('discord.js');
const client = new Discord.Client();
const SQLite = require("better-sqlite3");
const sql = new SQLite('./sql/bookmark.sqlite');
const tools = require('./tools.js')

module.exports = {
    prepareSql : function(){
        const table_bookmark = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'bookmark';").get();
    	if (!table_bookmark['count(*)']) {
    		sql.prepare("CREATE TABLE if not exists bookmark (id INTEGER PRIMARY KEY AUTOINCREMENT, link TEXT, description TEXT, point INTEGER, user INTEGER)").run();
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

    	client.setBookmark = sql.prepare('INSERT INTO bookmark (link, description, point, user) VALUES (@link, @description, @point, @user)');
    	client.setTag = sql.prepare('INSERT INTO tag(name) VALUES (@name)');
    	client.setBookmarkTag = sql.prepare('INSERT INTO bookmark_tag (id_bookmark, id_tag) VALUES (@id_bookmark, @id_tag)');

    	client.getTagByName = sql.prepare('SELECT * FROM tag WHERE name = ?');
    	client.getBookmarkByTagName = sql.prepare('\
    		SELECT DISTINCT \
    			bookmark.id AS id, \
    			bookmark.link AS link, \
    			bookmark.description AS description, \
    			bookmark.point AS point, \
    			bookmark.user AS user \
    		FROM \
    			bookmark, tag, bookmark_tag \
    		WHERE \
    			bookmark.id = bookmark_tag.id_bookmark AND \
    			tag.id = bookmark_tag.id_tag AND \
    			tag.name = ? \
    	');
    	client.getTagUseCount = sql.prepare(' \
    		SELECT DISTINCT\
    			tag.id AS tid, \
    			tag.name, \
    			(SELECT count(*) FROM bookmark_tag WHERE bookmark_tag.id_tag=tag.id) AS cmp \
    		FROM \
    			tag,bookmark_tag \
    		WHERE \
    			tag.id = bookmark_tag.id_tag \
    		ORDER BY cmp DESC \
    	');
    },
    
    help : function (msg){
    	const reply = new Discord.RichEmbed();
		reply.setColor('#0099FF');
		reply.setTitle('Commande');
		reply.setDescription('\
			**!bm add url tag1,tag2 **: Ajoute un lien en rapport avec les tags. Nombre de tag non limité\n\
			**!bm search tag1,tag2 **: Recherche un lien en rapport avec les tags. Nombre de tag non limité\n\
			**!bm tag **: Liste les tags enregistrés.\
		');
		msg.author.send(reply);
    },

    save : function (bm){
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
    },

    add : function (url, tags, desc, msg){
    	if(url == "" || tags == ""){
    		msg.author.send("Commande incorrecte.\nTape '!bm add help' pour plus d'information");
    		return false;
    	}
    	if(!tools.isURL(url)){
    		msg.author.send("Format de l'url incorrect.\nTape '!bm add help' pour plus d'information");
    		return false;
    	}
    	if(sql.prepare("SELECT count(*) AS cmp FROM bookmark WHERE link='"+url+"';").get()['cmp'] > 0){
    		msg.author.send("Ce lien est déjà enregistré.");
    		return false;
    	}

    	const bm = {
    		id : '',
    		link : url,
    		tags : tags.split(','),
    		description : desc,
    		point : 0,
    		user : msg.author.id
    	}

    	if(this.save(bm)){
    		const reply = new Discord.RichEmbed();
    		reply.setColor('#0099FF');
    		reply.setTitle(tools.shorten(bm['link']),50);
    		reply.setURL(bm['link']);
    		reply.setDescription('**Description : **'+bm['description']+'\n\n**Tags : **'+bm['tags']);
    		reply.setAuthor("Proposé par "+msg.author.username);

    		msg.channel.send(reply);
    		return true;
    	}else{
    		msg.author.send("Erreur lors de l'enregistrement de votre lien.");
    		return false;
    	}
    },

    search: function (tags, msg) {
    	bookmarks_list = [];
    	tags.split(',').forEach(function(tag){
    		bookmarks_by_tag = client.getBookmarkByTagName.all(tag);
    		bookmarks_list.push(bookmarks_by_tag);
    	});
    	bookmarks_list = tools.getUnique(bookmarks_list,'id');

    	bookmarks_list[0].forEach(function(bm){
    		const reply = new Discord.RichEmbed();
    		reply.setColor('#0099FF');
    		reply.setTitle(tools.shorten(bm['link']),50);
    		reply.setDescription(bm['description']);
    		reply.setURL(bm['link']);
    		// TODO: SET AUTHOR id -> username
    		// reply.setAuthor("Proposé par "+client.fetchUser(bm['user']).username);

    		if(tools.isDMChannel(msg)){
    			msg.channel.send(reply);
    		}else{
    			msg.author.send(reply);
    		}
    	});
    	return true;
    },

    tag : function (msg){
    	tags = client.getTagUseCount.all();
    	tag_list = "";
    	tags.forEach(function(tag){
    		tag_list += '- '+tag['name']+' ('+tag['cmp']+' liens)\n';
    	});
    	const reply = new Discord.RichEmbed();
    	reply.setColor('#0099FF');
    	reply.setTitle('Liste des tags :');
    	reply.setDescription(tag_list);
    	if(tools.isDMChannel(msg)){
    		msg.channel.send(reply);
    	}else{
    		msg.author.send(reply);
    	}
    },

    action : function(msg){
        const regex_subaction = /^\!(?:.[^\s]+)\s+(.[^\s]+)/;
        const subaction = (regex_subaction.exec(msg.content) === null)?"":regex_subaction.exec(msg.content)[1];

        switch(subaction){
            case 'add':
                regex_url = /^\!(?:.[^\s]+)\s+(?:.[^\s]+)\s+(.[^\s]+)/;
                regex_tags = /^\!(?:.[^\s]+)\s+(?:.[^\s]+)\s+(?:.[^\s]+)\s+(.[^\s]+)/;
                regex_desc = /^\!(?:.[^\s]+)\s+(?:.[^\s]+)\s+(?:.[^\s]+)\s+(?:.[^\s]+)\s+(.*)/;

                url = (regex_url.exec(msg.content) === null)?"help":regex_url.exec(msg.content)[1];
                tags = (regex_tags.exec(msg.content) === null)?"":regex_tags.exec(msg.content)[1];
                desc = (regex_desc.exec(msg.content) === null)?"":regex_desc.exec(msg.content)[1];

                if (url == "help"){
                    // TODO: send to help bm add
                    console.log("bm add help");
                }else{
                    this.add(url, tags, desc, msg);
                }
            break;
            case 'search':
                regex_tags = /^\!(?:.[^\s]+)\s+(?:.[^\s]+)\s+(.*)/;
                tags = (regex_tags.exec(msg.content) === null)?"help":regex_tags.exec(msg.content)[1];
                if (tags == "help"){
                    // TODO: send to help bm search
                    console.log("bm search help");
                }else{
                    this.search(tags, msg);
                }
            break;
            case 'tag':
                this.tag(msg);
            break;
            case 'help':
                console.log("bm help");
                this.help(msg);
            break;
            default :
                msg.author.send("Commande inconnue.\n Tape '!bm help' pour plus d'information");
        }
    }
}

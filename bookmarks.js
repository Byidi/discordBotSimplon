const discord = require('discord.js');
const tools = require('./tools.js');
const sqlite = require("better-sqlite3");

const client = new discord.Client();
const sql = new sqlite('./sql/bookmark.sqlite');


module.exports = {
    command: function(){
            return "bm";
    },

    load: function(){
        prepareSql();
        console.log("Plugin bookmark loaded");
    },

    action : function(msg){
        const regex = /^\!([^\s]+)[\s]?([^\s]+)?[\s]?([^\s]+)?[\s]?([^\s]+)?[\s]?(.+)?/;
        msg_split = regex.exec(msg.content);

        switch(msg_split[2]){
            case 'add':
                if (msg_split[3] == "help"){
                    this.help(msg,"add");
                }else{
                    this.add(msg_split[3], msg_split[4], msg_split[5], msg);
                }
            break;
            case 'search':
                if (msg_split[3] == "help" || msg_split[3] === undefined){
                    this.help(msg,"search");
                }else{
                    this.search(msg_split[3], msg);
                }
            break;
            case 'delete':
                if (msg_split[3] == "help"){
                    this.help(msg,"delete");
                }else{
                    this.delete(msg, msg_split[3]);
                }
            break;
            case 'edit':
                // TODO:
                // if (msg_split[3] == "help"){
                //     this.help(msg,"edit");
                // }else{
                //     this.edit(msg);
                // }
            break;
            case 'tag':
                this.tag(msg);
            break;
            case 'help':
                this.help(msg);
            break;
            default :
                msg.author.send("Commande inconnue.\n Tape '!bm help' pour plus d'information");
        }
    },

    help : function (msg, action='*'){
       const reply = new discord.RichEmbed();

		reply.setColor('#0099FF');
		reply.setTitle('Commande');

        switch(action){
            case 'add':
                reply.setDescription('\
        			**!bm add url tag1,tag2 description**: Ajoute un lien en rapport avec les tags. Nombre de tag illimité. \
                ');
            break;
            case 'search':
                reply.setDescription('\
        			**!bm search tag1,tag2 **: Recherche un lien en rapport avec les tags. Nombre de tag illimité.\
                ');
            break;
            case 'tag':
                reply.setDescription('\
        			**!bm tag **: Liste les tags enregistrés.\
                ');
            case 'delete':
                reply.setDescription('\
                    **!bm delete**: Liste les bookmarks que vous pouvez supprimer.\n\
                    **!bm delete <id>**: Supprime le bookmard <id>, si vous en êtes le créateur.\
                ');
            break;
            default:
                reply.setDescription('\
        			**!bm add <url> <tag1,tag2> <description>**: Ajoute un lien en rapport avec les tags. Nombre de tag non limité\n\
        			**!bm search <tag1,tag2> **: Recherche un lien en rapport avec les tags. Nombre de tag non limité\n\
        			**!bm tag **: Liste les tags enregistrés.\n\
                    **!bm delete**: Liste les bookmarks que vous pouvez supprimer.\n\
                    **!bm delete <id>**: Supprime le bookmard <id>, si vous en êtes le créateur.\
                ');
        }

		msg.author.send(reply);
    },

    add : function (url, tags, desc, msg){
    	if(url == null || tags == null){
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

    	if(save(bm)){
    		const reply = new discord.RichEmbed();
    		reply.setColor('#0099FF');
    		reply.setTitle(tools.shorten(bm['link']),50);
    		reply.setURL(bm['link']);
            reply_description = "";
            if(!bm['description'] == null){
                reply_description += "**Description : **'+bm['description']+'\n\n";
            }
            reply_description += '**Tags : **'+bm['tags'];
    		reply.setDescription(reply_description);
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

        const reply = new discord.RichEmbed();
        reply.setColor("#0099FF");
        search_result = '';
        bookmarks_list[0].forEach(function(bm){
            search_result += '['+tools.shorten(bm['link'],50)+']('+tools.shorten(bm['link'],50)+')\n';
            if(!bm['description'] == null){
                search_result +=  "**Description : **'+bm['description']+'\n\n";
            }
            search_result += '**Tags : ** '+bm['tags']+'\n\n';
            // TODO: SET AUTHOR id -> username
            // reply.setAuthor("Proposé par "+client.fetchUser(bm['user']).username);

        });

        if(search_result == ""){
            search_result = "Aucun lien enregistrés ne correspond à votre recherche.";
        }

        reply.addField('Résultat de votre recherche : ', search_result, true);
        if(tools.isDMChannel(msg)){
            msg.channel.send(reply);
        }else{
            msg.author.send(reply);
        }
    	return true;
    },

    edit: function(msg){
        // TODO:
    },

    delete: function(msg, id){
        int_regex = new RegExp('[0-9]+');
        if(id === undefined){
            bookmark_user = client.getBookmarkByUser.all(msg.author.id);

            const reply = new discord.RichEmbed();
            reply.setColor("#0099FF");
            delete_result = ' ';
            bookmark_user.forEach(function(bm){
                delete_result += bm['id']+') ['+tools.shorten(bm['link'],50)+']('+tools.shorten(bm['link'],50)+')\n';
                if(!bm['description'] == null){
                    delete_result +=  "**Description : **'+bm['description']+'\n\n";
                }
            });
            if(bookmark_user.length != 0){
                reply.addField('Selectionner le lien que vous souhaiter supprimer.\nPuis taper !bm delete <id> : ', delete_result, true);
            }else{
                reply.setTitle('Vous n\'avez enregistré aucun bookmark pour le moment.');
            }
            msg.author.send(reply);
        }else if (id == parseInt(id, 10)){
            if(deleteBookmark(id)){
            const reply = new discord.RichEmbed();
    		reply.setColor('#0099FF');
            reply.setTitle(' ');
    		reply.setDescription("Votre bookmark a bien été supprimé.");

    		msg.channel.send(reply);
    		return true;
    	}else{
    		msg.author.send("Erreur lors de l'enregistrement de votre lien.");
    		return false;
    	}
        }else{
            this.help(msg, "delete");
        }
    },

    tag : function (msg){
    	tags = client.getTagUseCount.all();
        console.log("TAGS : "+JSON.stringify(tags));
    	tag_list = "";
    	tags.forEach(function(tag){
    		tag_list += '- '+tag['tname']+' ('+tag['cmp']+' liens)\n';
    	});
    	const reply = new discord.RichEmbed();
    	reply.setColor('#0099FF');
        if(tags.length != 0){
	       reply.setTitle('Liste des tags :');
           reply.setDescription(tag_list);
        }else{
            reply.setTitle("Aucun bookmark n'a été enregistré.")
        }
    	if(tools.isDMChannel(msg)){
    		msg.channel.send(reply);
    	}else{
    		msg.author.send(reply);
    	}
    }
}

function deleteBookmark(id){
    let deleteBookmarkTag = client.deleteBookmarkTag.run(id);
    let deleteBookmark = client.deleteBookmark.run(id);
    return true;
};

function save(bm){
	let new_bookmark = client.setBookmark.run(bm);
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
};

function prepareSql(){
    const tableBookmark = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'bookmark';").get();
    if (!tableBookmark['count(*)']) {
        sql.prepare("CREATE TABLE if not exists bookmark (id INTEGER PRIMARY KEY AUTOINCREMENT, link TEXT, description TEXT, point INTEGER, user INTEGER)").run();
        sql.prepare("CREATE UNIQUE INDEX index_bookmark ON bookmark(id);").run();
        sql.pragma("synchronous = 1");
        sql.pragma("journal_mode = wal");
    }

    const tableTag = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'tag';").get();
    if (!tableTag['count(*)']) {
        sql.prepare("CREATE TABLE if not exists tag (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)").run();
        sql.prepare("CREATE UNIQUE INDEX index_tag ON tag(id);").run();
        sql.pragma("synchronous = 1");
        sql.pragma("journal_mode = wal");
    }

    const tableBookmarkTag = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'bookmark_tag';").get();
    if (!tableBookmarkTag['count(*)']) {
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
            bookmark.user AS user, \
            (SELECT GROUP_CONCAT(tag.name) FROM tag, bookmark_tag WHERE bookmark_tag.id_bookmark = bookmark.id AND bookmark_tag.id_tag = tag.id) AS tags\
        FROM \
            bookmark, tag, bookmark_tag \
        WHERE \
            bookmark.id = bookmark_tag.id_bookmark AND \
            tag.id = bookmark_tag.id_tag AND \
            tag.name = ? \
    ');
    client.getBookmarkByUser = sql.prepare('\
        SELECT \
            bookmark.id AS id,\
            bookmark.link AS link,\
            bookmark.description AS description,\
            bookmark.point AS point \
        FROM \
            bookmark \
        WHERE \
            bookmark.user = ?\
    ');
    client.getTagUseCount = sql.prepare(' \
        SELECT DISTINCT\
            tag.id AS tid, \
            tag.name AS tname, \
            (SELECT count(*) FROM bookmark_tag WHERE bookmark_tag.id_tag=tag.id) AS cmp \
        FROM \
            tag, bookmark_tag \
        WHERE \
            tag.id = bookmark_tag.id_tag \
        ORDER BY cmp DESC \
    ');
    client.deleteBookmarkTag = sql.prepare('DELETE FROM bookmark_tag WHERE bookmark_tag.id_bookmark = ?');
    client.deleteBookmark = sql.prepare('DELETE FROM bookmark WHERE bookmark.id = ? ');
}

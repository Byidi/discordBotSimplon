/*jshint esversion: 9 */

const discord = require('discord.js');
const tools = require('../../tools.js');
const sqlite = require('better-sqlite3');

const client = new discord.Client();
const sql = new sqlite('./sql/bookmark.sqlite');

var msg = null;

module.exports = {
    command: function(){
            return "bm";
    },

    load: function(){
        prepareSql();
        console.log("Plugin bookmark loaded");
    },

    action : function(message){
        msg = message;
        const regex = /^\!([^\s]+)[\s]?([^\s]+)?[\s]?([^\s]+)?[\s]?([^\s]+)?[\s]?(.+)?/;
        let msgSplit = regex.exec(msg.content);

        switch(msgSplit[2]){
            case 'add':
                if (msgSplit[3] == "help"){
                    help("add");
                }else{
                    add(msgSplit[3], msgSplit[4], msgSplit[5]);
                }
            break;
            case 'search':
                if (msgSplit[3] == "help" || msgSplit[3] === undefined){
                    help("search");
                }else{
                    search(msgSplit[3]);
                }
            break;
            case 'delete':
                if (msgSplit[3] == "help"){
                    help("delete");
                }else{
                    remove(msgSplit[3]);
                }
            break;
            case 'edit':
                if (msgSplit[3] == "help"){
                    help("edit");
                }else{
                    edit(msgSplit[3]);
                }
            break;
            case 'tag':
                tag();
            break;
            case 'help':
                help();
            break;
            default :
                msg.author.send("Commande inconnue.\n Tape '!bm help' pour plus d'information");
        }
    }
};

// TODO: NEED REWORK
// function edit(msg, id){
//     if(id === undefined){
//         bookmarkUser = client.getBookmarkByUser.all(msg.author.id);
//         const reply = new discord.RichEmbed();
//         reply.setColor("#0099FF");
//         editResult = ' ';
//         bookmarkUser.forEach(function(bm){
//             editResult += bm.id + ') [' + tools.shorten(bm.link, 50) + '](' + tools.shorten(bm.link, 50) + ")\n";
//             if(bm.description != null){
//                 editResult +=  "**Description : **'+bm['description']+'\n\n";
//             }
//         });
//         if(bookmarkUser.length != 0){
//             reply.addField('Selectionner le bookmark que vous souhaiter éditer.\nPuis taper **!bm edit <id> (url:<url>) (tag:<tag1,tag2,...>) (desc:<description>)** : ', editResult, true);
//         }else{
//             reply.setTitle('Vous n\'avez enregistré aucun bookmark pour le moment.');
//         }
//         msg.author.send(reply);
//     }else if (id == parseInt(id, 10)) {
//         let regex = /\!bm edit (?:[0-9]+)(?:\s+)?(?:url:([^\s]+))?(?:\s+)?(?:tag:([^\s]+))?(?:\s+)?(?:desc:(.+)$)?/;
//         let msgSplit = regex.exec(msg);
//
//         if(msgSplit[1] != undefined && !tools.isURL(msgSplit[1])){
//             msg.author.send("Format de l'url incorrect.");
//             return false;
//         }else if(msgSplit[1] != undefined && sql.prepare("SELECT count(*) AS cmp FROM bookmark WHERE link='"+msgSplit[1]+"';").get().cmp > 0){
//             msg.author.send("Ce lien est déjà enregistré.");
//             return false;
//         }else{
//             if(saveEdit(msg, id, msgSplit[1], msgSplit[2], msgSplit[3])) {
//                 var bm = client.getBookmarkById.get(id);
//                 const reply = new discord.RichEmbed();
//                 reply.setColor('#0099FF');
//                 editResult = '['+tools.shorten(bm.link, 50) + '](' + tools.shorten(bm.link, 50) + ")\n";
//                 editResult += '**Tags : ** '+bm.tags + "\n";
//                 if(bm.description != null){
//                     editResult +=  "**Description : **" + bm.description + "\n\n";
//                 }
//                 reply.addField('Modification bien enregistrée. : ', editResult, true);
//
//                 msg.author.send(reply);
//                 return true;
//             }else{
//                 msg.author.send("Erreur lors de l'enregistrement de votre édition.");
//                 return false;
//             }
//         }
//     }else{
//         this.help(msg, "edit");
//     }
// }
//
// function saveEdit(msg, id, url=null, tag=null, desc=null){
//     if (url != null) {
//         let updateBookmarkUrl = client.updateBookmarkUrl.run(url, id);
//     }
//
//     if (tag != null) {
//         let deleteBookmarkTag = client.deleteBookmarkTag.run(id);
//         saveBookmarkTag(id, tag.split(','));
//     }
//
//     if (desc != null) {
//         let updateBookmarkDesc = client.updateBookmarkDesc.run(desc, id);
//     }
//
//     return true;
// }


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
    client.getBookmarkByTagName = sql.prepare(
        'SELECT DISTINCT '+
            'bookmark.id AS id,' +
            'bookmark.link AS link,' +
            'bookmark.description AS description,' +
            'bookmark.point AS point,' +
            'bookmark.user AS user,' +
            '(SELECT GROUP_CONCAT(tag.name) FROM tag, bookmark_tag WHERE bookmark_tag.id_bookmark = bookmark.id AND bookmark_tag.id_tag = tag.id) AS tags ' +
        'FROM ' +
            'bookmark, tag, bookmark_tag ' +
        'WHERE ' +
            'bookmark.id = bookmark_tag.id_bookmark AND ' +
            'tag.id = bookmark_tag.id_tag AND ' +
            'tag.name = ?');
    client.getBookmarkById = sql.prepare(
        'SELECT '+
            'bookmark.id AS id, '+
            'bookmark.link AS link, '+
            'bookmark.description AS description, '+
            'bookmark.point AS point, '+
            'bookmark.user AS user, '+
            '(SELECT GROUP_CONCAT(tag.name) FROM tag, bookmark_tag WHERE bookmark_tag.id_bookmark = bookmark.id AND bookmark_tag.id_tag = tag.id) AS tags '+
        'FROM '+
            'bookmark '+
        'WHERE '+
            'bookmark.id = ? ');
    client.getBookmarkByUser = sql.prepare(
        'SELECT '+
            'bookmark.id AS id, '+
            'bookmark.link AS link,'+
            'bookmark.description AS description,'+
            'bookmark.point AS point '+
        'FROM '+
            'bookmark '+
        'WHERE '+
            'bookmark.user = ?');
    client.getTagUseCount = sql.prepare(
        'SELECT DISTINCT '+
            'tag.id AS tid, '+
            'tag.name AS tname, '+
            '(SELECT count(*) FROM bookmark_tag WHERE bookmark_tag.id_tag=tag.id) AS cmp '+
        'FROM '+
            'tag, bookmark_tag '+
        'WHERE '+
            'tag.id = bookmark_tag.id_tag '+
        'ORDER BY cmp DESC ');

    client.deleteBookmarkTag = sql.prepare('DELETE FROM bookmark_tag WHERE bookmark_tag.id_bookmark = ?');
    client.deleteBookmark = sql.prepare('DELETE FROM bookmark WHERE bookmark.id = ? ');

    client.updateBookmarkUrl = sql.prepare('UPDATE bookmark SET link = ? WHERE id = ? ');
    client.updateBookmarkDesc = sql.prepare('UPDATE bookmark SET description = ? WHERE id = ? ');
}

function reply(type, channel, title, desc, obj=null){

    const reply = new discord.RichEmbed();

    switch(type){
        case 'error':
            reply.setColor('#ee0528');
        break;
        case 'success':
            reply.setColor('#1dd506');
        break;
        case 'warning':
            reply.setColor('#f18b05');
        break;
        default:
            reply.setColor('#105ff7');
    }

    reply.setTitle(title);

    let description = '';
    switch(desc){
        case 'add':
            description += '[' + tools.shorten(obj.link,50) + '](' + tools.shorten(obj.link,50) + ')\n';
            description += '**Tags : **' + obj.tags + '\n';
            if(obj.description != null) {
                description += '**Description : **' + obj.description + '\n';
            }
        break;
        default:
            description = desc;
    }
    reply.setDescription(description);

    if (channel == 'private'){
        msg.author.send(reply);
    }else{
        msg.channel.send(reply);
    }
}

function help(action='*'){
    let description = "";
    if( action == 'add' || action == '*'){
        description += '**!bm add <url> <tag1,tag2> (<description>)**: Ajoute un lien en rapport avec les tags. Nombre de tag non limité\n';
    }
    if( action == 'search' || action == '*'){
        description += '**!bm search <tag1,tag2,...> **: Recherche un lien en rapport avec les tags. Nombre de tag illimité.\n';
    }
    if( action == 'tag' || action == '*'){
        description += '**!bm tag **: Liste les tags enregistrés.\n';
    }
    if( action == 'delete' || action == '*'){
        description += '**!bm delete**: Liste les bookmarks que vous pouvez supprimer.\n';
        description += '**!bm delete <id>**: Supprime le bookmard <id>, si vous en êtes le créateur.\n';
    }
    if( action == 'edit' || action == '*'){
        description += '**!bm edit**: Liste les bookmarks que vous pouvez éditer.\n';
        description += '**!bm edit <id> (url:<url>) (tag:<tag1,tag2,...>) (desc:<description>)**: Supprime le bookmard <id>, si vous en êtes le créateur.\n';
    }

    reply('success', 'private', 'Information', description);
}

function add(url, tags, desc){
    if(url == null || tags == null){
        reply('error', 'private', 'Commande incorrect', 'Tape \'!bm add help\' pour plus d\'information');
        return false;
    }
    if(!tools.isURL(url)){
        reply('error', 'private', 'Format de l\'url incorrect', 'Tape \'!bm add help\' pour plus d\'information');
        return false;
    }
    if(sql.prepare("SELECT count(*) AS cmp FROM bookmark WHERE link='"+url+"';").get().cmp > 0){
        reply('warning', 'private', 'Impossible d\'enregistrer votre lien', 'Ce lien est déjà enregistré.');
        return false;
    }

    let bm = {
        id : '',
        link : url,
        tags : tags.split(','),
        description : desc,
        point : 0,
        user : msg.author.id
    };

    if(save(bm)){
        reply('success', 'public', 'Lien enregistré par '+msg.author.username, "add", bm);
        return true;
    }else{
		reply('error', 'private', 'Erreur', 'Une erreur a eu lieu lors de l\'enregistrement de votre lien.');
		return false;
	}
}

function save(bm){
    let newBookmark = client.setBookmark.run(bm);
    console.log(newBookmark);
    if (newBookmark.changes >= 1){
        saveBookmarkTag(newBookmark.lastInsertRowid, bm.tags);
        return true;
    }else{
        return false;
    }
}

function saveBookmarkTag(id_bookmark, tags){
    for( var i = 0; i < tags.length; i++){
        let tagByName = client.getTagByName.all(tags[i]);
        let tagId = null;
        if (tagByName.length == 0){
            let newTag = client.setTag.run({name:tags[i]});
            if (newTag.changes >= 1){
                tagId = newTag.lastInsertRowid;
            }else{
                return false;
            }
        }else{
            tagId = tagByName[0].id;
        }
        let setBookmark = client.setBookmarkTag.run({'id_bookmark':id_bookmark, 'id_tag':tagId});
        if(setBookmark.changes < 1){
            return false;
        }
    }
    return true;
}

function tag(){
    tags = client.getTagUseCount.all();
    tagList = "";
    tags.forEach(function(tag){
        tagList += '- ' + tag.tname + ' (' + tag.cmp + ' liens)\n';
    });

    if(tags.length != 0){
       reply('success', 'private', 'Liste des tags :', tagList);
    }else{
        reply('warning', 'private', 'Liste des tags :','Aucun bookmark n\'a été enregistré.');
    }
}

function search (tags) {
    let bookmarksList = [];
    tags.split(',').forEach(function(tag){
        let bookmarksByTag = client.getBookmarkByTagName.all(tag);
        bookmarksList.push(bookmarksByTag);
    });
    bookmarksList = tools.getUnique(bookmarksList, "id");

    let searchResult = "";
    bookmarksList[0].forEach(function(bm){
        searchResult += '['+tools.shorten(bm.link,50)+']('+tools.shorten(bm.link,50)+")\n";
        searchResult += "**Tags : **" + bm.tags + "\n";
        if(bm.description != null){
            searchResult +=  "**Description : **" + bm.description + "\n\n";
        }
        // TODO: SET AUTHOR id -> username
    });

    if(searchResult == ""){
        searchResult = "Aucun lien enregistrés ne correspond à votre recherche.";
        reply('warning', 'private', 'Résultat de votre recherche :', 'Aucun lien enregistré ne correspond à votre recherche.');
    }else{
        reply('success', 'private', 'Résultat de votre recherche :', searchResult);
    }
}

function listBookmarkUser(id){
    let bookmarkUser = client.getBookmarkByUser.all(id);

    let result = '';
    if(bookmarkUser.length != 0){
        bookmarkUser.forEach(function(bm){
            result += bm.id + ') ['+tools.shorten(bm.link, 50) + '](' + tools.shorten(bm.link, 50) + ")\n";
            if(bm.description != null){
                result +=  "**Description : **" + bm.description + "\n\n";
            }
        });
    }
    return result;
}

function remove(id=null){
    if(id == null){
        let bookmarkUser = listBookmarkUser(msg.author.id);
        if(bookmarkUser != ''){
            reply('success', 'private', 'Selectionner le bookmark que vous souhaiter supprimer.\nPuis taper !bm delete <id> : ', bookmarkUser);
        }else{
            reply('warning', 'private', 'Aucun bookmark à supprimer', 'Vous n\'avez enregistré aucun bookmark pour le moment.');
        }
    }else if (id == parseInt(id, 10)){
        if(deleteBookmark(id)){
            reply('success', 'private', 'Suppresion', 'Votre bookmark a bien été supprimé.');
        }else{
            reply('error', 'private', 'Suppresion', 'Erreur lors de la suppresion du bookmark.');
        }
    }else{
        help("delete");
    }
}

function deleteBookmark(id){
    let deleteBookmarkTag = client.deleteBookmarkTag.run(id);
    if(deleteBookmarkTag.changes < 1){
        return false;
    }
    let deleteBookmark = client.deleteBookmark.run(id);
    if(deleteBookmark.changes < 1){
        return false;
    }
    return true;
}

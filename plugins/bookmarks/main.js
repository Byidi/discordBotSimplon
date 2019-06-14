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
        const regex = /^\!([^\s]+)[\s]?([^\s]+)?[\s]?(.+)?/;
        let msgSplit = regex.exec(msg.content);

        if(msgSplit[3] == "help"){
            help(msgSplit[2]);
        }else{
            switch(msgSplit[2]){
                case 'add':
                    add(msgSplit[3]);
                break;
                case 'search':
                    search(msgSplit[3]);
                break;
                case 'delete':
                    remove(msgSplit[3]);
                break;
                case 'edit':
                    edit(msgSplit[3]);
                break;
                case 'tag':
                    tag();
                break;
                case 'help':
                    help();
                break;
                default :
                    tools.reply(msg, 'error', 'private', 'Commande inconnue', 'Tape \'!bm help\' pour plus d\'information');
            }
        }
    }
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

    tools.reply(msg, 'success', 'private', 'Information', description);
}

function add(args){
    const addRegex = /^([^\s]+)?[\s]?([^\s]+)?[\s]?(.+)?/;
    let addSplit = addRegex.exec(args);
    if(addSplit[1] == null || addSplit[2] == null){
        tools.reply(msg, 'error', 'private', 'Commande incorrect', 'Tape \'!bm add help\' pour plus d\'information');
        return false;
    }
    if(!tools.isURL(addSplit[1])){
        tools.reply(msg, 'error', 'private', 'Format de l\'url incorrect', 'Tape \'!bm add help\' pour plus d\'information');
        return false;
    }
    if(sql.prepare("SELECT count(*) AS cmp FROM bookmark WHERE link='"+addSplit[1]+"';").get().cmp > 0){
        tools.reply(msg, 'warning', 'private', 'Impossible d\'enregistrer votre lien', 'Ce lien est déjà enregistré.');
        return false;
    }

    let bm = {
        id : '',
        link : addSplit[1],
        tags : addSplit[2].split(','),
        description : addSplit[3],
        point : 0,
        user : msg.author.id
    };

    if(save(bm)){
        description = '[' + tools.shorten(bm.link,50) + '](' + tools.shorten(bm.link,50) + ')\n';
        description += '**Tags : **' + bm.tags + '\n';
        if(bm.description != null) {
            description += '**Description : **' + bm.description + '\n';
        }

        tools.reply(msg, 'success', 'public', 'Lien enregistré par '+msg.author.username, description);
        return true;
    }else{
		tools.reply(msg, 'error', 'private', 'Erreur', 'Une erreur a eu lieu lors de l\'enregistrement de votre lien.');
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
        tools.reply(msg, 'success', 'private', 'Liste des tags :', tagList);
    }else{
        tools.reply(msg, 'warning', 'private', 'Liste des tags :','Aucun bookmark n\'a été enregistré.');
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
        tools.reply(msg, 'warning', 'private', 'Résultat de votre recherche :', 'Aucun lien enregistré ne correspond à votre recherche.');
    }else{
        tools.reply(msg, 'success', 'private', 'Résultat de votre recherche :', searchResult);
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
            tools.reply(msg, 'success', 'private', 'Selectionner le bookmark que vous souhaiter supprimer.\nPuis taper !bm delete <id> : ', bookmarkUser);
        }else{
            tools.reply(msg, 'warning', 'private', 'Aucun bookmark à supprimer', 'Vous n\'avez enregistré aucun bookmark pour le moment.');
        }
    }else if (id == parseInt(id, 10)){
        if(deleteBookmark(id)){
            tools.reply(msg, 'success', 'private', 'Suppresion', 'Votre bookmark a bien été supprimé.');
        }else{
            tools.reply(msg, 'error', 'private', 'Suppresion', 'Erreur lors de la suppresion du bookmark.');
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

function edit(args){

    let editRegex = /^([0-9]+)?(?:\s+)?(?:url:([^\s]+))?(?:\s+)?(?:\s+)?(?:tag:([^\s]+))?(?:\s+)?(?:desc:(.+)$)?/;
    let editSplit = editRegex.exec(args);

    if(editSplit[1] == undefined){
        let bookmarkUser = listBookmarkUser(msg.author.id);
        if(bookmarkUser != ''){
            tools.reply(msg, 'success', 'private', 'Selectionner le bookmark que vous souhaiter éditer.\nPuis taper !bm delete <id> : ', bookmarkUser);
        }else{
            tools.reply(msg, 'warning', 'private', 'Aucun bookmark à éditer', 'Vous n\'avez enregistré aucun bookmark pour le moment.');
        }
    }else if(editSplit[1] == parseInt(editSplit[1],10)){
        if(editSplit[2] != undefined && !tools.isURL(editSplit[2])){
            tools.reply(msg, 'error', 'private', 'Erreur d\'édition', 'Format de l\'url invalide');
        }else if(editSplit[2] != undefined && sql.prepare("SELECT count(*) AS cmp FROM bookmark WHERE link='"+editSplit[2]+"';").get().cmp > 0){
            tools.reply(msg, 'warning', 'private', 'Erreur d\'édition', 'Ce lien est déjà enregistré.');
        }else{
            if(saveEdit(editSplit[1], editSplit[2], editSplit[3], editSplit[4])) {
                tools.reply(msg, 'success', 'private', 'Edition', 'Modification bien enregistrée');
            }else{
                tools.reply(msg, 'error', 'private', 'Erreur d\'édition', 'Erreur lors de l\'enregistrement de votre modification');
            }
        }
    }else{
        tools.reply(msg, 'error', 'private', 'Commande inconnue', 'Tape \'!bm edit help\' pour plus d\'information');
    }
}

function saveEdit(id, url=null, tag=null, desc=null){
    let error = false;
    if (url != null) {
        let updateBookmarkUrl = client.updateBookmarkUrl.run(url, id);
        if(updateBookmarkUrl.changes < 1){
            error = true;
        }
    }

    if (tag != null) {
        console.log("edit tag");
        let deleteBookmarkTag = client.deleteBookmarkTag.run(id);
        if(deleteBookmarkTag.changes < 1){
            error = true;
        }
        if(!saveBookmarkTag(id, tag.split(','))){
            error = true;
        }
    }

    if (desc != null) {
        let updateBookmarkDesc = client.updateBookmarkDesc.run(desc, id);
        if(updateBookmarkDesc.changes < 1){
            error = true;
        }
    }

    return !error;
}

/*jshint esversion: 9 */

const discord = require('discord.js');
const tools = require('../../tools.js');
const sqlite = require('better-sqlite3');
const client = new discord.Client();

const sql = new sqlite('./sql/calendar.sqlite');

var msg = null;

module.exports = {
    command: function(){
            return "cal";
    },

    load: function(){
        prepareSql();
        console.log("Plugin calendar loaded");
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
                case 'edit':
                    edit(msgSplit[3]);
                break;
                case 'delete':
                    remove(msgSplit[3]);
                break;
                case 'list':
                    list(msgSplit[3]);
                break;
                case 'help':
                    help();
                break;
                default :
                    tools.reply(msg, 'error', 'private', 'Commande inconnue', 'Tape \'!cal help\' pour plus d\'information');
            }
        }
    }
};

function prepareSql(){
    const tableEvent = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'event';").get();
    if (!tableEvent['count(*)']) {
        sql.prepare("CREATE TABLE if not exists event (id INTEGER PRIMARY KEY AUTOINCREMENT, start INTEGER, end INTEGER, title TEXT, description TEXT, creator INTEGER)").run();
        sql.prepare("CREATE UNIQUE INDEX index_event ON event(id);").run();
        sql.pragma("synchronous = 1");
        sql.pragma("journal_mode = wal");
    }
}

function add(args){
    // TODO:
    console.log("calendar add");
}

function remove(args){
    // TODO:
    console.log("calendar delete");
}

function edit(args){
    // TODO:
    console.log("calendar edit");
}

function help(action='*'){
    // TODO:
    console.log("calendar help");
}

function list(args){
    // TODO:
    console.log("calendar list");
}

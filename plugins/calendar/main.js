/*jshint esversion: 9 */

const discord = require('discord.js');
const tools = require('../../tools.js');
const sqlite = require('better-sqlite3');
const client = new discord.Client();

const sql = new sqlite('./sql/calendar.sqlite');
const config = require('./config.json');

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
    client.setEvent = sql.prepare('INSERT INTO event (start, end, title, description, creator) VALUES (@startDate, @endDate, @title, @description, @creator)');
}

function add(args){
    let addRegex = /^(?<startDay>[0-9]{1,2})\/(?<startMonth>[0-9]{1,2})(?:\/(?<startYear>[0-9]{4}))?(?:-(?<startHour>[0-9]{1,2}):(?<startMin>[0-9]{1,2}))?(?:\s(?<endDay>[0-9]{1,2})\/(?<endMonth>[0-9]{1,2})(?:\/(?<endYear>[0-9]{4}))?(?:-(?<endHour>[0-9]{1,2}):(?<endMin>[0-9]{1,2}))?)?\s(?<title>.+(?=desc:))?(?:desc:)?(?<description>.+)?$/;

    let addSplit = addRegex.exec(args);
    if (addSplit != null){
        addSplit = fixOptionnal(addSplit);
        if(addSplit.groups.title == undefined){
            tools.reply(msg, 'error', 'private', 'Commande erronée', 'Le titre de l\'évènement est obligatoire.\nTape \'!cal add help\' pour plus d\'information');
            return false;
        }

        let startDate = new Date(addSplit.groups.startYear, addSplit.groups.startMonth-1, addSplit.groups.startDay, addSplit.groups.startHour, addSplit.groups.startMin);
        let endDate = new Date(addSplit.groups.endYear, addSplit.groups.endMonth-1, addSplit.groups.endDay, addSplit.groups.endHour, addSplit.groups.endMin);

        var newEvent = {
            id: '',
            startDate: startDate.getTime(),
            endDate: endDate.getTime(),
            title: addSplit.groups.title,
            description: addSplit.groups.description,
            creator: msg.author.id
        };

        if(saveEvent(newEvent)){
            let description = descForReply(newEvent);

            tools.reply(msg, 'success', 'public', 'Evènement ajouté par '+msg.author.username, description);
        }else{
            tools.reply(msg, 'error', 'private', 'Erreur', 'Une erreur a eu lieu lors de l\'enregistrement de votre évènement.');
        }

    }else{
        tools.reply('error', 'private', 'Commande erronée', 'Tape \'!cal add help\' pour plus d\'information');
    }
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

function fixOptionnal(addSplit){
    addSplit.groups.startYear = (addSplit.groups.startYear == undefined)?new Date(Date.now()).getFullYear():addSplit.groups.startYear;
    addSplit.groups.startHour = (addSplit.groups.startHour == undefined)?config.startHour:addSplit.groups.startHour;
    addSplit.groups.startMin = (addSplit.groups.startMin == undefined)?0:addSplit.groups.startMin;

    addSplit.groups.endDay = (addSplit.groups.endDay == undefined)?addSplit.groups.startDay:addSplit.groups.endDay;
    addSplit.groups.endMonth = (addSplit.groups.endMonth == undefined)?addSplit.groups.startMonth:addSplit.groups.endMonth;
    addSplit.groups.endYear = (addSplit.groups.endYear == undefined)?addSplit.groups.startYear:addSplit.groups.endYear;
    addSplit.groups.endHour = (addSplit.groups.endHour == undefined)?config.endHour:addSplit.groups.endHour;
    addSplit.groups.endMin = (addSplit.groups.endMin == undefined)?0:addSplit.groups.endMin;

    return addSplit;
}

function saveEvent(newEvent){
    console.log("save event");
    console.log(newEvent);
    let insert = client.setEvent.run(newEvent);
    if(insert.changes >= 1){
        return true;
    }else{
        return false;
    }
}

function descForReply(ev){
    let description = '**'+ev.title+'** : \n\n';
    description += '**Du **: '+('0'+new Date(ev.startDate).getDate()).slice(-2)+'/'+('0'+(new Date(ev.startDate).getMonth()+1)).slice(-2)+'/'+new Date(ev.startDate).getFullYear()+' à '+('0'+new Date(ev.startDate).getHours()).slice(-2)+'H'+('0' + new Date(ev.startDate).getMinutes()).slice(-2)+'\n';
    description += '**Au **: '+('0'+new Date(ev.endDate).getDate()).slice(-2)+'/'+('0'+(new Date(ev.endDate).getMonth()+1)).slice(-2)+'/'+new Date(ev.endDate).getFullYear()+' à '+('0'+new Date(ev.startDate).getHours()).slice(-2)+'H'+('0' + new Date(ev.startDate).getMinutes()).slice(-2)+'\n';
    description += '**Info **: \n'+ev.description;

    return description;
}

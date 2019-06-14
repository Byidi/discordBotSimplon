/*jshint esversion: 9 */

const discord = require('discord.js');
const Config = require('./config.json');

module.exports = {
    isDMChannel : function (msg){
    	if(msg.channel.type == 'dm'){
    		return true;
    	}else{
    		return false;
    	}
    },

    shorten : function (str, length=50){
    	return (str.length > length)?str.substring(0, length)+'...':str;
    },

    getUnique : function (arr, comp) {
    	const unique = arr.map(e => e[comp]).map((e, i, final) => final.indexOf(e) === i && i).filter(e => arr[e]).map(e => arr[e]);
    	return unique;
    },

    isURL : function (s) {
    	 var regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
         return regexp.test(s);
    },

    isInAuthorizedChan : function (msg){
        if(Config.authorized_chan.indexOf(msg.channel.name) > -1 || this.isDMChannel(msg) || Config.authorized_chan.length == 0){
            return true;
        }else{
            return false;
        }
    },

    reply : function(msg, type, channel, title, description){

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

        reply.setDescription(description);

        if (channel == 'private'){
            msg.author.send(reply);
        }else{
            msg.channel.send(reply);
        }
    }
};

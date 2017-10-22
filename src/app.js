const Discord    = require('discord.js');
const logger     = require('winston');

const auth     = require('./auth.json');
const pokelist = require('./mappings/pokelist.json');
const channels = require('./mappings/channels.json');


/**
 * Configure Logger Settings
 **/
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {colorize: true});
logger.level = 'debug';


/**
 * Initialize Discord Bot
 **/
let discordBot = new Discord.Client();

// Define socket events (ready, disconnect, message)
discordBot.on('ready', () => {
    logger.info('Discord Connected');
    logger.info('Discord Logged in: ' + discordBot.username);
});

discordBot.on('disconnect', (evt1, evt2) => {
    logger.error('Discord bot lost connection [ ', evt1, evt2, ' ]\n       Re-establishing connection...\n');
    discordBot.login(auth.token);
});

discordBot.on('message', message => {
    if (message.channel.id === channels.streamChannel) {
        let info = message.content.split('\n');
        if (info[0] in pokelist) {
            if (pokelist[info[0]].channel in channels) {
                let remainingTime = info[1].split(':')[1];
                let despawnTime = null;
                let msg;

                // Convert remaining time to actual hour:minute value
                if (remainingTime) {
                    if (remainingTime.indexOf('h') === -1) {
                        if (remainingTime.indexOf('m') !== -1 && remainingTime.indexOf('s') !== -1) {
                            despawnTime = _getDespawnTime(parseInt(remainingTime.split('m')[0].trim(), 10), parseInt(remainingTime.split('m')[1].split('s')[0].trim(), 10));
                        } else if (remainingTime.indexOf('m') !== -1) {
                            despawnTime = _getDespawnTime(parseInt(remainingTime.split('m')[0].trim(), 10), 0);
                        } else if (remainingTime.indexOf('s') !== -1) {
                            despawnTime = _getDespawnTime(0, parseInt(remainingTime.split('s')[0].trim(), 10));
                        }
                    } else {
                        // Have yet to see it be over 59 minutes, if this does occur, the script will have to be adjusted accordingly
                        logger.error('There was an h!  Please contact support and provide this log [ ' + remainingTime + ' ]');
                    }
                } else if (info[1].indexOf('More than 1 min left') !== -1) {
                    despawnTime = 'unknown';
                } else {
                    logger.error(remainingTime, info[1]);
                }

                if (despawnTime === 'unknown') {
                    msg = info[0] + ' Spawned\n' + 'Unknown Expiration\n' + info[3];
                } else if (despawnTime !== null) {
                    msg = info[0] + ' Spawned\n' + 'Expires at ' + despawnTime + ' (' + remainingTime + ')\n' + info[3];
                } else {
                    msg = info[0] + ' found and ' + info[1] + ' at\n' + info[3];
                }

                // For some reason setting a channel id is permanent, have to set back after
                // This could be fixes if I could figure out how just sent a channel /with/ an id but I can't for some reason

                let temp = message.channel.id;
                message.channel.id = channels[pokelist[info[0]].channel];
                message.channel.send(msg);
                message.channel.id = temp;

                console.log('\n');
                logger.info(info[0] + ' Spawned\n      ' + info[1] + '\n      ' + info[2] + '\n      ' + info[3]);
            }
        } else if (message.content.indexOf('test') === -1) {
            logger.error(info[0] + ' not found in pokelist.json!')
        }
    }
});

discordBot.login(auth.token);



/**
 * Functions
 **/
function _getDespawnTime(minutes = 0, seconds = 0) {
    let cur = new Date();
    let newHour, newMin, ampm;

    cur.setTime(cur.getTime() + (seconds * 1000) + (minutes * 60 * 1000));

    if (cur.getHours() > 12) {
        newHour = (cur.getHours() - 12).toString();
        ampm = 'pm';
    } else {
        newHour = cur.getHours().toString();
        if (cur.getHours() === 12) {
            ampm = 'pm'
        } else {
            ampm = 'am'
        }
    }

    if (cur.getMinutes() < 10) {
        newMin = '0' + cur.getMinutes().toString();
    } else {
        newMin = cur.getMinutes().toString();
    }

    return newHour + ':' + newMin + ampm;
}


/*Ignore for testing*/
// const embed = new Discord.RichEmbed()
//     .setTitle(info[0] + ' Spawned')
//     .setColor(0x00AE86)
//     .setDescription('Expires at ' + despawnTime + ' (' + remainingTime + ')')
//     //.setImage()
//     //.setThumbnail('https://cdn.bulbagarden.net/upload/thumb/c/cc/147Dratini.png/250px-147Dratini.png')
//     .setThumbnail('http://test.png')
//     .setURL(info[3]);
// message.channel.send({
//     embed: {
//         color: 3447003,
//         title: info[0] + " Spawned",
//         url: info[3]
//     }
// });
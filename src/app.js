const Discord    = require('discord.js');
const logger     = require('winston');

const auth     = require('./auth.json');
const pokelist = require('./mappings/pokelist.json');
const raidlist = require('./mappings/raidlist.json');
const raidegglist = require('./mappings/raidegglist.json');
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
    if (message.channel.id === channels.pokemonStream) {
        let data = message.content.split('\n');
        let notification;

        if (data[0] in pokelist) {
            console.log('test');
            if (pokelist[data[0]].channel in channels) {
                notification = _calculatePokemon(data);
                console.log('test2');
                sendNotification(notification, message.channel, channels[pokelist[data[0]].channel]);

                console.log('\n');
                logger.info(data[0] + ' Spawned\n      ' + data[1] + '\n      ' + data[2] + '\n      ' + data[3]);
            }
        } else if (message.content.indexOf('test') === -1) {
            logger.error(data[0] + ' not found in pokelist.json!')
        }
    } else if (message.channel.id === channels.raidStream) {
        let data = message.content.split('\n');
        let notification;

        // if ((data[0].indexOf('boss') !== -1 && data[0].split(' ')[2] in raidlist)
        //     || (data[0].indexOf('Level') !== -1 && raidegglist[data[0].split(' ')[2]].channel in channels)) {
        //     console.log('yes')
        // }

        if ((data[0].indexOf('boss') !== -1 && data[0].split(' ')[2] in raidlist)
            || (data[0].indexOf('Level') !== -1 && raidegglist[data[0].split(' ')[2]].channel in channels)) {
            notification = _calculateRaid(data);

            if (data[0].indexOf('boss') !== -1) {
                sendNotification(notification, message.channel, channels[raidlist[data[0].split(' ')[2]].channel]);
            } else if (data[0].indexOf('Level') !== -1) {
                sendNotification(notification, message.channel, channels[raidegglist[data[0].split(' ')[2]].channel]);
            }
        } else if (message.content.indexOf('test') === -1) {
            logger.error('Unknown raid boss notification:\n', message.content);
        }
    }
});

discordBot.login(auth.token);



/**
 * Functions
 **/
function getDespawnTime(minutes = 0, seconds = 0) {
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

function _calculatePokemon(data) {
    /*
     * data[0] = pokemon name
     * data[1] = remaining time (unformatted)
     * data[2] = clock time found by scanner
     * data[3] = google maps link
     */
    let remainingTime = data[1].split(':')[1];
    let despawnTime = null;

    // Convert remaining time to actual hour:minute value
    if (remainingTime) {
        if (remainingTime.indexOf('h') === -1) {
            if (remainingTime.indexOf('m') !== -1 && remainingTime.indexOf('s') !== -1) {
                despawnTime = getDespawnTime(parseInt(remainingTime.split('m')[0].trim(), 10), parseInt(remainingTime.split('m')[1].split('s')[0].trim(), 10));
            } else if (remainingTime.indexOf('m') !== -1) {
                despawnTime = getDespawnTime(parseInt(remainingTime.split('m')[0].trim(), 10), 0);
            } else if (remainingTime.indexOf('s') !== -1) {
                despawnTime = getDespawnTime(0, parseInt(remainingTime.split('s')[0].trim(), 10));
            }
        } else {
            // Have yet to see it be over 59 minutes, if this does occur, the script will have to be adjusted accordingly
            logger.error('There was an h!  Please contact support and provide this log [ ' + remainingTime + ' ]');
        }
    } else if (data[1].indexOf('More than 1 min left') !== -1) {
        despawnTime = 'unknown';
    } else {
        logger.error(remainingTime, data[1]);
    }

    return new Discord.RichEmbed()
        .setTitle(data[0] + ' Spawned')
        .setColor(0x00AE86)
        .setDescription('Expires at ' + despawnTime + ' (' + remainingTime + ')')
        //.setImage()
        .setThumbnail('https://raw.githubusercontent.com/ZergHunter3000/pogo-discord-filter/master/src/resources/pokemon/' + pokelist[data[0]].dex + '.png')
        .setURL(data[3]);
}

function _calculateRaid(data) {
    /*
     * data[0] = 'Raid boss: name'
     * data[1] = 'Moes
     * data[2] = clock time found by scanner
     * data[3] = google maps link
     */
    if (data[0].indexOf('boss') !== -1) {
        return new Discord.RichEmbed()
            .setTitle(data[0].split(' ')[2] + ' Raid Started')
            .setColor(0x00AE86)
            .setDescription('Ends at ' + data[3].split(' ')[3]) // + ' (' + remainingTime + ')')
            //.setImage()
            .setThumbnail('https://raw.githubusercontent.com/ZergHunter3000/pogo-discord-filter/master/src/resources/pokemon/' + raidlist[data[0].split(' ')[2]].dex + '.png')
            .setURL(data[4]);
    } else if (data[0].indexOf('Level') !== -1) {
        return new Discord.RichEmbed()
            .setTitle('Level ' + data[0].split(' ')[2] + ' Raid Discovered')
            .setColor(0x00AE86)
            .setDescription(data[1].split('Raid ')[1])
            //.setImage()
            .setThumbnail('https://raw.githubusercontent.com/ZergHunter3000/pogo-discord-filter/master/src/resources/eggs/' + raidegglist[data[0].split(' ')[2]].rarity + '.png')
            .setURL(data[2]);
    }
    return null;
}

function sendNotification(notification, channel, channelId) {
    // For some reason setting a channel id is permanent, have to set back after
    // This could be fixed if I could figure out how just sent a channel /with/ an id but I can't for some reason
    let temp = channel.id;
    channel.id = channelId;
    channel.send(notification);
    channel.id = temp;
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
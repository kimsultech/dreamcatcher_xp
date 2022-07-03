#!/usr/bin/env node

// fix node-telegram-bot-api deprecated message
process.env.NTBA_FIX_319 = 1

require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const escapeMD = require('markdown-escape');

const {Pool} = require('pg')

const connectionString = process.env.POSTGRES_URL;
const telegramToken = process.env.TELEGRAM_TOKEN;
const GrupWhiteList = process.env.GROUP_WHITELIST;
const PG_HOST = process.env.POSTGRES_HOST;
const PG_USER = process.env.POSTGRES_USER;
const PG_DB = process.env.POSTGRES_DATABASE;
const PG_PASSWORD = process.env.POSTGRES_PASSWORD;
const PG_PORT = process.env.POSTGRES_PORT;

const pool = new Pool({
    host: PG_HOST,
    user: PG_USER,
    database: PG_DB,
    password: PG_PASSWORD,
    port: PG_PORT,
    ssl: { rejectUnauthorized: false }
});


// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(telegramToken, {polling: true});
const GrupWhiteListArray = GrupWhiteList.split(',');

// Triggers
bot.on('text',     incrementXP);
bot.on('voice',    incrementXP);
bot.on('sticker',  incrementXP);
bot.on('photo',    incrementXP);
bot.on('video',    incrementXP);
bot.on('document', incrementXP);

// Display command
bot.onText(/\/start/,     displayHelp);
bot.onText(/\/xp(@\w+)?/, displayXP);
bot.onText(/\/ranks(@\w+)?/, displayTopRanks);

async function incrementXP(msg, match) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const key = chatId + userId;

    var xp_rate = 1;

    if (msg.video) {
        xp_rate = 5
    } else if (msg.voice) {
        xp_rate = 2
    } else if (msg.photo) {
        xp_rate = 5
    } else {
        xp_rate = 1
    }


    if (!GrupWhiteListArray.includes(String(chatId)) && msg.chat.type != "private") {
        bot.sendMessage(chatId, "Maaf botnya bukan untuk grup ini, hanya grup yang masuk whitelist...", {reply_to_message_id: msg.message_id});
        return;
    }


    if (msg.chat.type == "private")
        return;

    if (msg.text && msg.text.match(/\/xp/))
        return;

    if (msg.text && msg.text.match(/\/ranks/))
        return;

    try {
        const xpData = await pool.query('SELECT * FROM users.users WHERE guid = $1 LIMIT 1;', [key]);

        if (!xpData.rows.length) {
            try {
                await pool.query(
                    `INSERT INTO users.users (guid, gid, uid, xp)  
                     VALUES ($1, $2, $3, $4)`, [key, chatId, userId, 1]);
                return true;
            } catch (error) {
                console.error(error.stack);
                return false;
            }
        } else {
            try {
                await pool.query(
                    `UPDATE users.users SET xp = $1
                    WHERE guid = $2`, [xpData.rows[0].xp + xp_rate, key]);
                
                getRandomXP(msg, match);

                return true;
            } catch (error) {
                console.error(error.stack);
                return false;
            }
        }

    } catch (error) {
        console.error(error.stack);
        return false;
    }
    
};

async function getRandomXP(msg, match) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const key = chatId + userId;

    const xpData = await pool.query('SELECT * FROM users.users WHERE guid = $1 LIMIT 1;', [key]);

    var XP_free = Math.floor(Math.random() * 15000) + 1

    var random1 = Math.floor(Math.random() * 121) + 1;
    var random2 = Math.floor(Math.random() * 355) + 1;
    console.log(random1 + ' & ' + random2);
    if (random1 === random2) {
        try {
            await pool.query(
                `UPDATE users.users SET xp = $1
                WHERE guid = $2`, [xpData.rows[0].xp + XP_free, key]);

            const url = 'AgACAgUAAx0CV2IEYgACA7FiwNHuzE-FGZrppTwqNvhPSXFTHgACuKkxG2XBGVRMda0e8G8TvQEAAwIAA3gAAykE';
            bot.sendPhoto(chatId, url, {reply_to_message_id: msg.message_id, caption: 'Anjay Kamu dapat XP tambahan ' + XP_free + ' 🎉'});

            return true;
        } catch (error) {
            console.error(error.stack);
            return false;
        }
    }
}

async function displayXP(msg, match) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const key = chatId + userId;
    

    if (msg.chat.type == "private") {
        bot.sendMessage(chatId, "Ceknya di grup, Private Chat ngak ada xp xp an...", {reply_to_message_id: msg.message_id});
        return;
    }

    if (msg.reply_to_message) {
        const xp_score = await pool.query('SELECT * FROM users.users WHERE guid = $1 LIMIT 1;', [chatId + msg.reply_to_message.from.id]);
        const user_info = await bot.getChatMember(chatId, msg.reply_to_message.from.id);
        console.log(msg.reply_to_message.photo);
        if (!xp_score.rows.length) {
            bot.sendMessage(chatId, `XP ${user_info.user.first_name} masih 0 👶`, {reply_to_message_id: msg.reply_to_message.message_id});
            return;
        }

        bot.sendMessage(chatId, `XP ${user_info.user.first_name} saat ini ` + xp_score.rows[0].xp, {reply_to_message_id: msg.reply_to_message.message_id});
        return;
    }

    const xp_score = await pool.query('SELECT * FROM users.users WHERE guid = $1 LIMIT 1;', [key]);
    console.log(xp_score.rows);
    if (!xp_score.rows.length) {
        bot.sendMessage(chatId, "XP kamu masih 0 👶", {reply_to_message_id: msg.message_id});
        return;
    }

    bot.sendMessage(chatId, "XP kamu saat ini " + xp_score.rows[0].xp, {reply_to_message_id: msg.message_id});
}

async function displayTopRanks(msg, match) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const key = chatId + userId;

    if (msg.chat.type == "private") {
        bot.sendMessage(chatId, "Hanya kamu Nomor Satu disini, cek di Grup dong!...", {reply_to_message_id: msg.message_id});
        return;
    }

    const xp_score = await pool.query('SELECT * FROM users.users WHERE gid = $1 ORDER BY xp DESC LIMIT 3;', [chatId]);

    console.log(xp_score.rows);

    let users = [];
    for (let i = 0; i < xp_score.rows.length; i++) {
        const member = await bot.getChatMember(chatId, xp_score.rows[i].uid);
        if (member && member.user)
            users[i] = member.user;
        else
            users[i] = {id: 0, first_name: 'Anonymous'};
    }

    if (users.length < 3) {
        for (let i = users.length; i < 3; i++) {
            users.push({id: 0, first_name: 'Anonymous'});
            xp_score.rows.push({guid: 0, gid: 0, uid: 0, xp: 0}); // biar xp ngak undefined
        }
    }

    console.log(users);

    bot.sendMessage(chatId,
        `🥇 ${withUser(users[0])}: ${xp_score.rows[0].xp} XP \n` +
        `🥈 ${withUser(users[1])}: ${xp_score.rows[1].xp} XP \n` +
        `🥉 ${withUser(users[2])}: ${xp_score.rows[2].xp} XP`,
        { parse_mode: 'Markdown', disable_notification: true }, msg);
}

function withUser(user) {
    return escapeMD(user.first_name);
    //return `[${user.first_name}](tg://user?id=${user.id})`;
}

async function displayHelp(msg, match) {
    if (msg.chat.type != "private")
        return;
    bot.sendMessage(msg.chat.id, "masih Males ngisi. " +
        "perinthanya paling ini:\n" +
        " - /xp\n" +
        " - /xp (Reply pesan batur buat liat xp dia)\n"+
        " - /ranks");
}
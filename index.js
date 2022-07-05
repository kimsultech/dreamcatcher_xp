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
    ssl: { rejectUnauthorized: false } // enable for deploy on heroku
});

var level = [
    {"level_name": "Kang Nyimak", "level_xp": 0, "level": 1},
    {"level_name": "Mulai Aktif", "level_xp": 1000, "level": 2},
    {"level_name": "Chase Me", "level_xp": 1500, "level": 3},
    {"level_name": "Good Night", "level_xp": 2000, "level": 4},
    {"level_name": "Fly High", "level_xp": 2500, "level": 5},
    {"level_name": "You and I", "level_xp": 3000, "level": 6},
    {"level_name": "What", "level_xp": 3500, "level": 7},
    {"level_name": "Piri", "level_xp": 4000, "level": 8},
    {"level_name": "Deja Vu", "level_xp": 4500, "level": 9},
    {"level_name": "Scream", "level_xp": 5000, "level": 10},
    {"level_name": "Boca", "level_xp": 5500, "level": 11},
    {"level_name": "Odd Eye", "level_xp": 6000, "level": 12},
    {"level_name": "BEcause", "level_xp": 6500, "level": 13},
    {"level_name": "Maison", "level_xp": 7000, "level": 14},
    {"level_name": "DREAMCATCHER", "level_xp": 10000, "level": 15}
]

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
bot.onText(/\/start/, displayStart);
bot.onText(/\/help/, displayHelp);
bot.onText(/\/xp(@\w+)?/, displayXP);
bot.onText(/\/topranks(@\w+)?/, displayTopRanks);
bot.onText(/\/level(@\w+)?/, displayLevel);

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
        await pool.query(
            `INSERT INTO users.users (guid, gid, uid, xp, next_xp)  
             VALUES ($1, $2, $3, $4, $5)`, [key, chatId, userId, -1, -1]);
        bot.sendMessage(chatId, "Maaf botnya bukan untuk grup ini, hanya grup yang masuk whitelist. tolong keluarkan botnya!");
        return;
    }


    if (msg.chat.type == "private")
        return;

    if (msg.text && msg.text.match(/\/xp/))
        return;
    if (msg.text && msg.text.match(/\/ranks/))
        return;
    if (msg.text && msg.text.match(/\/level/))
        return;
    if (msg.text && msg.text.match(/\/help/))
        return;
    if (msg.text && msg.text.match(/\/start/))
        return;

    try {
        const xpData = await pool.query('SELECT * FROM users.users WHERE guid = $1 LIMIT 1;', [key]);

        if (!xpData.rows.length) {
            try {
                await pool.query(
                    `INSERT INTO users.users (guid, gid, uid, xp, next_xp)  
                     VALUES ($1, $2, $3, $4, $5)`, [key, chatId, userId, 1, level[1].level_xp]);
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

                if (xpData.rows[0].xp >= xpData.rows[0].next_xp) {
                    nextLevel(msg, match);
                }

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

    var XP_free = Math.floor(Math.random() - 5) + 1

    var random1 = Math.floor(Math.random() * 521) + 1;
    var random2 = Math.floor(Math.random() * 1000) + 1;
    console.log(random1 + ' & ' + random2);
    if (random1 === random2) {
        try {
            await pool.query(
                `UPDATE users.users SET xp = $1
                WHERE guid = $2`, [xpData.rows[0].xp + XP_free, key]);

            const url = 'AgACAgUAAx0CV2IEYgACA7FiwNHuzE-FGZrppTwqNvhPSXFTHgACuKkxG2XBGVRMda0e8G8TvQEAAwIAA3gAAykE';
            bot.sendPhoto(chatId, url, {reply_to_message_id: msg.message_id, caption: 'Anjay Kamu dapat XP tambahan\n' + XP_free + ' XP 🎉'});

            return true;
        } catch (error) {
            console.error(error.stack);
            return false;
        }
    }
}

async function nextLevel(msg, match) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const key = chatId + userId;

    const userData = await pool.query('SELECT * FROM users.users WHERE guid = $1 LIMIT 1;', [key]);
    const member = await bot.getChatMember(chatId, userId);

    let level_now = [];

    for (let i = 0; i < level.length; i++) {
        if (userData.rows[0].xp > level[i].level_xp) {
            level_now.push(level[i+1]);
        }
    }

    console.log(level_now[level_now.length-2]);

    await pool.query(`UPDATE users.users
                        SET next_xp = $1
                        WHERE guid = $2`, [level_now[level_now.length-1].level_xp, key]
    );

    let levelUp = `🌟 <b>${member.user.first_name + ' ' + member.user.last_name}</b> telah mencapai level ${level_now[level_now.length-2].level} dan sekarang menjadi <b>${level_now[level_now.length-2].level_name}</b>!`;
    

    bot.sendMessage(chatId, levelUp, {parse_mode: "html"});
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

    const xp_score = [];
    const xp_score_list = await pool.query(`SELECT *, COUNT(*) OVER() AS count, RANK() OVER(ORDER BY xp DESC) AS rank
                                            FROM (SELECT DISTINCT ON (xp) *
                                                FROM users.users
                                                WHERE gid = $1
                                                ORDER BY xp DESC) s`, [chatId]
    );

    for (let i = 0; i < xp_score_list.rows.length; i++) {
        if (xp_score_list.rows[i].guid == key) {
            xp_score.push(xp_score_list.rows[i]);
            if (xp_score_list.rows[i-1] != undefined) {
                xp_score.push(xp_score_list.rows[i-1]);
            }
        }
    }

    console.log(xp_score);
    console.log(xp_score.length);

    if (!xp_score.length) {
        bot.sendMessage(chatId, "XP kamu masih 0 👶", {reply_to_message_id: msg.message_id});
        return;
    }

    if (xp_score.length > 1) {
        const member = await bot.getChatMember(chatId, xp_score[1].uid);

        bot.sendMessage(chatId, "XP kamu saat ini " + xp_score[0].xp + " dan berada di Rank #" + xp_score[0].rank + " / " + xp_score[0].count +
        "\nButuh " + (xp_score[1].xp - xp_score[0].xp) + " XP lagi untuk menyusul " + member.user.first_name, {reply_to_message_id: msg.message_id});
    } else {
        bot.sendMessage(chatId, "XP kamu saat ini " + xp_score[0].xp + " dan berada di Rank #" + xp_score[0].rank + " / " + xp_score[0].count, {reply_to_message_id: msg.message_id});
    }
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

    bot.sendMessage(chatId,
        `🥇 ${withUser(users[0])} : ${xp_score.rows[0].xp} XP \n` +
        `🥈 ${withUser(users[1])} : ${xp_score.rows[1].xp} XP \n` +
        `🥉 ${withUser(users[2])} : ${xp_score.rows[2].xp} XP`,
        { parse_mode: 'html', disable_notification: true }, msg);
}

function withUser(user) {
    return user.first_name + ' ' + user.last_name;
    //return `[${user.first_name}](tg://user?id=${user.id})`;
}

async function displayHelp(msg, match) {
    // if (msg.chat.type != "private")
    //     return;
    bot.sendMessage(msg.chat.id, "Berikut adalah command yang bisa kamu gunakan.\n\n" +
        " - /xp - Ini akan menampilkan jumlah XP kamu (Reply sebuah pesan untuk melihat xp orang lain).\n" +
        " - /level - Akan menampilkan status level kamu.\n" +
        " - /topranks - Menampilkan 1-3 Rank.\n" +
        " - /help - Menampilkan bantuan ini.\n");
}

async function displayStart(msg, match) {
    // if (msg.chat.type != "private")
    //     return;
    bot.sendMessage(msg.chat.id, "Sampurasun, ini adalah bot XP/Leaderboard dengan Level dan lainnya.\n\n" +
        "Saat ini bot hanya untuk Grup @dreamcatcher_id dan bukan untuk umum.\n\n" +
        "Dan bot ini masih dalam tahap pengembangan, jika kamu ingin menginstall bot ini, " +
        "kamu bisa cek Source Code nya di http://github.com/sultannamja/dreamcatcher_xp/\n" +
        "bisa menggunakan Local Server atau Deploy ke heroku.\n\n" +
        "/help untuk melihat bantuan dan list command.");
}

async function displayLevel(msg, match) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const key = chatId + userId;

    if (msg.chat.type == "private") {
        bot.sendMessage(chatId, "Ceknya di grup, Private Chat ngak nampilin level...", {reply_to_message_id: msg.message_id});
        return;
    }

    const xpData = await pool.query('SELECT * FROM users.users WHERE guid = $1 LIMIT 1;', [key]);

    let level_get = ``;

    if (msg.reply_to_message) {
        const xpData2 = await pool.query('SELECT * FROM users.users WHERE guid = $1 LIMIT 1;', [chatId + msg.reply_to_message.from.id]);
        const user_info = await bot.getChatMember(chatId, msg.reply_to_message.from.id);
        for (let i = 0; i < level.length; i++) {
            if (xpData2.rows[0].xp > level[i].level_xp) {
                level_get = `${user_info.user.first_name} lagi di Level ${level[i].level} (${level[i].level_name}) dengan ${xpData2.rows[0].xp} XP.\n` +
                `butuh ${level[i+1].level_xp - xpData2.rows[0].xp} XP lagi untuk ke Level ${level[i+1].level}`;
            }
        }

        bot.sendMessage(chatId, level_get, {reply_to_message_id: msg.reply_to_message.message_id});
        return;
    }

    for (let i = 0; i < level.length; i++) {
        if (xpData.rows[0].xp > level[i].level_xp) {
            level_get = `Kamu lagi di Level ${level[i].level} (${level[i].level_name}) dengan ${xpData.rows[0].xp} XP.\n` +
            `butuh ${level[i+1].level_xp - xpData.rows[0].xp} XP lagi untuk ke Level ${level[i+1].level}`;
        }
    }
    

    bot.sendMessage(chatId, level_get);
}

var now = new Date();
console.log(now);
var millisTill10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 00, 0, 0) - now;
if (millisTill10 < 0) {
     millisTill10 += 86400000; // it's after 10am, try 10am tomorrow.
}
setTimeout(infoRankJadwal, millisTill10);

async function infoRankJadwal(msg, match) {
    const chatId = GrupWhiteListArray[0]

    const xp_score = await pool.query('SELECT * FROM users.users WHERE gid = $1 ORDER BY xp DESC LIMIT 3;', [chatId]);

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

    bot.sendMessage(chatId, `<b>Top 3 Rank saat ini</b>\n\n` +
        `🥇 ${withUser(users[0])} : ${xp_score.rows[0].xp} XP \n` +
        `🥈 ${withUser(users[1])} : ${xp_score.rows[1].xp} XP \n` +
        `🥉 ${withUser(users[2])} : ${xp_score.rows[2].xp} XP\n\n` +
        `Teruslah berinterakasi untuk meningkatkan XP dan menaikan Level, dengan tetap mematuhi Aturan tentunya.`,
        { parse_mode: 'html', disable_notification: true }, msg);
}
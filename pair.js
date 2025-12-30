const express = require('express');
const mega = require("megajs");
const fs = require('fs');
const path = require('path');
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');

let router = express.Router();

const accounts = [
    {
        email: 'Your mega email',
        password: 'Your mega pw',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    }
];

const MESSAGE = `
*SESSION GENERATED SUCCESSFULLY* ✅

*Gɪᴠᴇ ᴀ ꜱᴛᴀʀ ᴛᴏ ʀᴇᴘᴏ ꜰᴏʀ ᴄᴏᴜʀᴀɢᴇ* 🌟
https://github.com/GlobalTechInfo/MEGA-MD

*Sᴜᴘᴘᴏʀᴛ Gʀᴏᴜᴘ ꜰᴏʀ ϙᴜᴇʀʏ* 💭
https://t.me/Global_TechInfo
https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07

*Yᴏᴜ-ᴛᴜʙᴇ ᴛᴜᴛᴏʀɪᴀʟꜱ* 🪄 
https://youtube.com/@GlobalTechInfo

*VES-MD--WHATSAPP* 🥀
`;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const upload = async (data, name) => {
    for (let i = 0; i < accounts.length; i++) {
        const auth = accounts[i];
        try {
            const url = await new Promise((resolve, reject) => {
                const storage = new mega.Storage(auth, () => {
                    const up = storage.upload({ name, allowUploadBuffering: true });
                    data.pipe(up);
                    storage.on("add", file => {
                        file.link((err, url) => {
                            storage.close();
                            if (err) reject(err);
                            else resolve(url);
                        });
                    });
                });
                storage.on("error", (err) => reject(err));
            });
            return url;
        } catch (err) {
            if (i === accounts.length - 1) throw new Error("All MEGA accounts failed.");
            continue;
        }
    }
};

function makeid(num = 4) {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < num; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function removeFile(FilePath) {
    if (fs.existsSync(FilePath)) {
        fs.rmSync(FilePath, { recursive: true, force: true });
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    const tempPath = path.join('/tmp', num, id);

    async function VES_MD_PAIR() {
        const { state, saveCreds } = await useMultiFileAuthState(tempPath);
        
        try {
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }),
                browser: Browsers.macOS("Safari")
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(5000);
                    let rf = path.join(tempPath, 'creds.json');

                    try {
                        const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                        const sid = mega_url.replace('https://mega.nz/file/', '');
                        
                        // Session ID එක සහ ඔයා දුන්න MESSAGE එක එකතු කිරීම
                        const finalMessage = `VES-MD;;;${sid}\n\n${MESSAGE}`;

                        const phoneNumber = sock.user.id.split(':')[0].replace(/\D/g, '');
                        await sock.sendMessage(phoneNumber + "@s.whatsapp.net", { text: finalMessage });
                    } catch (e) {
                        console.error(e);
                    }

                    await delay(1000);
                    await sock.ws.close();
                    removeFile(tempPath);
                } else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    VES_MD_PAIR();
                }
            });

        } catch (err) {
            removeFile(tempPath);
            if (!res.headersSent) {
                await res.send({ code: "❗ Service Unavailable" });
            }
        }
    }

    await VES_MD_PAIR();
});

module.exports = router;

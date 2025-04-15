const bodyParser = require('body-parser');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(bodyParser.json());

const token = 'BOT_TOKEN'; // Tokenni bu yerga qo‘ying
const bot = new TelegramBot(token, { polling: false });

const channelChatId = '@defend_korrupsiya';

const replyKeyboard = [
    ['Murojaat yuborish 📝'],
    ['👉 Bizning kanal 👈']
];

let isWaitingForText = false;
let isWaitingForPhoto = false;
let isWaitingForVideo = false;

let userRequestData = {
    text: '',
    photo: null,
    video: null
};

// Barcha Telegram requestlar shu bir joyda qabul qilinadi
app.post('/', async (req, res) => {
    const body = req.body;

    // Callback query
    if (body.callback_query) {
        const callbackQuery = body.callback_query;
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        if (data === 'continue') {
            const summary = getRequestSummary(userRequestData);
            await bot.sendMessage(chatId, `Quyidagi ma'lumotlarni tasdiqlang:\n\n${summary}`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: 'Tasdiqlash', callback_data: 'confirm_request' }]]
                }
            });
        } else if (data === 'confirm_request') {
            await bot.sendMessage(channelChatId, `Yangi murojaat!`);
            await bot.sendMessage(channelChatId, `Murojaat mazmuni:\n${userRequestData.text}`);
            if (userRequestData.photo)
                await bot.sendPhoto(channelChatId, userRequestData.photo, { caption: "Murojaat rasmi:" });
            if (userRequestData.video)
                await bot.sendVideo(channelChatId, userRequestData.video, { caption: "Murojaat videosi:" });

            await bot.sendMessage(chatId, `Murojaatingiz yuborildi. ✅`, {
                reply_markup: {
                    keyboard: replyKeyboard,
                    resize_keyboard: true
                }
            });

            // Reset
            isWaitingForText = false;
            isWaitingForPhoto = false;
            isWaitingForVideo = false;
            userRequestData = { text: '', photo: null, video: null };
        }

        return res.sendStatus(200);
    }

    // Oddiy xabar
    if (body.message) {
        const msg = body.message;
        const chatId = msg.chat.id;
        const text = msg.text;

        const options = {
            reply_markup: {
                keyboard: replyKeyboard,
                resize_keyboard: true
            }
        };

        if (text === '/start') {
            await bot.sendMessage(chatId, `Assalomu alaykum, ${msg.from.first_name}!`, options);
            return res.sendStatus(200);
        }

        if (text === '👉 Bizning kanal 👈') {
            await bot.sendMessage(chatId, `🌐 Bizning kanalimiz: @defend_korrupsiya`, options);
            return res.sendStatus(200);
        }

        if (text === 'Murojaat yuborish 📝') {
            isWaitingForText = true;
            userRequestData = { text: '', photo: null, video: null };
            await bot.sendMessage(chatId, `Iltimos, murojaatingizni matn shaklida yuboring...`, {
                reply_markup: {
                    keyboard: [['Bekor qilish']],
                    resize_keyboard: true
                }
            });
            return res.sendStatus(200);
        }

        if (text === 'Bekor qilish') {
            isWaitingForText = false;
            isWaitingForPhoto = false;
            isWaitingForVideo = false;
            await bot.sendMessage(chatId, `Jarayon bekor qilindi.`, {
                reply_markup: {
                    keyboard: replyKeyboard,
                    resize_keyboard: true
                }
            });
            return res.sendStatus(200);
        }

        // Jarayon bosqichlari
        if (isWaitingForText && text) {
            userRequestData.text = text;
            isWaitingForText = false;
            isWaitingForPhoto = true;
            await bot.sendMessage(chatId, `Iltimos, rasm yuboring.`);
            return res.sendStatus(200);
        }

        if (isWaitingForPhoto && msg.photo) {
            userRequestData.photo = msg.photo[msg.photo.length - 1].file_id;
            isWaitingForPhoto = false;
            isWaitingForVideo = true;
            await bot.sendMessage(chatId, `Rasm qabul qilindi. Ixtiyoriy tarzda video yuboring yoki 'Davom etish' tugmasini bosing.`, {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Davom etish', callback_data: 'continue' }]]
                }
            });
            return res.sendStatus(200);
        }

        if (isWaitingForVideo && msg.video) {
            userRequestData.video = msg.video.file_id;
            isWaitingForVideo = false;
            const summary = getRequestSummary(userRequestData);
            await bot.sendMessage(chatId, `Quyidagi ma'lumotlarni tasdiqlang:\n\n${summary}`, {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Tasdiqlash', callback_data: 'confirm_request' }]]
                }
            });
            return res.sendStatus(200);
        }

        await bot.sendMessage(chatId, `Iltimos, menyudan tanlang.`, options);
    }

    return res.sendStatus(200);
});

function getRequestSummary(data) {
    return `
Matn: ${data.text}
Rasm: ${data.photo ? 'Yuborilgan' : 'Yo‘q'}
Video: ${data.video ? 'Yuborilgan' : 'Yo‘q'}
`;
}

// Vercel uchun export
module.exports = app;

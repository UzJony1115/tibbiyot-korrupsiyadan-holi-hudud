// api/webhook.js
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

// Token va bot yaratish
const token = '7927249894:AAF9moeb4VY0A_rC5k-HswC_M2iYf8PtxtY';
const bot = new TelegramBot(token);

// Kanalga xabar yuborish uchun chat_id
const channelChatId = '@defend_korrupsiya';

// Body parser ni qo‘shish
app.use(bodyParser.json());

// Reply tugmalari
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

// Webhook endpoint
app.post('/', (req, res) => {
    const msg = req.body.message;
    const chatId = msg.chat.id;
    const text = msg.text;

    const options = {
        reply_markup: {
            keyboard: replyKeyboard,
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };

    if (text === "/start") {
        bot.sendPhoto(chatId, "hero.jpg");
        return bot.sendMessage(chatId, `Assalomu alaykum hurmatli ${msg.from.first_name}, siz Korrupsiyaga qarshimiz botiga xush kelibsiz!`, options);
    }

    if (text === "/info") {
        return bot.sendMessage(chatId, "Korrupsiyani yoqotish maqsadida tuzilgan bot. Botning aytganlariga rioya qiling!", options);
    }

    if (text === 'Murojaat yuborish 📝') {
        isWaitingForText = true;
        userRequestData = { text: '', photo: null, video: null };
        const waitingMessage = `Hurmatli ${msg.from.first_name}, murojaatingizning mazmunini matn tarzida yuboring...`;

        return bot.sendMessage(chatId, waitingMessage, {
            reply_markup: {
                keyboard: [['Bekor qilish']],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    }

    // Matn, rasm va video yuborish jarayoni
    if (isWaitingForText) {
        if (msg.text) {
            userRequestData.text = msg.text;
            bot.sendMessage(chatId, `Sizning murojaatingiz mazmuni:\n\n ${msg.text} \n\nIltimos, endi murojaat haqida rasm yuboring.`);

            isWaitingForText = false;
            isWaitingForPhoto = true;
            return;
        } else {
            return bot.sendMessage(chatId, 'Iltimos, faqat matn yuboring. Boshqa turdagi xabarlar qabul qilinmaydi.');
        }
    }

    if (isWaitingForPhoto) {
        if (msg.photo) {
            userRequestData.photo = msg.photo[0].file_id;
            bot.sendPhoto(chatId, userRequestData.photo, { caption: "Siz yuborgan rasm:" });

            bot.sendMessage(chatId, 'Rasm muvaffaqiyatli qabul qilindi. Video yuborish ixtiyoriy, agarda sizda video bo`lmasa davom etish tugmasini bosing...', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Davom etish', callback_data: 'continue' }]
                    ]
                }
            });

            isWaitingForPhoto = false;
            isWaitingForVideo = true;
            return;
        } else {
            return bot.sendMessage(chatId, 'Iltimos, faqat rasm yuboring.');
        }
    }

    if (isWaitingForVideo) {
        if (msg.video) {
            userRequestData.video = msg.video.file_id;
            bot.sendVideo(chatId, userRequestData.video, { caption: "Siz yuborgan video:" });

            bot.sendMessage(chatId, 'Video muvaffaqiyatli yuborildi. Murojaatingizni tasdiqlang.');
            isWaitingForVideo = false;
            const userRequestSummary = `
            Siz yuborgan murojaat:\n
            Matn: ${userRequestData.text}
            Rasm: ${userRequestData.photo ? 'Rasm yuborilgan' : 'Rasm yuborilmagan'}
            Video: ${userRequestData.video ? 'Video yuborilgan' : 'Video yuborilmagan'}
        `;
        bot.sendMessage(chatId, `Quyidagi ma'lumotlarni tasdiqlang:\n\n${userRequestSummary}`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Tasdiqlash', callback_data: 'confirm_request' }]
                ]
            }
        });

        return;
        } else {
            return bot.sendMessage(chatId, 'Video tashlang, agar video bo`lmasa davom etish tugmasini bosing.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Davom etish', callback_data: 'continue' }]
                    ]
                }
            });
            return;
        }

        const userRequestSummary = `
            Siz yuborgan murojaat:\n
            Matn: ${userRequestData.text}
            Rasm: ${userRequestData.photo ? 'Rasm yuborilgan' : 'Rasm yuborilmagan'}
            Video: ${userRequestData.video ? 'Video yuborilgan' : 'Video yuborilmagan'}
        `;
        bot.sendMessage(chatId, `Quyidagi ma'lumotlarni tasdiqlang:\n\n${userRequestSummary}`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Tasdiqlash', callback_data: 'confirm_request' }]
                ]
            }
        });

        return;
    }

    if (text === '👉 Bizning kanal 👈') {
        return bot.sendMessage(chatId, '🌐 Bizning kanalimiz: @defend_korrupsiya', options);
    }

    return bot.sendMessage(chatId, 'Iltimos, menyudan biror bir tugmani tanlang.', options);
});

// Callback query uchun inline tugma bosilganda amalga oshadigan kod
app.post('/callback', (req, res) => {
    const callbackQuery = req.body.callback_query;
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === 'continue') {
        const userRequestSummary = `
            Siz yuborgan murojaat:\n
            Matn: ${userRequestData.text}
            Rasm: ${userRequestData.photo ? 'Rasm yuborilgan' : 'Rasm yuborilmagan'}
            Video: ${userRequestData.video ? 'Video yuborilgan' : 'Video yuborilmagan'}
        `;
        bot.sendMessage(chatId, `Quyidagi ma'lumotlarni tasdiqlang:\n\n${userRequestSummary}`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Tasdiqlash', callback_data: 'confirm_request' }]
                ]
            }
        });

    } else if (data === 'confirm_request') {
        bot.sendMessage(channelChatId, `Yangi murojaat!`);
        bot.sendMessage(channelChatId, `Murojaat mazmuni: \n${userRequestData.text}`);

        if (userRequestData.photo) {
            bot.sendPhoto(channelChatId, userRequestData.photo, { caption: "Murojaat rasmi:" });
        }

        if (userRequestData.video) {
            bot.sendVideo(channelChatId, userRequestData.video, { caption: "Murojaat videosi:" });
        }

        bot.sendMessage(chatId, `Murojaatingiz muvaffaqiyatli yuborildi.✅`, {
            reply_markup: {
                keyboard: replyKeyboard,
                resize_keyboard: true
            }
        });

        bot.sendMessage(chatId, 'Yangi murojaat yuborish uchun quyidagi tugmani tanlang:', {
            reply_markup: {
                keyboard: replyKeyboard,
                resize_keyboard: true
            }
        });

        isWaitingForText = false;
        isWaitingForPhoto = false;
        isWaitingForVideo = false;
        userRequestData = { text: '', photo: null, video: null };
    }
});

// Foydalanuvchi bekor qilish tugmasini bosganda
app.post('/cancel', (req, res) => {
    const msg = req.body.message;
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === 'Bekor qilish') {
        isWaitingForText = false;
        isWaitingForPhoto = false;
        isWaitingForVideo = false;

        return bot.sendMessage(chatId, 'Murojaat jarayoni bekor qilindi. Yangi murojaat yo`llash uchun pastdagi murojaat yuborish tugmasini bosing. ⬇️', {
            reply_markup: {
                keyboard: replyKeyboard,
                resize_keyboard: true
            }
        });
    }
});

// Vercel-da serverni ishlatish uchun modul eksport qilish
module.exports = (req, res) => {
    app(req, res);
};

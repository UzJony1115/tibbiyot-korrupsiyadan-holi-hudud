// server.js
const express = require('express');
const bodyParser = require('body-parser');
// const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Token va bot yaratish
require('dotenv').config(); // .env faylini yuklash

const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN; // .env faylidan tokenni olish

if (!token) {
  console.log("Bot tokeni mavjud emas!");
  process.exit(1); // Token topilmasa serverni to'xtatish
}


const bot = new TelegramBot(token, { polling: true });

// Kanalga xabar yuborish uchun chat_id
const channelChatId = '@defend_korrupsiya';

app.use(bodyParser.json());

const replyKeyboard = [
    ['Murojaat yuborish 📝']
];

let userStates = {}; // Foydalanuvchi holatlarini saqlash

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendPhoto(chatId, "hero.jpg");
    bot.sendMessage(chatId, `Assalomu alaykum hurmatli ${msg.from.first_name}, siz Korrupsiyaga qarshimiz botiga xush kelibsiz!`, {
        reply_markup: {
            keyboard: replyKeyboard,
            resize_keyboard: true
        }
    });
});

bot.onText(/\/info/, (msg) => {
    bot.sendMessage(msg.chat.id, "Korrupsiyani yoqotish maqsadida tuzilgan bot. Botning aytganlariga rioya qiling!", {
        reply_markup: {
            keyboard: replyKeyboard,
            resize_keyboard: true
        }
    });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    const state = userStates[chatId] || {
        step: null,
        text: '',
        photo: null,
        video: null
    };

    if (text === 'Murojaat yuborish 📝') {
        state.step = 'text';
        userStates[chatId] = state;
        return bot.sendMessage(chatId, `Hurmatli ${msg.from.first_name}, murojaatingizning mazmunini matn tarzida yuboring...`, {
            reply_markup: {
                keyboard: [['Bekor qilish']],
                resize_keyboard: true
            }
        });
    }

    if (text === 'Bekor qilish') {
        delete userStates[chatId];
        return bot.sendMessage(chatId, `Murojaat jarayoni bekor qilindi. Yangi murojaat uchun "Murojaat yuborish 📝" tugmasini bosing.`, {
            reply_markup: {
                keyboard: replyKeyboard,
                resize_keyboard: true
            }
        });
    }

    if (state.step === 'text' && text) {
        state.text = text;
        state.step = 'photo';
        return bot.sendMessage(chatId, `Matn qabul qilindi:\n\n${text}\n\nEndi iltimos, rasm yuboring.`);
    }

    if (state.step === 'photo' && msg.photo) {
        state.photo = msg.photo[msg.photo.length - 1].file_id;
        state.step = 'video';
        await bot.sendPhoto(chatId, state.photo, { caption: "Siz yuborgan rasm:" });
        return bot.sendMessage(chatId, `Video yuborishingiz mumkin. Agar video yo‘q bo‘lsa, quyidagidan davom eting:`, {
            reply_markup: {
                inline_keyboard: [[{ text: 'Davom etish', callback_data: 'continue' }]]
            }
        });
    }

    if (state.step === 'video' && msg.video) {
        state.video = msg.video.file_id;
        await bot.sendVideo(chatId, state.video, { caption: "Siz yuborgan video:" });
        return showConfirmation(chatId, state);
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const state = userStates[chatId];

    if (!state) return;

    if (data === 'continue') {
        return showConfirmation(chatId, state);
    }

    if (data === 'confirm_request') {
        await bot.sendMessage(channelChatId, `📥 Yangi murojaat:\n\n${state.text}`);
        if (state.photo) await bot.sendPhoto(channelChatId, state.photo, { caption: "Rasm ilova qilindi." });
        if (state.video) await bot.sendVideo(channelChatId, state.video, { caption: "Video ilova qilindi." });

        await bot.sendMessage(chatId, `✅ Murojaatingiz yuqori tashkilotlarga yuborildi.`, {
            reply_markup: {
                keyboard: replyKeyboard,
                resize_keyboard: true
            }
        });

        delete userStates[chatId];
    }
});

function showConfirmation(chatId, state) {
    const summary = `
Murojaat:
📄 Matn: ${state.text}
🖼️ Rasm: ${state.photo ? 'Bor' : 'Yo‘q'}
🎥 Video: ${state.video ? 'Bor' : 'Yo‘q'}
`;
    return bot.sendMessage(chatId, `Tasdiqlang:\n\n${summary}`, {
        reply_markup: {
            inline_keyboard: [[{ text: 'Tasdiqlash', callback_data: 'confirm_request' }]]
        }
    });
}

app.get('/', (_, res) => {
    res.send('Bot ishlayapti...');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const mongoose = require('mongoose');

// Replace with your actual bot token
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Config Mongodb model and schemas
const feedbackSchema = new mongoose.Schema({
  username: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const statsSchema = new mongoose.Schema({
  totalTranslations: { type: Number, default: 0 },
  languageCounts: { type: Map, of: Number, default: {} }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
const Stats = mongoose.model('Stats', statsSchema);

// Azure Translator API details
const azureEndpoint = 'https://api.cognitive.microsofttranslator.com';
const azureKey = process.env.AZURE_TRANSLATOR_KEY;

// Load valid language codes from JSON file
const langCodes = JSON.parse(fs.readFileSync('azurevalid.json')).translation;

// Function to detect language
async function detectLanguage(text) {
  try {
    const response = await axios({
      baseURL: azureEndpoint,
      url: '/detect',
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-type': 'application/json'
      },
      params: {
        'api-version': '3.0'
      },
      data: [{
        'text': text
      }],
      responseType: 'json'
    });
    return response.data[0].language;
  } catch (error) {
    throw new Error('Error detecting language');
  }
}

// Function to translate text
async function translateText(text, to, from = '') {
  try {
    const response = await axios({
      baseURL: azureEndpoint,
      url: '/translate',
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-type': 'application/json'
      },
      params: {
        'api-version': '3.0',
        'to': to,
        'from': from
      },
      data: [{
        'text': text
      }],
      responseType: 'json'
    });
    return response.data[0].translations[0].text;
  } catch (error) {
    throw new Error('Error translating text');
  }
}

// Function to send a stylish response
function sendStylishResponse(chatId, originalText, translatedText, fromLang, toLang) {
  const responseMessage = `
*Translation Result*:
*From:* \`${originalText}\`
*To:* \`${translatedText}\`
*Language:* \`${fromLang}\` -> \`${toLang}\`
  `;
  bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
}

// Function to update usage statistics
async function updateUsageStats(fromLang, toLang) {
  let stats = await Stats.findOne();
  if (!stats) {
    stats = new Stats();
  }
  stats.totalTranslations += 1;
  stats.languageCounts.set(fromLang, (stats.languageCounts.get(fromLang) || 0) + 1);
  stats.languageCounts.set(toLang, (stats.languageCounts.get(toLang) || 0) + 1);
  await stats.save();
}

// Function to get system statistics
function getSystemStats() {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = os.loadavg();
  return {
    memory: {
      rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      external: (memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB'
    },
    cpu: {
      '1m': cpuUsage[0].toFixed(2),
      '5m': cpuUsage[1].toFixed(2),
      '15m': cpuUsage[2].toFixed(2)
    }
  };
}

// Function to send usage statistics
async function sendUsageStats(chatId) {
  const systemStats = getSystemStats();
  const stats = await Stats.findOne();
  let statsMessage = `*Usage Statistics*:\nTotal Translations: ${stats ? stats.totalTranslations : 0}\n`;
  if (stats) {
    for (const [lang, count] of stats.languageCounts.entries()) {
      statsMessage += `\`${lang}\`: ${count} translations\n`;
    }
  }
  statsMessage += `
*System Statistics*:
*Memory Usage*:
- RSS: ${systemStats.memory.rss}
- Heap Total: ${systemStats.memory.heapTotal}
- Heap Used: ${systemStats.memory.heapUsed}
- External: ${systemStats.memory.external}

*CPU Load*:
- 1m: ${systemStats.cpu['1m']}
- 5m: ${systemStats.cpu['5m']}
- 15m: ${systemStats.cpu['15m']}
  `;
  bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
}

// Function to send supported languages
function sendSupportedLanguages(chatId) {
  let languagesMessage = '*Supported Languages*:\n';
  for (const lang in langCodes) {
    languagesMessage += `\`${lang}\`\n`;
  }
  bot.sendMessage(chatId, languagesMessage, { parse_mode: 'Markdown' });
}

// Function to send top translated languages
async function sendTopLanguages(chatId) {
  const stats = await Stats.findOne();
  if (!stats) {
    bot.sendMessage(chatId, 'No translation data available.');
    return;
  }
  let topLanguagesMessage = '*Top Translated Languages*:\n';
  const sortedLanguages = [...stats.languageCounts.entries()].sort((a, b) => b[1] - a[1]);
  sortedLanguages.slice(0, 5).forEach(([lang, count]) => {
    topLanguagesMessage += `\`${lang}\`: ${count} translations\n`;
  });
  bot.sendMessage(chatId, topLanguagesMessage, { parse_mode: 'Markdown' });
}

// Listen for commands
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text.startsWith('/translate ')) {
    const message = text.slice(11);
    try {
      const detectedLang = await detectLanguage(message);
      const translatedText = await translateText(message, 'en', detectedLang);
      sendStylishResponse(chatId, message, translatedText, detectedLang, 'en');
      updateUsageStats(detectedLang, 'en');
    } catch (error) {
      bot.sendMessage(chatId, 'Error processing your request. Please try again later.');
    }
  } else if (text.startsWith('/translate_to ')) {
    const parts = text.split(' ');
    const langCode = parts[1];
    const message = parts.slice(2).join(' ');

    if (!langCodes[langCode]) {
      bot.sendMessage(chatId, 'Invalid language code. Please use a valid language code.');
      return;
    }

    try {
      const translatedText = await translateText(message, langCode, 'en');
      sendStylishResponse(chatId, message, translatedText, 'en', langCode);
      updateUsageStats('en', langCode);
    } catch (error) {
      bot.sendMessage(chatId, 'Error processing your request. Please try again later.');
    }
  } else if (text.startsWith('/help')) {
    const helpMessage = `
*Translation Bot Help*:
- Use \`/translate <text>\` to detect the language and translate to English.
- Use \`/translate_to <lang_code> <text>\` to translate from English to the specified language.
- Example: \`/translate_to es Hello, how are you?\`
- Use \`/stats\` to see usage statistics.
- Use \`/languages\` to see the list of supported languages.
- Use \`/feedback <message>\` to send feedback.
- Use \`/top_languages\` to see the top translated languages.
    `;
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  } else if (text.startsWith('/stats')) {
    sendUsageStats(chatId);
  } else if (text.startsWith('/languages')) {
    sendSupportedLanguages(chatId);
  } else if (text.startsWith('/feedback ')) {
    const feedback = text.slice(10);
    const feedbackEntry = new Feedback({ username: msg.from.username, message: feedback });
    await feedbackEntry.save();
    bot.sendMessage(chatId, 'Thank you for your feedback!');
  } else if (text.startsWith('/top_languages')) {
    sendTopLanguages(chatId);
  } else {
    bot.sendMessage(chatId, 'Invalid command. Use /help to see the list of available commands.');
  }
});
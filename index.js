const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const express = require('express');
const config = require('./settings.json');

const app = express();
app.get('/', (req, res) => res.send('Bot is alive and running!'));
app.listen(8000, () => console.log('✅ Express server started on port 8000.'));

function createBot() {
  const bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config['bot-account'].username,
    password: config['bot-account'].password,
    auth: config['bot-account'].type, // "microsoft" or "offline"
    version: config.server.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('🟢 [Bot] Successfully joined the server!');

    // ✅ Auto-auth module
    if (config.utils['auto-auth'].enabled) {
      console.log('[INFO] Auto-auth enabled');
      const password = config.utils['auto-auth'].password;
      setTimeout(() => {
        bot.chat(`/register ${password} ${password}`);
        bot.chat(`/login ${password}`);
      }, 1000);
    }

    // ✅ Chat messages
    if (config.utils['chat-messages'].enabled) {
      console.log('[INFO] Chat messages enabled');
      const { messages, repeat, 'repeat-delay': delay } = config.utils['chat-messages'];
      if (repeat) {
        let i = 0;
        setInterval(() => {
          bot.chat(messages[i]);
          i = (i + 1) % messages.length;
        }, delay * 1000);
      } else {
        messages.forEach(msg => bot.chat(msg));
      }
    }

    // ✅ Move to position
    if (config.position.enabled) {
      const mcData = require('minecraft-data')(bot.version);
      const movements = new Movements(bot, mcData);
      const pos = config.position;
      console.log(`[Bot] Moving to (${pos.x}, ${pos.y}, ${pos.z})`);
      bot.pathfinder.setMovements(movements);
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
    }

    // ✅ Anti-AFK
    if (config.utils['anti-afk'].enabled) {
      bot.setControlState('jump', true);
      if (config.utils['anti-afk'].sneak) bot.setControlState('sneak', true);
    }
  });

  bot.on('chat', (username, message) => {
    if (config.utils['chat-log']) console.log(`[Chat] <${username}> ${message}`);
  });

  bot.on('goal_reached', () => console.log('🏁 [Bot] Reached target location.'));
  bot.on('death', () => console.log('☠️ [Bot] Died and respawned.'));

  bot.on('kicked', reason => console.log(`[KICKED] ${reason}`));
  bot.on('error', err => console.log(`[ERROR] ${err.message}`));

  // ✅ Auto-reconnect
  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      console.log('🔄 Bot disconnected, reconnecting soon...');
      setTimeout(createBot, config.utils['auto-recconect-delay'] || 5000);
    });
  }
}

createBot();

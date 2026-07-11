/**
 * @file This plugin sets up a web dashboard to view bot status.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

module.exports = (bot, sharedState) => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  // A simple, in-memory log of all chat messages for the dashboard.
  const chatHistory = [];

  const dashboardPort = sharedState.CONFIG.DASHBOARD_PORT || 3000;

  // Serve static files from the 'dashboard' directory
  app.use(express.static(path.join(__dirname, '..', 'dashboard')));

  io.on('connection', (socket) => {
    console.log('[Dashboard] A user connected to the dashboard.');
    // Send the complete chat history to the new user.
    socket.emit('initial_log', chatHistory);

    socket.on('disconnect', () => {
      console.log('[Dashboard] User disconnected from the dashboard.');
    });
  });

  // This is a "monkey-patch". It's a pragmatic architectural choice.
  // Instead of modifying every single plugin that calls `sharedState.say()` to also
  // emit a websocket event, we intercept the `say` function itself. We store the
  // original function, then replace it with a new one that *first* calls the original,
  // and *then* does the extra work of emitting the message to the dashboard.
  // This allows us to add dashboard functionality to the entire application
  // by changing code in only one place, which is clean and efficient.
  const originalSay = sharedState.say;
  sharedState.say = (message) => {
    originalSay(message);
    const logEntry = { content: message, timestamp: Date.now() };
    chatHistory.push(logEntry);
    io.emit('new_message', logEntry);
  };

  server.listen(dashboardPort, () => {
    console.log(`[Dashboard] Web dashboard running at http://localhost:${dashboardPort}`);
    // Wait for the bot to spawn before trying to chat, otherwise it will crash.
    bot.once('spawn', () => {
      // Announce the dashboard URL in-game for easy access.
      sharedState.say(`Dashboard is live at http://localhost:${dashboardPort}`);
    });
  });
};
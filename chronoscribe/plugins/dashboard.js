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

  const dashboardPort = sharedState.CONFIG.DASHBOARD_PORT || 3000;

  // Serve static files from the 'dashboard' directory
  app.use(express.static(path.join(__dirname, '..', 'dashboard')));

  io.on('connection', (socket) => {
    console.log('[Dashboard] A user connected to the dashboard.');
    // Send the current memory log to the new user
    socket.emit('initial_log', sharedState.memoryLog);

    socket.on('disconnect', () => {
      console.log('[Dashboard] User disconnected from the dashboard.');
    });
  });

  // Monkey-patch the sharedState.say function to also emit to the dashboard
  const originalSay = sharedState.say;
  sharedState.say = (message) => {
    originalSay(message);
    io.emit('new_message', { content: message, timestamp: Date.now() });
  };

  server.listen(dashboardPort, () => {
    console.log(`[Dashboard] Web dashboard running at http://localhost:${dashboardPort}`);
    // Don't say this in-game, as it's only for the server host.
    // sharedState.say(`Dashboard is live at http://localhost:${dashboardPort}`);
  });
};
document.addEventListener('DOMContentLoaded', () => {
    const logContainer = document.getElementById('log-container');
    const statusSpan = document.getElementById('status');

    // Connect to the Socket.IO server running in the dashboard.js plugin
    const socket = io();

    const addLogMessage = (msg) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('log-message');

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('timestamp');
        timestampSpan.textContent = new Date(msg.timestamp).toLocaleTimeString();

        messageElement.appendChild(timestampSpan);
        messageElement.append(msg.content);
        logContainer.appendChild(messageElement);
        logContainer.scrollTop = logContainer.scrollHeight; // Auto-scroll
    };

    socket.on('connect', () => {
        statusSpan.textContent = 'Connected';
    });

    socket.on('initial_log', (logs) => logs.forEach(addLogMessage));
    socket.on('new_message', addLogMessage);
    socket.on('disconnect', () => statusSpan.textContent = 'Disconnected');
});
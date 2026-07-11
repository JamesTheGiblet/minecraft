const socket = io();
const logContainer = document.getElementById('log-container');
const statusSpan = document.getElementById('status');

function addMessageToLog(msg) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('log-message');
    
    const time = new Date(msg.timestamp).toLocaleTimeString();
    
    messageElement.innerHTML = `<span class="timestamp">${time}</span>${msg.content}`;
    logContainer.appendChild(messageElement);
    logContainer.scrollTop = logContainer.scrollHeight; // Auto-scroll
}

socket.on('connect', () => {
    statusSpan.textContent = 'Connected';
    statusSpan.style.color = '#4CAF50';
});

socket.on('disconnect', () => {
    statusSpan.textContent = 'Disconnected';
    statusSpan.style.color = '#F44336';
});

socket.on('initial_log', (logs) => {
    logContainer.innerHTML = ''; // Clear existing logs
    logs.forEach(addMessageToLog);
});

socket.on('new_message', (msg) => {
    addMessageToLog(msg);
});

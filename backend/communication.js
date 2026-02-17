const db = require('./db'); // Assuming a database module is available
const { validateAttachmentUrl, authorizeUser, rateLimit } = require('./utils');

// Function to retrieve call logs with parameterized queries to prevent SQL injection
async function getCallLogs(userId) {
    const sql = 'SELECT * FROM call_logs WHERE user_id = ?';
    const callLogs = await db.query(sql, [userId]);
    return callLogs;
}

// Function to get message thread with user authorization verification
async function getMessageThread(threadId, userId) {
    // User authorization verification
    const hasAccess = await authorizeUser(userId, threadId);
    if (!hasAccess) {
        throw new Error('Unauthorized access');
    }
    const sql = 'SELECT * FROM message_threads WHERE id = ?';
    const messageThread = await db.query(sql, [threadId]);
    return messageThread;
}

// Function to send a message with attachment URL validation
async function sendMessage(threadId, userId, content, attachmentUrl) {
    // Validate attachment URL
    if (!validateAttachmentUrl(attachmentUrl)) {
        throw new Error('Invalid attachment URL');
    }
    const sql = 'INSERT INTO messages (thread_id, user_id, content, attachment_url) VALUES (?, ?, ?, ?)';
    await db.query(sql, [threadId, userId, content, attachmentUrl]);
}

// Rate limiting helper function
const rateLimiting = (limit, timeFrame) => {
    const requests = new Map();
    return (key) => {
        const currentTime = Date.now();
        const timestamps = requests.get(key) || [];
        const filteredTimestamps = timestamps.filter(timestamp => currentTime - timestamp < timeFrame);
        filteredTimestamps.push(currentTime);
        requests.set(key, filteredTimestamps);
        if (filteredTimestamps.length > limit) {
            throw new Error('Rate limit exceeded');
        }
    };
};

// Function to soft delete a message
async function softDeleteMessage(messageId, userId) {
    const sql = 'UPDATE messages SET deleted = 1 WHERE id = ? AND user_id = ?';
    const result = await db.query(sql, [messageId, userId]);
    if (result.affectedRows === 0) {
        throw new Error('Failed to soft delete the message');
    }
}

module.exports = {
    getCallLogs,
    getMessageThread,
    sendMessage,
    softDeleteMessage,
    rateLimiting,
};

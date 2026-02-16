# Communication Extension API Documentation

## Overview
The Communication Extension provides messaging and call logging capabilities for the Cigar Order Hub platform, enabling communication between suppliers, retailers, and sales representatives.

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:4000/api
```

## Authentication
All communication endpoints require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Table of Contents
1. [Messaging Endpoints](#messaging-endpoints)
2. [Call Logging Endpoints](#call-logging-endpoints)
3. [Data Models](#data-models)
4. [Error Handling](#error-handling)

---

## Messaging Endpoints

### Send Message
Send a new message to another user.

**Endpoint:** `POST /api/protected/messages/send`

**Request Body:**
```json
{
  "recipientId": 2,
  "content": "Hello, how are you?",
  "messageType": "text",
  "attachmentUrl": "https://example.com/file.pdf",
  "attachmentName": "document.pdf"
}
```

**Parameters:**
- `recipientId` (integer, required): ID of the message recipient
- `content` (string, required): Message content (max 10,000 characters)
- `messageType` (string, optional): Type of message - "text", "file", or "attachment" (default: "text")
- `attachmentUrl` (string, optional): URL of attached file
- `attachmentName` (string, optional): Name of attached file

**Response (201 Created):**
```json
{
  "id": 1,
  "threadId": 1,
  "senderId": 1,
  "recipientId": 2,
  "messageType": "text",
  "content": "Hello, how are you?",
  "attachmentUrl": null,
  "attachmentName": null,
  "created_at": "2026-02-16T00:30:00.000Z"
}
```

**RBAC Rules:**
- Suppliers can message retailers and sales reps
- Retailers can message suppliers and sales reps
- Sales reps can message everyone
- Users cannot message themselves

---

### Get Conversations
List all conversations for the current user.

**Endpoint:** `GET /api/protected/messages/conversations`

**Query Parameters:**
- `page` (integer, optional): Page number for pagination (default: 1)
- `limit` (integer, optional): Results per page (default: 20, max: 100)

**Response (200 OK):**
```json
[
  {
    "thread_id": 1,
    "other_user_id": 2,
    "other_user_name": "John Doe",
    "other_user_role": "retailer",
    "other_user_email": "john@example.com",
    "unread_count": 3,
    "last_message_content": "Thanks for the update!",
    "last_message_time": "2026-02-16 00:30:00"
  }
]
```

---

### Get Message Thread
Get all messages in a conversation with a specific user.

**Endpoint:** `GET /api/protected/messages/thread/:userId`

**Path Parameters:**
- `userId` (integer, required): ID of the other user in the conversation

**Query Parameters:**
- `page` (integer, optional): Page number for pagination (default: 1)
- `limit` (integer, optional): Results per page (default: 50, max: 100)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "sender_id": 1,
    "recipient_id": 2,
    "sender_name": "Jane Smith",
    "sender_role": "supplier",
    "message_type": "text",
    "content": "Hello!",
    "attachment_url": null,
    "attachment_name": null,
    "is_read": true,
    "read_at": "2026-02-16 00:31:00",
    "created_at": "2026-02-16 00:30:00"
  }
]
```

**Notes:**
- Messages are returned in descending order (newest first)
- Automatically marks unread messages as read when retrieved
- Returns only messages visible to the current user (not deleted)

---

### Mark Message as Read
Mark a specific message as read.

**Endpoint:** `PUT /api/protected/messages/:id/read`

**Path Parameters:**
- `id` (integer, required): Message ID

**Response (200 OK):**
```json
{
  "success": true,
  "messageId": 1
}
```

**Authorization:**
- Only the message recipient can mark messages as read

---

### Delete Message
Soft delete a message (removes it from sender or recipient view).

**Endpoint:** `DELETE /api/protected/messages/:id`

**Path Parameters:**
- `id` (integer, required): Message ID

**Response (200 OK):**
```json
{
  "success": true,
  "messageId": 1
}
```

**Authorization:**
- Senders can delete messages from their sent view
- Recipients can delete messages from their inbox
- Messages remain visible to the other party unless they also delete

---

### Get Unread Message Count
Get the count of unread messages for the current user.

**Endpoint:** `GET /api/protected/messages/unread/count`

**Response (200 OK):**
```json
{
  "count": 5
}
```

---

## Call Logging Endpoints

### Initiate Call
Log the initiation of a call.

**Endpoint:** `POST /api/protected/calls/initiate`

**Request Body:**
```json
{
  "recipientId": 2,
  "callType": "outbound"
}
```

**Parameters:**
- `recipientId` (integer, required): ID of the call recipient
- `callType` (string, optional): Type of call - "inbound", "outbound", or "missed" (default: "outbound")

**Response (201 Created):**
```json
{
  "id": 1,
  "callerId": 1,
  "recipientId": 2,
  "callType": "outbound",
  "status": "initiated",
  "start_time": "2026-02-16T00:30:00.000Z"
}
```

**RBAC Rules:**
- Same communication rules as messaging apply
- Users can only initiate calls with authorized contacts

---

### Log Call Details
Complete call logging with status, duration, and notes.

**Endpoint:** `POST /api/protected/calls/:id/log`

**Path Parameters:**
- `id` (integer, required): Call log ID

**Request Body:**
```json
{
  "status": "completed",
  "duration": 180,
  "notes": "Discussed product availability and pricing"
}
```

**Parameters:**
- `status` (string, required): Call status - "ringing", "answered", "missed", "completed", or "failed"
- `duration` (integer, optional): Call duration in seconds (default: 0)
- `notes` (string, optional): Notes about the call

**Response (200 OK):**
```json
{
  "success": true,
  "callId": 1,
  "status": "completed",
  "duration": 180
}
```

**Authorization:**
- Only the caller or recipient can update call details

---

### Get Call Logs
Get all call logs for the current user with optional filters.

**Endpoint:** `GET /api/protected/calls/logs`

**Query Parameters:**
- `page` (integer, optional): Page number for pagination (default: 1)
- `limit` (integer, optional): Results per page (default: 50, max: 100)
- `callType` (string, optional): Filter by call type - "inbound", "outbound", or "missed"
- `status` (string, optional): Filter by status - "initiated", "ringing", "answered", "completed", "missed", or "failed"
- `startDate` (string, optional): Filter calls after this date (ISO 8601 format)
- `endDate` (string, optional): Filter calls before this date (ISO 8601 format)

**Example:** `GET /api/protected/calls/logs?callType=outbound&status=completed&startDate=2026-02-01`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "caller_id": 1,
    "recipient_id": 2,
    "caller_name": "Jane Smith",
    "caller_role": "supplier",
    "recipient_name": "John Doe",
    "recipient_role": "retailer",
    "call_type": "outbound",
    "status": "completed",
    "duration": 180,
    "start_time": "2026-02-16 00:30:00",
    "end_time": "2026-02-16 00:33:00",
    "notes": "Discussed product availability",
    "created_at": "2026-02-16 00:30:00"
  }
]
```

---

### Get Call History with User
Get call history between current user and a specific user.

**Endpoint:** `GET /api/protected/calls/logs/:userId`

**Path Parameters:**
- `userId` (integer, required): ID of the other user

**Query Parameters:**
- `page` (integer, optional): Page number for pagination (default: 1)
- `limit` (integer, optional): Results per page (default: 50, max: 100)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "caller_id": 1,
    "recipient_id": 2,
    "call_type": "outbound",
    "status": "completed",
    "duration": 180,
    "start_time": "2026-02-16 00:30:00",
    "end_time": "2026-02-16 00:33:00",
    "notes": "Product inquiry",
    "created_at": "2026-02-16 00:30:00"
  }
]
```

---

### Get Call Analytics
Get call statistics and analytics for the current user.

**Endpoint:** `GET /api/protected/calls/analytics`

**Query Parameters:**
- `startDate` (string, optional): Start date for analytics period (ISO 8601 format)
- `endDate` (string, optional): End date for analytics period (ISO 8601 format)

**Example:** `GET /api/protected/calls/analytics?startDate=2026-02-01&endDate=2026-02-16`

**Response (200 OK):**
```json
{
  "total_calls": 25,
  "completed_calls": 20,
  "missed_calls": 3,
  "inbound_calls": 12,
  "outbound_calls": 13,
  "avg_duration": 245.5,
  "total_duration": 4910,
  "max_duration": 600
}
```

**Metrics Explained:**
- `total_calls`: Total number of calls
- `completed_calls`: Calls with status "completed"
- `missed_calls`: Calls with status "missed"
- `inbound_calls`: Incoming calls
- `outbound_calls`: Outgoing calls
- `avg_duration`: Average call duration in seconds
- `total_duration`: Total time spent on calls in seconds
- `max_duration`: Longest call duration in seconds

---

### Update Call Notes
Add or update notes on a call log.

**Endpoint:** `PUT /api/protected/calls/:id/notes`

**Path Parameters:**
- `id` (integer, required): Call log ID

**Request Body:**
```json
{
  "notes": "Follow up needed on pricing discussion"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "callId": 1,
  "notes": "Follow up needed on pricing discussion"
}
```

**Authorization:**
- Only the caller or recipient can update call notes

---

## Data Models

### Message
```typescript
{
  id: number;
  thread_id: number;
  sender_id: number;
  recipient_id: number;
  message_type: 'text' | 'file' | 'attachment';
  content: string;
  attachment_url?: string;
  attachment_name?: string;
  is_read: boolean;
  read_at?: string;
  deleted_by_sender: boolean;
  deleted_by_recipient: boolean;
  created_at: string;
  updated_at: string;
}
```

### Call Log
```typescript
{
  id: number;
  caller_id: number;
  recipient_id: number;
  call_type: 'inbound' | 'outbound' | 'missed';
  status: 'initiated' | 'ringing' | 'answered' | 'missed' | 'completed' | 'failed';
  duration: number; // seconds
  start_time: string;
  end_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

### Conversation Thread
```typescript
{
  id: number;
  user1_id: number;
  user2_id: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}
```

---

## Error Handling

### Error Response Format
```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

**400 Bad Request**
- Missing required fields
- Invalid message type or call type
- Invalid status value
- Content validation failures

**401 Unauthorized**
- Missing or invalid JWT token
- Token expired

**403 Forbidden**
- Users not authorized to communicate (RBAC violation)
- Attempting to access another user's resources

**404 Not Found**
- Message or call log not found
- User not found

**500 Internal Server Error**
- Database errors
- Unexpected server errors

### Example Error Responses

**Unauthorized Communication:**
```json
{
  "error": "Unauthorized: Users cannot communicate"
}
```

**Missing Fields:**
```json
{
  "error": "Missing required fields"
}
```

**Resource Not Found:**
```json
{
  "error": "Message not found or unauthorized"
}
```

---

## Rate Limiting

Communication endpoints are subject to rate limiting to prevent abuse:

- **Messages:** 60 requests per minute per user
- **Call Logging:** 30 requests per minute per user
- **Read Operations:** 100 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1645123456
```

---

## Best Practices

### Messaging
1. **Content Sanitization:** All message content is automatically sanitized to prevent XSS attacks
2. **Read Receipts:** Messages are automatically marked as read when retrieved via the thread endpoint
3. **Soft Delete:** Deleted messages remain in the database but are hidden from the deleting user's view
4. **Pagination:** Use pagination for large conversation lists to improve performance

### Call Logging
1. **Immediate Initiation:** Call the `/initiate` endpoint when a call starts
2. **Complete Logging:** Call the `/log` endpoint when a call ends with final status and duration
3. **Notes:** Add notes immediately after calls for better context
4. **Analytics:** Use date filters to generate periodic reports

### Security
1. **RBAC Enforcement:** All endpoints enforce role-based communication rules
2. **Input Validation:** All inputs are validated and sanitized
3. **Audit Logging:** All communication actions are logged for compliance
4. **Token Management:** Keep JWT tokens secure and refresh before expiration

---

## Testing Examples

### Using cURL

**Send a Message:**
```bash
curl -X POST http://localhost:4000/api/protected/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipientId": 2,
    "content": "Hello, this is a test message",
    "messageType": "text"
  }'
```

**Get Conversations:**
```bash
curl -X GET http://localhost:4000/api/protected/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Initiate a Call:**
```bash
curl -X POST http://localhost:4000/api/protected/calls/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipientId": 2,
    "callType": "outbound"
  }'
```

**Get Call Analytics:**
```bash
curl -X GET "http://localhost:4000/api/protected/calls/analytics?startDate=2026-02-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Support

For questions or issues with the Communication Extension API:
- Email: support@cigarorderhub.com
- Documentation: https://docs.cigarorderhub.com
- GitHub Issues: https://github.com/beeree7-source/cigar-order-hub/issues

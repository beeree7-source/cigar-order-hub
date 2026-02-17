# Communication API Documentation

All communication endpoints require `Authorization: Bearer <token>`.

Communication is allowed for:
- Approved supplier-retailer relationships (from supplier approvals)
- Same-business employee/team relationships

## Contacts

### GET /api/communication/contacts
Returns communication contacts for the logged-in supplier or retailer.

**Optional query params**
- `teamOnly=true`: Return employee/team contacts only

**Contact fields**
- `id`, `name`, `email`, `role`, `business_name`
- `employee_role` (nullable)
- `communication_type` (`approved_partner` or `team`)

## Messaging Endpoints

### POST /api/messages
Send a message to an allowed communication contact.

**Body**
```json
{
	"recipient_id": 2,
	"content": "Hi, we are ready for this week's reorder."
}
```

### GET /api/messages
Retrieve messages for the logged-in user.

**Optional query params**
- `with_user_id` (number): Return only the conversation with that allowed counterparty/team member.

## Call Logging Endpoints

### POST /api/calls
Create a call log with an allowed communication contact.

**Body**
```json
{
	"recipient_id": 2,
	"call_type": "outbound",
	"duration_seconds": 420,
	"notes": "Discussed new order quantities"
}
```

### GET /api/calls
Retrieve call logs for the logged-in user.

**Optional query params**
- `with_user_id` (number): Return only logs with that allowed counterparty/team member.

## Error Behavior
- `403` when users are neither an approved supplier-retailer pair nor an allowed same-business team relationship.
- `404` when recipient/counterparty does not exist.
- `400` when required input fields are missing.
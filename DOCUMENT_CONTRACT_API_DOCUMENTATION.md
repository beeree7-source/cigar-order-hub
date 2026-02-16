# Document & Contract Management API Documentation

## Overview
This API provides comprehensive document management and digital contract signing capabilities for the Cigar Order Hub platform.

## Base URL
```
Development: http://localhost:4000
Production: https://api.cigar-order-hub.com
```

## Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- **Document Operations**: 100 requests per 15 minutes
- **File Uploads**: 10 uploads per 5 minutes
- **Rate limit headers included in response**

## Document Management

### Upload Document
Upload a document for a specific supplier-retailer relationship.

**Endpoint:** `POST /api/protected/documents/upload`

**Rate Limit:** 10 per 5 minutes

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: <binary> (required)
supplierId: <integer> (required)
retailerId: <integer> (required)
documentType: <string> (optional) - Values: invoice, contract, certificate, license, receipt, photo, other
description: <string> (optional)
```

**Response:**
```json
{
  "message": "Document uploaded successfully",
  "documentId": 123,
  "filename": "uuid-generated-name.pdf"
}
```

**Errors:**
- `400` - Invalid file type or size
- `403` - Unauthorized to upload for this supplier
- `429` - Rate limit exceeded
- `500` - Upload failed

---

### Get Supplier Documents
List all documents for a supplier-retailer pair.

**Endpoint:** `GET /api/protected/documents/supplier/:supplierId/retailer/:retailerId`

**Authorization:**
- Supplier must own the documents (supplierId matches user ID)
- Retailer must be the intended recipient (retailerId matches user ID)

**Response:**
```json
{
  "documents": [
    {
      "id": 123,
      "filename": "uuid-name.pdf",
      "original_filename": "invoice-2024.pdf",
      "file_type": "application/pdf",
      "file_size": 245760,
      "document_type": "invoice",
      "description": "January invoice",
      "uploader_name": "John Supplier",
      "created_at": "2024-01-15T10:30:00Z",
      "scan_enhanced": false,
      "downloadUrl": "/api/protected/documents/123/download"
    }
  ]
}
```

---

### Download Document
Download a specific document.

**Endpoint:** `GET /api/protected/documents/:id/download`

**Authorization:**
- Supplier who uploaded the document
- Retailer the document was shared with

**Response:** Binary file download with appropriate Content-Type header

---

### Delete Document
Delete a document (supplier only).

**Endpoint:** `DELETE /api/protected/documents/:id`

**Authorization:** Supplier who owns the document

**Response:**
```json
{
  "message": "Document deleted successfully"
}
```

---

### Scan & Enhance Document
Apply image enhancement to a scanned document (images only).

**Endpoint:** `POST /api/protected/documents/:id/scan-enhance`

**Rate Limit:** 10 per 5 minutes

**Authorization:** Supplier who owns the document

**Response:**
```json
{
  "message": "Document enhanced successfully",
  "documentId": 123,
  "enhanced": true
}
```

**Note:** Applies auto-normalization, sharpening, and contrast adjustments using Sharp library.

---

## Contract Management

### Create Contract
Create a new digital contract.

**Endpoint:** `POST /api/protected/contracts/create`

**Authorization:** Supplier only

**Request Body:**
```json
{
  "retailerId": 456,
  "title": "Annual Supply Agreement 2024",
  "content": "Full contract text with terms...",
  "contractType": "sales",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Contract Types:** sales, service, nda, partnership, other

**Response:**
```json
{
  "message": "Contract created successfully",
  "contractId": 789,
  "contractNumber": "CON-1234567890-001"
}
```

---

### Send Contract to Retailer
Send a draft contract to retailer for signing.

**Endpoint:** `POST /api/protected/contracts/:id/send`

**Authorization:** Supplier who created the contract

**Response:**
```json
{
  "message": "Contract sent successfully",
  "contractId": 789,
  "status": "sent"
}
```

**Note:** Generates PDF automatically if not already generated.

---

### Get Contract Details
Retrieve full contract details including signatures.

**Endpoint:** `GET /api/protected/contracts/:id`

**Authorization:** 
- Supplier who created the contract
- Retailer the contract was sent to

**Response:**
```json
{
  "contract": {
    "id": 789,
    "contract_number": "CON-1234567890-001",
    "title": "Annual Supply Agreement 2024",
    "content": "Full contract text...",
    "contract_type": "sales",
    "status": "sent",
    "supplier_name": "John Supplier",
    "supplier_email": "john@supplier.com",
    "retailer_name": "Jane Retailer",
    "retailer_email": "jane@retailer.com",
    "created_at": "2024-01-15T10:00:00Z",
    "sent_at": "2024-01-15T10:30:00Z",
    "viewed_at": null,
    "signed_at": null,
    "expires_at": "2024-12-31T23:59:59Z",
    "pdfUrl": "/api/protected/contracts/789/pdf"
  },
  "signatures": []
}
```

**Status Values:** draft, sent, viewed, signed, completed, cancelled

---

### List Supplier Contracts
Get all contracts created by a supplier.

**Endpoint:** `GET /api/protected/contracts/supplier/:supplierId`

**Authorization:** Supplier matching supplierId

**Response:**
```json
{
  "contracts": [
    {
      "id": 789,
      "contract_number": "CON-1234567890-001",
      "title": "Annual Supply Agreement 2024",
      "contract_type": "sales",
      "status": "sent",
      "retailer_name": "Jane Retailer",
      "retailer_email": "jane@retailer.com",
      "created_at": "2024-01-15T10:00:00Z",
      "sent_at": "2024-01-15T10:30:00Z",
      "signed_at": null
    }
  ]
}
```

---

### Get Pending Contracts
Get pending contracts for a retailer to sign.

**Endpoint:** `GET /api/protected/contracts/retailer/:retailerId/pending`

**Authorization:** Retailer matching retailerId

**Response:** Same format as List Supplier Contracts

---

### Update Contract Status
Update contract status (supplier only).

**Endpoint:** `PUT /api/protected/contracts/:id/status`

**Authorization:** Supplier who created the contract

**Request Body:**
```json
{
  "status": "cancelled"
}
```

**Valid Status Transitions:**
- draft → sent
- sent → cancelled
- signed → completed
- any → cancelled

---

### Download Contract PDF
Download generated contract PDF.

**Endpoint:** `GET /api/protected/contracts/:id/pdf`

**Authorization:** Supplier or Retailer involved in contract

**Response:** PDF file download

---

## E-Signature Management

### Initialize Signature Workflow
Check if contract is ready for signing.

**Endpoint:** `POST /api/protected/contracts/:id/signature/initialize`

**Authorization:** Retailer the contract was sent to

**Response:**
```json
{
  "message": "Ready to sign",
  "contractId": 789,
  "signerId": 456,
  "signerRole": "retailer"
}
```

---

### Submit E-Signature
Sign a contract with electronic signature.

**Endpoint:** `POST /api/protected/contracts/:id/signature`

**Authorization:** Retailer the contract was sent to

**Request Body:**

**For Draw Signature:**
```json
{
  "signatureType": "draw",
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

**For Type Signature:**
```json
{
  "signatureType": "type",
  "signatureData": "John Doe"
}
```

**For Upload Signature:**
```json
{
  "signatureType": "upload",
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

**Response:**
```json
{
  "message": "Signature saved successfully",
  "signatureId": 999,
  "contractId": 789,
  "status": "signed"
}
```

**Contract Status Changes:** sent/viewed → signed

---

### Get Signature Status
Check signing status of a contract.

**Endpoint:** `GET /api/protected/contracts/:id/signature-status`

**Authorization:** Supplier or Retailer involved in contract

**Response:**
```json
{
  "contractId": 789,
  "status": "signed",
  "signatures": [
    {
      "id": 999,
      "signerName": "Jane Retailer",
      "signerRole": "retailer",
      "signatureType": "draw",
      "signedAt": "2024-01-15T15:30:00Z"
    }
  ],
  "isSigned": true,
  "signedAt": "2024-01-15T15:30:00Z"
}
```

---

### Complete Contract Signing
Finalize a signed contract (supplier only).

**Endpoint:** `PUT /api/protected/contracts/:id/complete`

**Authorization:** Supplier who created the contract

**Requirements:** Contract must be in "signed" status

**Response:**
```json
{
  "message": "Contract completed successfully",
  "contractId": 789,
  "status": "completed"
}
```

---

## Audit Logging

### Get Audit Log
Retrieve audit trail for a document or contract.

**Endpoint:** `GET /api/protected/:entityType/:entityId/audit-log`

**Entity Types:** document, contract, signature

**Authorization:** Supplier or Retailer involved with the entity

**Response:**
```json
{
  "auditLogs": [
    {
      "id": 1,
      "userName": "John Supplier",
      "action": "upload",
      "details": {
        "filename": "invoice.pdf",
        "size": 245760,
        "type": "application/pdf"
      },
      "ipAddress": "192.168.1.100",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Error Responses

All endpoints return standard error format:

```json
{
  "error": "Error message description"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## File Specifications

### Allowed Document Types
- `application/pdf` - PDF documents
- `image/jpeg`, `image/jpg` - JPEG images
- `image/png` - PNG images
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - DOCX
- `application/msword` - DOC

### File Size Limits
- Maximum: 50MB (configurable via `MAX_DOCUMENT_SIZE` environment variable)
- Recommended: Under 10MB for optimal performance

### Signature Image Requirements
- Format: PNG (base64 encoded)
- Recommended size: 400x150 pixels
- Maximum size: Included in document size limit

---

## Environment Configuration

Required environment variables:

```bash
# Storage Paths
DOCUMENT_STORAGE_PATH=/uploads/documents
CONTRACT_STORAGE_PATH=/uploads/contracts
SIGNATURE_STORAGE_PATH=/uploads/signatures
MAX_DOCUMENT_SIZE=52428800

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-jwt-secret

# API Configuration
FRONTEND_URL=https://app.cigar-order-hub.com
PORT=4000
```

---

## WebSocket Events (Future Enhancement)

Real-time notifications for contract actions (not yet implemented):

- `contract:sent` - Contract sent to retailer
- `contract:viewed` - Retailer viewed contract
- `contract:signed` - Contract signed
- `contract:completed` - Contract finalized

---

## Best Practices

### For Suppliers
1. Always provide meaningful document descriptions
2. Use appropriate document types for filtering
3. Delete outdated documents to save storage
4. Complete signed contracts promptly
5. Review audit logs regularly

### For Retailers
1. Review contracts before signing
2. Verify contract expiration dates
3. Download signed contracts for records
4. Contact supplier for contract questions

### For Developers
1. Always handle file upload errors gracefully
2. Implement progress indicators for uploads
3. Use optimistic UI updates where appropriate
4. Cache document lists client-side
5. Implement retry logic for failed operations

---

## Support & Contact

For API issues or questions:
- GitHub Issues: https://github.com/beeree7-source/cigar-order-hub/issues
- Documentation: See DOCUMENT_CONTRACT_IMPLEMENTATION_SUMMARY.md
- Security: See DOCUMENT_CONTRACT_SECURITY_SUMMARY.md

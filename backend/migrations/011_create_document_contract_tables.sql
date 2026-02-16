-- ============================================
-- Document Management & Digital Contract System
-- Migration 011 - Create document and contract tables
-- ============================================

-- Supplier Documents Table
-- Stores uploaded documents with metadata linked to supplier-retailer relationships
CREATE TABLE IF NOT EXISTS supplier_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  retailer_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  upload_date TEXT NOT NULL DEFAULT (datetime('now')),
  uploader_id INTEGER NOT NULL,
  document_type TEXT CHECK(document_type IN ('invoice', 'contract', 'license', 'certificate', 'report', 'photo', 'other')) DEFAULT 'other',
  status TEXT CHECK(status IN ('active', 'archived', 'deleted')) DEFAULT 'active',
  notes TEXT,
  FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (retailer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Digital Contracts Table
-- Stores contract templates and instances with lifecycle tracking
CREATE TABLE IF NOT EXISTS digital_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  retailer_id INTEGER NOT NULL,
  contract_name TEXT NOT NULL,
  contract_content TEXT NOT NULL,
  pdf_file_path TEXT,
  status TEXT CHECK(status IN ('draft', 'sent', 'viewed', 'signed', 'completed', 'cancelled')) DEFAULT 'draft',
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  sent_date TEXT,
  signed_date TEXT,
  completed_date TEXT,
  signature_required_by TEXT,
  created_by INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (retailer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Contract Signatures Table
-- Stores e-signature data and signing workflow
CREATE TABLE IF NOT EXISTS contract_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  signer_id INTEGER NOT NULL,
  signer_name TEXT NOT NULL,
  signature_type TEXT CHECK(signature_type IN ('draw', 'type', 'upload')) NOT NULL,
  signature_data TEXT NOT NULL,
  signature_image_path TEXT,
  signed_date TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (contract_id) REFERENCES digital_contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (signer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Document Audit Logs Table
-- Audit trail for document/contract actions
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT CHECK(entity_type IN ('document', 'contract')) NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT CHECK(action IN ('upload', 'view', 'download', 'send', 'sign', 'delete', 'archive', 'update', 'create')) NOT NULL,
  user_id INTEGER NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  notes TEXT,
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier ON supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_retailer ON supplier_documents(retailer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_status ON supplier_documents(status);
CREATE INDEX IF NOT EXISTS idx_digital_contracts_supplier ON digital_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_digital_contracts_retailer ON digital_contracts(retailer_id);
CREATE INDEX IF NOT EXISTS idx_digital_contracts_status ON digital_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract ON contract_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_logs_entity ON document_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_logs_user ON document_audit_logs(user_id);

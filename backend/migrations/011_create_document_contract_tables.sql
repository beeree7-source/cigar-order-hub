-- ============================================
-- Document Scanner & Digital Contract Tables
-- Migration 011
-- Adds document management and e-signature functionality
-- ============================================

-- 1. Supplier Documents Table
-- Store uploaded documents with metadata
CREATE TABLE IF NOT EXISTS supplier_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  retailer_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  document_type TEXT CHECK(document_type IN ('invoice', 'contract', 'certificate', 'license', 'receipt', 'photo', 'other')) DEFAULT 'other',
  is_scanned BOOLEAN DEFAULT 0,
  scan_enhanced BOOLEAN DEFAULT 0,
  description TEXT,
  uploaded_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(supplier_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(retailer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier ON supplier_documents(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_retailer ON supplier_documents(retailer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_type ON supplier_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_supplier_documents_created ON supplier_documents(created_at);

-- 2. Digital Contracts Table
-- Store contract templates and instances
CREATE TABLE IF NOT EXISTS digital_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_number TEXT UNIQUE NOT NULL,
  supplier_id INTEGER NOT NULL,
  retailer_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  contract_type TEXT CHECK(contract_type IN ('sales', 'service', 'nda', 'partnership', 'other')) DEFAULT 'sales',
  status TEXT CHECK(status IN ('draft', 'sent', 'viewed', 'signed', 'completed', 'cancelled')) DEFAULT 'draft',
  pdf_path TEXT,
  template_id INTEGER,
  sent_at DATETIME,
  viewed_at DATETIME,
  signed_at DATETIME,
  expires_at DATETIME,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(supplier_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(retailer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contracts_supplier ON digital_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_contracts_retailer ON digital_contracts(retailer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON digital_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_number ON digital_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_created ON digital_contracts(created_at);

-- 3. Contract Signatures Table
-- Store e-signature data and signing workflow
CREATE TABLE IF NOT EXISTS contract_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  signer_id INTEGER NOT NULL,
  signer_role TEXT CHECK(signer_role IN ('supplier', 'retailer')) NOT NULL,
  signature_type TEXT CHECK(signature_type IN ('draw', 'type', 'upload')) NOT NULL,
  signature_data TEXT NOT NULL,
  signature_image_path TEXT,
  ip_address TEXT,
  user_agent TEXT,
  signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(contract_id) REFERENCES digital_contracts(id) ON DELETE CASCADE,
  FOREIGN KEY(signer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signatures_contract ON contract_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signer ON contract_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signed_at ON contract_signatures(signed_at);

-- 4. Document Audit Logs Table
-- Audit trail for document/contract actions
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  entity_type TEXT CHECK(entity_type IN ('document', 'contract', 'signature')) NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON document_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON document_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON document_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON document_audit_logs(created_at);

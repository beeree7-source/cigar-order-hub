const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const HEADER_MAPPINGS = {
  name: ['name', 'product', 'product name', 'item', 'item name', 'description'],
  sku: ['sku', 'code', 'product code', 'item code', 'id'],
  price: ['price', 'unit price', 'cost', 'rate'],
  stock: ['stock', 'qty', 'quantity', 'inventory', 'on hand'],
  category: ['category', 'type', 'group'],
  description: ['description', 'details', 'notes']
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const detectColumnMap = (headers) => {
  const map = {};
  const normalizedHeaders = headers.map((header) => normalize(header));

  Object.entries(HEADER_MAPPINGS).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (index !== -1) {
      map[field] = headers[index];
    }
  });

  return map;
};

const parseCSV = (rawText) => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const splitCsvLine = (line) => {
    const parts = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    parts.push(current.trim());
    return parts;
  };

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    return row;
  });

  return { headers, rows };
};

const parseExcel = (fileBuffer) => {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const headers = rows.length ? Object.keys(rows[0]) : [];

  return { headers, rows };
};

const parsePdfInventory = async (fileBuffer) => {
  const parsed = await pdfParse(fileBuffer);
  const text = parsed.text || '';
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rowCandidates = [];

  for (const line of lines) {
    const skuMatch = line.match(/[A-Z]{2,}[\-\_]?\d{2,}/i);
    const priceMatch = line.match(/\$?\s?(\d+(?:\.\d{1,2})?)/);
    const stockMatch = line.match(/(?:qty|quantity|stock|on\s?hand)\s*[:\-]?\s*(\d+)/i);

    if (skuMatch || stockMatch) {
      const cleanName = line
        .replace(/\$?\s?\d+(?:\.\d{1,2})?/g, '')
        .replace(/(?:qty|quantity|stock|on\s?hand)\s*[:\-]?\s*\d+/gi, '')
        .replace(/[\|\-]{2,}/g, ' ')
        .trim();

      rowCandidates.push({
        name: cleanName || `Imported Item ${rowCandidates.length + 1}`,
        sku: skuMatch ? skuMatch[0].toUpperCase() : `PDF-SKU-${rowCandidates.length + 1}`,
        price: priceMatch ? priceMatch[1] : '',
        stock: stockMatch ? stockMatch[1] : '0',
        category: 'Imported',
        description: 'AI-assisted extraction from PDF'
      });
    }
  }

  return {
    headers: ['name', 'sku', 'price', 'stock', 'category', 'description'],
    rows: rowCandidates
  };
};

const toNormalizedProducts = (rows, columnMap, sourceType) => {
  return rows
    .map((row, index) => {
      const read = (field) => {
        const mappedColumn = columnMap[field];
        if (mappedColumn) {
          return row[mappedColumn];
        }
        return row[field];
      };

      const name = String(read('name') || '').trim();
      const skuRaw = String(read('sku') || '').trim();
      const sku = skuRaw || `IMPORTED-SKU-${Date.now()}-${index + 1}`;
      const priceValue = Number.parseFloat(String(read('price') || '0').replace(/[^\d.\-]/g, ''));
      const stockValue = Number.parseInt(String(read('stock') || '0').replace(/[^\d\-]/g, ''), 10);
      const category = String(read('category') || 'Imported').trim();
      const description = String(read('description') || '').trim();

      if (!name) {
        return null;
      }

      return {
        name,
        sku,
        price: Number.isFinite(priceValue) ? priceValue : 0,
        stock: Number.isFinite(stockValue) ? stockValue : 0,
        category: category || 'Imported',
        description,
        sourceType
      };
    })
    .filter(Boolean);
};

router.post('/preview', upload.single('inventoryFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Attach inventoryFile.' });
    }

    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname || 'inventory-file';
    const extension = originalName.split('.').pop()?.toLowerCase() || '';

    let parsedResult;
    let sourceType = 'csv';

    if (mimeType.includes('csv') || extension === 'csv') {
      parsedResult = parseCSV(req.file.buffer.toString('utf8'));
      sourceType = 'csv';
    } else if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      extension === 'xlsx' ||
      extension === 'xls'
    ) {
      parsedResult = parseExcel(req.file.buffer);
      sourceType = 'excel';
    } else if (mimeType.includes('pdf') || extension === 'pdf') {
      parsedResult = await parsePdfInventory(req.file.buffer);
      sourceType = 'pdf_ai_assisted';
    } else {
      return res.status(400).json({
        error: 'Unsupported file type. Use CSV, XLS/XLSX, or PDF.'
      });
    }

    const headers = parsedResult.headers || [];
    const rows = parsedResult.rows || [];
    const detectedColumnMap = detectColumnMap(headers);
    const normalizedProducts = toNormalizedProducts(rows, detectedColumnMap, sourceType);

    return res.json({
      message: 'Inventory file parsed successfully',
      sourceType,
      fileName: originalName,
      headers,
      detectedColumnMap,
      totalRows: rows.length,
      validRows: normalizedProducts.length,
      skippedRows: rows.length - normalizedProducts.length,
      preview: normalizedProducts.slice(0, 25)
    });
  } catch (error) {
    console.error('Inventory preview error:', error);
    return res.status(500).json({ error: 'Failed to parse inventory file' });
  }
});

router.get('/template.csv', (req, res) => {
  const rows = [
    ['name', 'sku', 'price', 'stock', 'category', 'description'],
    ['Premium Cigar A', 'SKU-1001', '25.99', '150', 'Premium', 'Top shelf hand-rolled cigar'],
    ['Standard Cigar B', 'SKU-1002', '12.50', '300', 'Standard', 'Reliable daily seller']
  ];

  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=inventory-import-template.csv');
  return res.send(csv);
});

router.get('/template.xlsx', (req, res) => {
  const data = [
    ['name', 'sku', 'price', 'stock', 'category', 'description'],
    ['Premium Cigar A', 'SKU-1001', 25.99, 150, 'Premium', 'Top shelf hand-rolled cigar'],
    ['Standard Cigar B', 'SKU-1002', 12.5, 300, 'Standard', 'Reliable daily seller']
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Inventory Template');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=inventory-import-template.xlsx');
  return res.send(buffer);
});

router.post('/commit', (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'No products provided for import' });
    }

    if (!req.app.locals.mockProducts || !Array.isArray(req.app.locals.mockProducts)) {
      return res.status(500).json({ error: 'Inventory store unavailable' });
    }

    const userRole = req.user?.role;
    if (!['supplier', 'retailer', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only supplier/retailer/admin can import inventory' });
    }

    let productIdCounter = req.app.locals.productIdCounter || 1;
    const imported = [];

    products.forEach((product) => {
      if (!product?.name) {
        return;
      }

      const cleanSku = String(product.sku || '').trim();
      const sku = cleanSku || `IMPORTED-SKU-${Date.now()}-${productIdCounter}`;
      const existsBySku = req.app.locals.mockProducts.some((p) => normalize(p.sku) === normalize(sku));

      if (existsBySku) {
        return;
      }

      const record = {
        id: productIdCounter,
        supplierId: Number(product.supplierId || req.user.userId),
        name: String(product.name).trim(),
        sku,
        price: Number.parseFloat(product.price) || 0,
        stock: Number.parseInt(product.stock, 10) || 0,
        category: String(product.category || 'Imported').trim(),
        description: String(product.description || '').trim(),
        imageUrl: String(product.imageUrl || '').trim()
      };

      productIdCounter += 1;
      req.app.locals.mockProducts.push(record);
      imported.push(record);
    });

    req.app.locals.productIdCounter = productIdCounter;

    return res.status(201).json({
      message: 'Inventory import completed',
      importedCount: imported.length,
      skippedCount: products.length - imported.length,
      imported
    });
  } catch (error) {
    console.error('Inventory commit error:', error);
    return res.status(500).json({ error: 'Failed to import inventory' });
  }
});

module.exports = router;

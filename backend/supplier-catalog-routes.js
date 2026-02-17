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

const CORE_FIELD_ALIASES = {
  name: ['name', 'product', 'product name', 'item', 'item name'],
  sku: ['sku', 'code', 'product code', 'item code', 'id'],
  price: ['price', 'unit price', 'cost', 'rate', 'wholesale price'],
  msrp: ['msrp', 'retail price', 'suggested retail', 'suggested retail price'],
  stock: ['stock', 'qty', 'quantity', 'inventory', 'on hand'],
  category: ['category', 'type', 'group'],
  description: ['description', 'details', 'notes'],
  tax: ['tax', 'taxes', 'sales tax', 'excise tax', 'tobacco tax'],
  importFee: ['import fee', 'import fees', 'duty', 'duties', 'customs fee']
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const detectColumnMap = (headers) => {
  const normalizedHeaders = headers.map((header) => normalize(header));
  const columnMap = {};

  Object.entries(CORE_FIELD_ALIASES).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) => aliases.includes(header));
    if (index !== -1) {
      columnMap[field] = headers[index];
    }
  });

  return columnMap;
};

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

const parseCsv = (rawText) => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return row;
  });

  return { headers, rows };
};

const parseExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return { headers, rows };
};

const parsePdfPriceList = async (buffer) => {
  const parsed = await pdfParse(buffer);
  const text = parsed.text || '';
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];

  for (const line of lines) {
    const skuMatch = line.match(/[A-Z]{2,}[\-\_]?[0-9]{2,}/i);
    const numbers = [...line.matchAll(/\d+(?:\.\d{1,2})?/g)].map((match) => match[0]);

    if (!skuMatch || numbers.length === 0) {
      continue;
    }

    const price = numbers.length > 0 ? numbers[numbers.length - 1] : '0';
    const msrp = numbers.length > 1 ? numbers[numbers.length - 2] : '';

    const name = line
      .replace(skuMatch[0], '')
      .replace(/\d+(?:\.\d{1,2})?/g, '')
      .replace(/[\|\-]{2,}/g, ' ')
      .trim();

    rows.push({
      name: name || `Imported Product ${rows.length + 1}`,
      sku: skuMatch[0].toUpperCase(),
      price,
      msrp,
      stock: '0',
      category: 'Imported',
      description: 'AI-assisted extraction from PDF price list',
      tax: '',
      importFee: ''
    });
  }

  return {
    headers: ['name', 'sku', 'price', 'msrp', 'stock', 'category', 'description', 'tax', 'importFee'],
    rows
  };
};

const toNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^\d.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInt = (value) => {
  const parsed = Number.parseInt(String(value ?? '').replace(/[^\d\-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCatalogRows = (rows, headers, columnMap, sourceType) => {
  const mappedColumns = new Set(Object.values(columnMap));
  const dynamicColumns = headers.filter((header) => !mappedColumns.has(header));

  const items = rows
    .map((row, index) => {
      const read = (field) => {
        const mappedHeader = columnMap[field];
        if (mappedHeader) {
          return row[mappedHeader];
        }
        return row[field];
      };

      const name = String(read('name') || '').trim();
      if (!name) {
        return null;
      }

      const skuRaw = String(read('sku') || '').trim();
      const sku = skuRaw || `CAT-${Date.now()}-${index + 1}`;

      const dynamicFields = {};
      dynamicColumns.forEach((column) => {
        dynamicFields[column] = row[column] ?? '';
      });

      return {
        name,
        sku,
        price: toNumber(read('price')),
        msrp: toNumber(read('msrp')),
        stock: toInt(read('stock')),
        category: String(read('category') || 'Imported').trim(),
        description: String(read('description') || '').trim(),
        tax: toNumber(read('tax')),
        importFee: toNumber(read('importFee')),
        dynamicFields,
        sourceType
      };
    })
    .filter(Boolean);

  return {
    items,
    dynamicColumns
  };
};

const requireSupplierCatalogWrite = (req, res, next) => {
  const role = req.user?.role;
  if (role !== 'supplier' && role !== 'admin') {
    return res.status(403).json({ error: 'Only supplier/admin can edit supplier catalogs' });
  }
  return next();
};

router.post('/pricelist/preview', requireSupplierCatalogWrite, upload.single('catalogFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Attach catalogFile.' });
    }

    const originalName = req.file.originalname || 'catalog-file';
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const mimeType = req.file.mimetype || '';

    let parsed;
    let sourceType = 'csv';

    if (mimeType.includes('csv') || extension === 'csv') {
      parsed = parseCsv(req.file.buffer.toString('utf8'));
      sourceType = 'csv';
    } else if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      extension === 'xlsx' ||
      extension === 'xls'
    ) {
      parsed = parseExcel(req.file.buffer);
      sourceType = 'excel';
    } else if (mimeType.includes('pdf') || extension === 'pdf') {
      parsed = await parsePdfPriceList(req.file.buffer);
      sourceType = 'pdf_ai_assisted';
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use CSV, XLS/XLSX, or PDF.' });
    }

    const headers = parsed.headers || [];
    const rows = parsed.rows || [];
    const columnMap = detectColumnMap(headers);
    const normalized = normalizeCatalogRows(rows, headers, columnMap, sourceType);

    return res.json({
      message: 'Catalog/pricelist parsed successfully',
      sourceType,
      fileName: originalName,
      headers,
      detectedColumnMap: columnMap,
      availableDynamicColumns: normalized.dynamicColumns,
      totalRows: rows.length,
      validRows: normalized.items.length,
      skippedRows: rows.length - normalized.items.length,
      preview: normalized.items.slice(0, 30)
    });
  } catch (error) {
    console.error('Catalog preview error:', error);
    return res.status(500).json({ error: 'Failed to parse catalog/pricelist file' });
  }
});

router.post('/pricelist/commit', requireSupplierCatalogWrite, (req, res) => {
  try {
    const { items, showMSRP = false, selectedColumns = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No catalog items provided' });
    }

    if (!req.app.locals.supplierCatalogs || !Array.isArray(req.app.locals.supplierCatalogs)) {
      req.app.locals.supplierCatalogs = [];
    }

    const supplierId = req.user.userId;
    const supplierUser = (req.app.locals.mockUsers || []).find((user) => user.id === supplierId);

    const normalizedSelectedColumns = Array.isArray(selectedColumns)
      ? [...new Set(selectedColumns.map((value) => String(value).trim()).filter(Boolean))]
      : [];

    const cleanedItems = items
      .map((item, index) => {
        if (!item?.name) {
          return null;
        }

        const dynamicFields = item.dynamicFields && typeof item.dynamicFields === 'object'
          ? item.dynamicFields
          : {};

        return {
          lineId: index + 1,
          name: String(item.name).trim(),
          sku: String(item.sku || `CAT-${Date.now()}-${index + 1}`).trim(),
          price: toNumber(item.price),
          msrp: toNumber(item.msrp),
          stock: toInt(item.stock),
          category: String(item.category || 'Imported').trim(),
          description: String(item.description || '').trim(),
          tax: toNumber(item.tax),
          importFee: toNumber(item.importFee),
          dynamicFields
        };
      })
      .filter(Boolean);

    const existingIndex = req.app.locals.supplierCatalogs.findIndex((catalog) => catalog.supplierId === supplierId);

    const catalogRecord = {
      supplierId,
      supplierName: supplierUser?.business_name || supplierUser?.name || `Supplier ${supplierId}`,
      showMSRP: Boolean(showMSRP),
      selectedColumns: normalizedSelectedColumns,
      updatedAt: new Date().toISOString(),
      itemCount: cleanedItems.length,
      items: cleanedItems
    };

    if (existingIndex === -1) {
      req.app.locals.supplierCatalogs.push(catalogRecord);
    } else {
      req.app.locals.supplierCatalogs[existingIndex] = catalogRecord;
    }

    return res.status(201).json({
      message: 'Supplier catalog/pricelist saved',
      catalog: catalogRecord
    });
  } catch (error) {
    console.error('Catalog commit error:', error);
    return res.status(500).json({ error: 'Failed to save catalog/pricelist' });
  }
});

router.get('/pricelist/template.csv', requireSupplierCatalogWrite, (req, res) => {
  const rows = [
    ['name', 'sku', 'price', 'msrp', 'stock', 'category', 'description', 'tax', 'importFee', 'case_size', 'origin_country'],
    ['Premium Cigar A', 'SKU-1001', '25.99', '34.99', '150', 'Premium', 'Top shelf hand-rolled cigar', '1.20', '0.75', '24', 'Nicaragua'],
    ['Standard Cigar B', 'SKU-1002', '12.50', '18.99', '300', 'Standard', 'Reliable daily seller', '0.80', '0.40', '20', 'Dominican Republic']
  ];

  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=supplier-catalog-pricelist-template.csv');
  return res.send(csv);
});

router.get('/pricelist/template.xlsx', requireSupplierCatalogWrite, (req, res) => {
  const data = [
    ['name', 'sku', 'price', 'msrp', 'stock', 'category', 'description', 'tax', 'importFee', 'case_size', 'origin_country'],
    ['Premium Cigar A', 'SKU-1001', 25.99, 34.99, 150, 'Premium', 'Top shelf hand-rolled cigar', 1.2, 0.75, 24, 'Nicaragua'],
    ['Standard Cigar B', 'SKU-1002', 12.5, 18.99, 300, 'Standard', 'Reliable daily seller', 0.8, 0.4, 20, 'Dominican Republic']
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Catalog Pricelist Template');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=supplier-catalog-pricelist-template.xlsx');
  return res.send(buffer);
});

router.get('/pricelist/my', (req, res) => {
  const supplierId = req.user.userId;
  const catalog = (req.app.locals.supplierCatalogs || []).find((entry) => entry.supplierId === supplierId);

  if (!catalog) {
    return res.status(404).json({ error: 'No catalog/pricelist saved for this supplier' });
  }

  return res.json(catalog);
});

router.get('/pricelist/suppliers', (req, res) => {
  const catalogs = req.app.locals.supplierCatalogs || [];
  const suppliers = catalogs.map((catalog) => ({
    supplierId: catalog.supplierId,
    supplierName: catalog.supplierName,
    updatedAt: catalog.updatedAt,
    itemCount: catalog.itemCount
  }));

  return res.json({ suppliers });
});

router.get('/pricelist/supplier/:supplierId', (req, res) => {
  const supplierId = Number(req.params.supplierId);
  const catalog = (req.app.locals.supplierCatalogs || []).find((entry) => entry.supplierId === supplierId);

  if (!catalog) {
    return res.status(404).json({ error: 'Supplier catalog/pricelist not found' });
  }

  const role = req.user?.role;
  const isOwnerOrAdmin = req.user?.userId === supplierId || role === 'admin';

  const selectedColumns = catalog.selectedColumns || [];

  const items = catalog.items.map((item) => {
    const base = {
      lineId: item.lineId,
      name: item.name,
      sku: item.sku,
      price: item.price,
      stock: item.stock,
      category: item.category,
      description: item.description,
      tax: item.tax,
      importFee: item.importFee
    };

    if (isOwnerOrAdmin || catalog.showMSRP) {
      base.msrp = item.msrp;
    }

    selectedColumns.forEach((column) => {
      if (Object.prototype.hasOwnProperty.call(item.dynamicFields || {}, column)) {
        base[column] = item.dynamicFields[column];
      }
    });

    return base;
  });

  return res.json({
    supplierId: catalog.supplierId,
    supplierName: catalog.supplierName,
    showMSRP: catalog.showMSRP,
    selectedColumns,
    updatedAt: catalog.updatedAt,
    itemCount: catalog.itemCount,
    items
  });
});

module.exports = router;

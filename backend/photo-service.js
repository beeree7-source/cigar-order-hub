const db = require('./database');
const path = require('path');

/**
 * Photo Service
 * Handles photo upload, approval workflow, and gallery management
 * Note: This uses local file storage. For production, integrate with S3 or cloud storage.
 */

/**
 * Upload photo
 */
const uploadPhoto = (req, res) => {
  const { visit_id, photo_url, photo_type, file_size, file_name, photo_metadata } = req.body;

  // Validate photo type
  const validTypes = ['display', 'inventory', 'product', 'signage', 'store_front', 'other'];
  if (photo_type && !validTypes.includes(photo_type)) {
    return res.status(400).json({ error: 'Invalid photo type' });
  }

  const query = `
    INSERT INTO account_visit_photos (
      visit_id, photo_url, photo_type, file_size, file_name, photo_metadata
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [visit_id, photo_url, photo_type || 'other', file_size, file_name, photo_metadata],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Photo uploaded successfully',
        photo_id: this.lastID,
        taken_at: new Date().toISOString()
      });
    }
  );
};

/**
 * Get photos from visit
 */
const getVisitPhotos = (req, res) => {
  const { visit_id } = req.params;

  const query = `
    SELECT avp.*, av.account_id, av.sales_rep_id, av.visit_date
    FROM account_visit_photos avp
    JOIN account_visits av ON avp.visit_id = av.id
    WHERE avp.visit_id = ?
    ORDER BY avp.taken_at DESC
  `;

  db.all(query, [visit_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      visit_id,
      photos: rows,
      count: rows.length
    });
  });
};

/**
 * Get photos from account
 */
const getAccountPhotos = (req, res) => {
  const { account_id } = req.params;
  const { photo_type, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT avp.*, av.visit_date, av.sales_rep_id
    FROM account_visit_photos avp
    JOIN account_visits av ON avp.visit_id = av.id
    WHERE av.account_id = ?
  `;
  const params = [account_id];

  if (photo_type) {
    query += ` AND avp.photo_type = ?`;
    params.push(photo_type);
  }

  query += ` ORDER BY avp.taken_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM account_visit_photos avp
      JOIN account_visits av ON avp.visit_id = av.id
      WHERE av.account_id = ?
    `;
    const countParams = [account_id];

    if (photo_type) {
      countQuery += ` AND avp.photo_type = ?`;
      countParams.push(photo_type);
    }

    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        account_id,
        photos: rows,
        count: rows.length,
        total: countRow.total,
        offset,
        limit
      });
    });
  });
};

/**
 * Approve photo
 */
const approvePhoto = (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  // Add approval metadata to the photo
  db.get('SELECT * FROM account_visit_photos WHERE id = ?', [id], (err, photo) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    let metadata = {};
    try {
      metadata = photo.photo_metadata ? JSON.parse(photo.photo_metadata) : {};
    } catch (e) {
      console.error(`Failed to parse photo metadata for photo ID ${id}:`, e.message);
      console.error(`Corrupted metadata value:`, photo.photo_metadata);
      metadata = {}; // Reset to empty object, but operation continues
    }

    metadata.approval_status = 'approved';
    metadata.approved_by = approved_by;
    metadata.approved_at = new Date().toISOString();

    const query = `
      UPDATE account_visit_photos 
      SET photo_metadata = ?
      WHERE id = ?
    `;

    db.run(query, [JSON.stringify(metadata), id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: 'Photo approved successfully',
        photo_id: id,
        approved_at: metadata.approved_at
      });
    });
  });
};

/**
 * Reject photo
 */
const rejectPhoto = (req, res) => {
  const { id } = req.params;
  const { rejected_by, rejection_reason } = req.body;

  // Add rejection metadata to the photo
  db.get('SELECT * FROM account_visit_photos WHERE id = ?', [id], (err, photo) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    let metadata = {};
    try {
      metadata = photo.photo_metadata ? JSON.parse(photo.photo_metadata) : {};
    } catch (e) {
      console.error(`Failed to parse photo metadata for photo ID ${id}:`, e.message);
      console.error(`Corrupted metadata value:`, photo.photo_metadata);
      metadata = {}; // Reset to empty object, but operation continues
    }

    metadata.approval_status = 'rejected';
    metadata.rejected_by = rejected_by;
    metadata.rejected_at = new Date().toISOString();
    metadata.rejection_reason = rejection_reason;

    const query = `
      UPDATE account_visit_photos 
      SET photo_metadata = ?
      WHERE id = ?
    `;

    db.run(query, [JSON.stringify(metadata), id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: 'Photo rejected',
        photo_id: id,
        rejected_at: metadata.rejected_at,
        reason: rejection_reason
      });
    });
  });
};

/**
 * Delete photo
 */
const deletePhoto = (req, res) => {
  const { id } = req.params;

  // First get the photo to check if file deletion is needed
  db.get('SELECT * FROM account_visit_photos WHERE id = ?', [id], (err, photo) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete from database
    db.run('DELETE FROM account_visit_photos WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // In production, also delete the file from storage (S3, etc.)
      // For now, just return success
      res.json({
        message: 'Photo deleted successfully',
        photo_id: id
      });
    });
  });
};

/**
 * Get photo gallery (all photos for a sales rep)
 */
const getPhotoGallery = (req, res) => {
  const { sales_rep_id } = req.params;
  const { photo_type, start_date, end_date, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT avp.*, av.visit_date, av.account_id, u.name as account_name
    FROM account_visit_photos avp
    JOIN account_visits av ON avp.visit_id = av.id
    JOIN users u ON av.account_id = u.id
    WHERE av.sales_rep_id = ?
  `;
  const params = [sales_rep_id];

  if (photo_type) {
    query += ` AND avp.photo_type = ?`;
    params.push(photo_type);
  }

  if (start_date) {
    query += ` AND av.visit_date >= ?`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND av.visit_date <= ?`;
    params.push(end_date);
  }

  query += ` ORDER BY avp.taken_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      sales_rep_id,
      photos: rows,
      count: rows.length,
      filters: { photo_type, start_date, end_date },
      offset,
      limit
    });
  });
};

/**
 * Batch upload photos
 */
const batchUploadPhotos = (req, res) => {
  const { photos } = req.body; // Array of photo objects

  if (!Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: 'Photos array is required' });
  }

  const insertQuery = `
    INSERT INTO account_visit_photos (
      visit_id, photo_url, photo_type, file_size, file_name, photo_metadata
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  let completed = 0;
  let errors = [];
  const results = [];

  const stmt = db.prepare(insertQuery);

  photos.forEach((photo, index) => {
    stmt.run(
      [
        photo.visit_id,
        photo.photo_url,
        photo.photo_type || 'other',
        photo.file_size,
        photo.file_name,
        photo.photo_metadata
      ],
      function(err) {
        completed++;
        
        if (err) {
          errors.push({ index, error: err.message });
        } else {
          results.push({ index, photo_id: this.lastID });
        }

        // When all are processed
        if (completed === photos.length) {
          stmt.finalize();
          
          if (errors.length === photos.length) {
            return res.status(500).json({
              error: 'All uploads failed',
              errors
            });
          }

          res.status(201).json({
            message: 'Batch upload completed',
            successful: results.length,
            failed: errors.length,
            results,
            errors: errors.length > 0 ? errors : undefined
          });
        }
      }
    );
  });
};

/**
 * Get photo statistics
 */
const getPhotoStatistics = (req, res) => {
  const { sales_rep_id, account_id } = req.query;
  const { start_date, end_date } = req.query;

  let query = `
    SELECT 
      COUNT(*) as total_photos,
      COUNT(DISTINCT av.visit_id) as visits_with_photos,
      COUNT(DISTINCT av.account_id) as accounts_photographed,
      SUM(avp.file_size) as total_file_size,
      avp.photo_type,
      COUNT(avp.id) as count_by_type
    FROM account_visit_photos avp
    JOIN account_visits av ON avp.visit_id = av.id
    WHERE 1=1
  `;
  const params = [];

  if (sales_rep_id) {
    query += ` AND av.sales_rep_id = ?`;
    params.push(sales_rep_id);
  }

  if (account_id) {
    query += ` AND av.account_id = ?`;
    params.push(account_id);
  }

  if (start_date) {
    query += ` AND av.visit_date >= ?`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND av.visit_date <= ?`;
    params.push(end_date);
  }

  query += ` GROUP BY avp.photo_type`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get overall totals
    const totalQuery = `
      SELECT 
        COUNT(*) as total_photos,
        COUNT(DISTINCT av.visit_id) as visits_with_photos,
        COUNT(DISTINCT av.account_id) as accounts_photographed,
        SUM(avp.file_size) as total_file_size
      FROM account_visit_photos avp
      JOIN account_visits av ON avp.visit_id = av.id
      WHERE 1=1
      ${sales_rep_id ? ' AND av.sales_rep_id = ?' : ''}
      ${account_id ? ' AND av.account_id = ?' : ''}
      ${start_date ? ' AND av.visit_date >= ?' : ''}
      ${end_date ? ' AND av.visit_date <= ?' : ''}
    `;

    db.get(totalQuery, params, (err, totals) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        totals,
        by_type: rows,
        filters: { sales_rep_id, account_id, start_date, end_date }
      });
    });
  });
};

module.exports = {
  uploadPhoto,
  getVisitPhotos,
  getAccountPhotos,
  approvePhoto,
  rejectPhoto,
  deletePhoto,
  getPhotoGallery,
  batchUploadPhotos,
  getPhotoStatistics
};

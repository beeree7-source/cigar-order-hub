/**
 * Base Model Class
 * Provides common database operations for all models
 */

const db = require('../database');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = db;
  }

  /**
   * Find a record by ID
   * @param {number} id - Record ID
   * @returns {Promise<Object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  /**
   * Find a record by field
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @returns {Promise<Object|null>}
   */
  findByField(field, value) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM ${this.tableName} WHERE ${field} = ?`,
        [value],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  /**
   * Find all records matching a condition
   * @param {Object} where - Where conditions {field: value}
   * @param {Object} options - Query options {limit, offset, orderBy}
   * @returns {Promise<Array>}
   */
  findAll(where = {}, options = {}) {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];

      // Build WHERE clause
      if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where).map(key => {
          params.push(where[key]);
          return `${key} = ?`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add ORDER BY
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }

      // Add LIMIT
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }

      // Add OFFSET
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<number>} - Inserted ID
   */
  create(data) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map(() => '?').join(', ');

      const query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
      `;

      this.db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  /**
   * Update a record by ID
   * @param {number} id - Record ID
   * @param {Object} data - Data to update
   * @returns {Promise<number>} - Number of affected rows
   */
  update(id, data) {
    return new Promise((resolve, reject) => {
      // Add updated_at timestamp
      data.updated_at = new Date().toISOString();
      
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map(field => `${field} = ?`).join(', ');

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}
        WHERE id = ?
      `;

      this.db.run(query, [...values, id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  /**
   * Delete a record by ID
   * @param {number} id - Record ID
   * @returns {Promise<number>} - Number of affected rows
   */
  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  /**
   * Count records matching a condition
   * @param {Object} where - Where conditions
   * @returns {Promise<number>}
   */
  count(where = {}) {
    return new Promise((resolve, reject) => {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params = [];

      if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where).map(key => {
          params.push(where[key]);
          return `${key} = ?`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  /**
   * Execute a raw SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>}
   */
  query(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Execute a raw SQL query that returns a single row
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>}
   */
  queryOne(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  /**
   * Begin a transaction
   * @returns {Promise<void>}
   */
  beginTransaction() {
    return new Promise((resolve, reject) => {
      this.db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Commit a transaction
   * @returns {Promise<void>}
   */
  commit() {
    return new Promise((resolve, reject) => {
      this.db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Rollback a transaction
   * @returns {Promise<void>}
   */
  rollback() {
    return new Promise((resolve, reject) => {
      this.db.run('ROLLBACK', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = BaseModel;

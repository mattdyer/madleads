import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const EDITABLE_FIELDS = ['name', 'email', 'phone', 'company', 'source', 'status', 'value', 'notes'];

function validate(body, { partial = false } = {}) {
  const errors = [];
  const name = body.name;

  if (!partial || name !== undefined) {
    if (!name || String(name).trim() === '') {
      errors.push('name is required');
    }
  }

  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
      errors.push('email is not a valid address');
    }
  }

  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  }

  if (body.value !== undefined && body.value !== null && body.value !== '') {
    if (Number.isNaN(Number(body.value)) || Number(body.value) < 0) {
      errors.push('value must be a non-negative number');
    }
  }

  return errors;
}

function pickFields(body) {
  const out = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

router.get('/', async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const where = [];
    const params = [];

    if (status && STATUSES.includes(status)) {
      where.push('status = ?');
      params.push(status);
    }

    if (search) {
      where.push('(name LIKE ? OR email LIKE ? OR company LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const sql = `SELECT * FROM leads ${
      where.length ? `WHERE ${where.join(' AND ')}` : ''
    } ORDER BY created_at DESC`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(value), 0) AS total_value
       FROM leads GROUP BY status`
    );
    const [totals] = await pool.query(
      'SELECT COUNT(*) AS total, COALESCE(SUM(value), 0) AS pipeline_value FROM leads'
    );
    res.json({ byStatus: rows, ...totals[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leads ORDER BY id');
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${stamp}.json"`);
    res.send(
      JSON.stringify({ exported_at: new Date().toISOString(), count: rows.length, leads: rows }, null, 2)
    );
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : req.body?.leads;
    if (!Array.isArray(payload)) {
      return res
        .status(400)
        .json({ error: 'Expected a JSON array of leads, or an object with a "leads" array' });
    }

    const conn = await pool.getConnection();
    const inserted = [];
    const errors = [];

    try {
      await conn.beginTransaction();
      for (const [index, item] of payload.entries()) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          errors.push({ index, error: 'entry is not a lead object' });
          continue;
        }

        const fieldErrors = validate(item);
        if (fieldErrors.length) {
          errors.push({ index, error: fieldErrors.join('; ') });
          continue;
        }

        const data = pickFields(item);
        const fields = Object.keys(data);
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map((f) => data[f]);

        const [result] = await conn.query(
          `INSERT INTO leads (${fields.join(', ')}) VALUES (${placeholders})`,
          values
        );
        inserted.push(result.insertId);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.status(201).json({ inserted: inserted.length, skipped: errors.length, errors });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const data = pickFields(req.body);
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map((f) => data[f]);

    const [result] = await pool.query(
      `INSERT INTO leads (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const errors = validate(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const data = pickFields(req.body);
    const fields = Object.keys(data);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const assignments = fields.map((f) => `${f} = ?`).join(', ');
    const values = fields.map((f) => data[f]);
    values.push(req.params.id);

    const [result] = await pool.query(
      `UPDATE leads SET ${assignments} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Lead not found' });

    const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Lead not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;

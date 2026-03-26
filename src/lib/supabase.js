// FumuGold — Supabase client wrapper
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL  || '';
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const client = URL && KEY ? createClient(URL, KEY) : null;

// Chainable query builder simplificado
class Query {
  constructor(table) {
    this._table  = table;
    this._select = '*';
    this._filters = [];
    this._order  = null;
    this._limit  = null;
  }
  select(cols)       { this._select = cols; return this; }
  eq(col, val)       { this._filters.push({ type: 'eq', col, val }); return this; }
  order(col, opts)   { this._order = { col, asc: opts?.ascending !== false }; return this; }
  limit(n)           { this._limit = n; return this; }
  async get() {
    if (!client) return [];
    let q = client.from(this._table).select(this._select);
    for (const f of this._filters) {
      if (f.type === 'eq') q = q.eq(f.col, f.val);
    }
    if (this._order) q = q.order(this._order.col, { ascending: this._order.asc });
    if (this._limit) q = q.limit(this._limit);
    const { data, error } = await q;
    if (error) { console.warn('[SUPA]', error.message); return []; }
    return data || [];
  }
}

export const supa = {
  from: (table) => new Query(table),
  client,
};

export default supa;

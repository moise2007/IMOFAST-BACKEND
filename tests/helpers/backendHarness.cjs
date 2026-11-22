const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const SRC = path.resolve(__dirname, '../../src');
function loadSource(relative, overrides = {}) {
  const cache = new Map();
  function load(file) {
    if (Object.hasOwn(overrides, file)) return overrides[file];
    if (!file.startsWith(SRC + path.sep)) return require(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const native = createRequire(file);
    const req = name => load(native.resolve(name));
    req.resolve = native.resolve;
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
      module: mod, exports: mod.exports, require: req, __dirname: path.dirname(file), __filename: file,
      Buffer, URL, Date, Error, Map, Set, Promise, Intl, console, process, setTimeout, clearTimeout, setInterval, clearInterval,
    }, { filename: file });
    return mod.exports;
  }
  return load(path.join(SRC, relative));
}
class Timestamp {
  constructor(seconds, nanoseconds = 0) { this.seconds = seconds; this.nanoseconds = nanoseconds; this._seconds = seconds; }
  toMillis() { return this.seconds * 1000 + this.nanoseconds / 1e6; }
  toDate() { return new Date(this.toMillis()); }
  static now() { return Timestamp.fromDate(new Date()); }
  static fromDate(date) { return Timestamp.fromMillis(+date); }
  static fromMillis(ms) { return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6); }
}
const copy = value => value instanceof Date ? new Date(value) : value instanceof Timestamp ? new Timestamp(value.seconds, value.nanoseconds) : Array.isArray(value) ? Array.from(value, copy) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, copy(v)])) : value;
const at = (obj, key) => key.split('.').reduce((o, part) => o?.[part], obj);
const comparable = v => v?.toMillis?.() ?? (v instanceof Date ? +v : v);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function database(seed = {}) {
  const records = new Map(Object.entries(seed).map(([p, v]) => [p, copy(v)]));
  const reads = []; let sequence = 0, queue = Promise.resolve();
  const fieldValue = {
    increment: n => ({ __op: 'increment', n }), arrayUnion: (...values) => ({ __op: 'arrayUnion', values }),
    serverTimestamp: () => Timestamp.now(), delete: () => ({ __op: 'delete' }),
  };
  function apply(target, patch, merge = false) {
    const result = merge ? copy(target || {}) : {};
    for (const [field, value] of Object.entries(patch)) {
      const keys = field.split('.'); let obj = result;
      for (const k of keys.slice(0, -1)) obj = obj[k] ||= {};
      const k = keys.at(-1);
      if (value?.__op === 'increment') obj[k] = (obj[k] || 0) + value.n;
      else if (value?.__op === 'arrayUnion') obj[k] = [...(obj[k] || []), ...value.values.filter(v => !(obj[k] || []).some(x => equal(x, v)))];
      else if (value?.__op === 'delete') delete obj[k];
      else if (merge && value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Timestamp)) obj[k] = apply(obj[k], value, true);
      else obj[k] = copy(value);
    }
    return result;
  }
  function reference(p) {
    return { path: p, id: p.split('/').at(-1), collection: name => query(`${p}/${name}`),
      get: async () => snapshot(p), set: async (data, opts) => records.set(p, apply(records.get(p), data, !!opts?.merge)),
      update: async data => { if (!records.has(p)) throw new Error('missing document ' + p); records.set(p, apply(records.get(p), data, true)); },
      delete: async () => records.delete(p),
    };
  }
  function snapshot(p, select) {
    const value = copy(records.get(p));
    return { id: p.split('/').at(-1), ref: reference(p), exists: records.has(p), data: () => select && value ? apply({}, Object.fromEntries(select.filter(f => at(value, f) !== undefined).map(f => [f, at(value, f)]))) : copy(value) };
  }
  function match(data, filter, id) {
    if (filter.and) return filter.and.every(f => match(data, f, id));
    if (filter.or) return filter.or.some(f => match(data, f, id));
    const [field, op, value] = filter, actual = field === '__name__' ? id : at(data, field);
    if (actual === undefined) return false;
    switch (op) {
      case '==': return equal(actual, value);
      case 'in': return value.some(v => equal(v, actual));
      case 'array-contains': return actual?.includes(value);
      case 'array-contains-any': return value.some(v => actual?.includes(v));
      case '>=': return comparable(actual) >= comparable(value);
      case '>': return comparable(actual) > comparable(value);
      case '<=': return comparable(actual) <= comparable(value);
      case '<': return comparable(actual) < comparable(value);
      default: throw new Error('unsupported query ' + op);
    }
  }
  function query(collection, state = { filters: [], order: [] }) {
    const clone = patch => query(collection, { ...state, ...patch });
    const q = { _query: true, collection,
      doc: id => reference(`${collection}/${id || `doc${++sequence}`}`),
      where: (...args) => clone({ filters: [...state.filters, args.length === 1 ? args[0] : args] }),
      orderBy: (key, direction = 'asc') => clone({ order: [...state.order, [key, direction]] }),
      limit: limit => clone({ limit }), offset: offset => clone({ offset }),
      select: (...select) => clone({ select }), startAfter: cursor => clone({ cursor }),
      count: () => ({ get: async () => ({ data: () => ({ count: evaluate().length }) }) }),
      add: async data => { const ref = q.doc(); await ref.set(data); return ref; },
      get: async () => {
        reads.push({ collection, filters: state.filters, limit: state.limit });
        const docs = evaluate(); return { docs, size: docs.length, empty: !docs.length };
      },
    };
    function evaluate() {
      const paths = [...records.keys()].filter(p => p.startsWith(collection + '/') && p.split('/').length === collection.split('/').length + 1);
      let docs = paths.map(p => snapshot(p)).filter(d => state.filters.every(f => match(d.data(), f, d.id)));
      docs = docs.filter(d => state.order.every(([key]) => key === '__name__' || at(d.data(), key) !== undefined));
      docs.sort((a, b) => {
        for (const [key, direction] of state.order) {
          const av = key === '__name__' ? a.id : comparable(at(a.data(), key)), bv = key === '__name__' ? b.id : comparable(at(b.data(), key));
          if (av !== bv) return (av > bv ? 1 : -1) * (direction === 'desc' ? -1 : 1);
        }
        return a.id.localeCompare(b.id);
      });
      if (state.cursor) docs = docs.slice(docs.findIndex(d => d.id === state.cursor.id) + 1);
      docs = docs.slice(state.offset || 0, state.limit == null ? undefined : (state.offset || 0) + state.limit);
      return docs.map(d => snapshot(d.ref.path, state.select));
    }
    return q;
  }
  function writer() {
    const actions = [];
    return {
      actions, set: (ref, data, opts) => actions.push(() => ref.set(data, opts)),
      update: (ref, data) => actions.push(() => ref.update(data)),
      delete: ref => actions.push(() => ref.delete()),
      create: (ref, data) => actions.push(() => { if (records.has(ref.path)) throw new Error('duplicate create'); return ref.set(data); }),
      commit: async () => { for (const act of actions) await act(); },
    };
  }
  const db = { collection: name => query(name), batch: writer,
    runTransaction: callback => {
      const operation = queue.then(async () => {
        const w = writer();
        const tx = { ...w, get: async target => { if (w.actions.length) throw new Error('read after write'); return target.get(); } };
        const result = await callback(tx); await w.commit(); return result;
      });
      queue = operation.catch(() => {}); return operation;
    },
  };
  const firestore = () => db;
  Object.assign(firestore, { Timestamp, FieldValue: fieldValue, FieldPath: { documentId: () => '__name__' }, Filter: {
    and: (...filters) => ({ and: filters }), or: (...filters) => ({ or: filters }), where: (...args) => args,
  } });
  const firebase = { db, admin: { firestore } };
  return { db, firebase, records, reads, load: (file, overrides = {}) => loadSource(file, { [path.join(SRC, 'config/firebase.js')]: firebase, ...Object.fromEntries(Object.entries(overrides).map(([key, value]) => [path.join(SRC, key), value])) }) };
}
module.exports = { database, loadSource, Timestamp, SRC };

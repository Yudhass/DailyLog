import { Sequelize, DataTypes } from 'sequelize';
import mysql from 'mysql2/promise';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const name = process.env.DB_NAME || 'db_dailylog';
  const auth = password
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
    : encodeURIComponent(user);
  return `mysql://${auth}@${host}:${port}/${name}`;
}

function parseDbName(url) {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.replace(/^\//, '').split('/')[0] || '');
  } catch {
    const m = String(url).match(/\/([^/?]+)(\?|$)/);
    return m?.[1] ?? '';
  }
}

function baseConfigFromUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname || 'localhost',
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username) || 'root',
    password: decodeURIComponent(u.password) || '',
  };
}

function buildSequelize(url) {
  return new Sequelize(url, { logging: false });
}

export let sequelize = buildSequelize(getDatabaseUrl());

export const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
export const VALID_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
export const VALID_RECURRENCE = ['NONE', 'DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY', 'HOURLY', 'YEARLY'];
export const VALID_SOURCES = ['WEB', 'PWA', 'TELEGRAM', 'WHATSAPP', 'GITHUB', 'VOICE', 'MCP'];
export const VALID_SUMMARY_STYLES = ['formal', 'refleksi', 'ringkas'];

function defineModels(target) {
  const User = target.define(
    'User',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
    },
    { tableName: 'users' }
  );

  const Task = target.define(
    'Task',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      logDate: { type: DataTypes.DATE, allowNull: false },
      startTime: { type: DataTypes.STRING(5), allowNull: true },
      endTime: { type: DataTypes.STRING(5), allowNull: true },
      status: { type: DataTypes.ENUM(...VALID_STATUSES), allowNull: false, defaultValue: 'TODO' },
      priority: { type: DataTypes.ENUM(...VALID_PRIORITIES), allowNull: false, defaultValue: 'MEDIUM' },
      tags: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
      recurrence: { type: DataTypes.ENUM(...VALID_RECURRENCE), allowNull: false, defaultValue: 'NONE' },
      recurrenceUntil: { type: DataTypes.DATEONLY, allowNull: true },
      // Pola pengulangan lanjutan (null = default dari tanggal mulai):
      // - recurrenceInterval: tiap N jam/hari/minggu (HOURLY/DAILY/WEEKLY)
      // - recurrenceDays: hari dalam minggu 0=Min..6=Sab, CSV (WEEKLY)
      // - recurrenceMonthDay: tanggal 1-31 (MONTHLY/YEARLY)
      // - recurrenceMonth: bulan 1-12 (YEARLY)
      recurrenceInterval: { type: DataTypes.INTEGER, allowNull: true },
      recurrenceDays: { type: DataTypes.STRING(16), allowNull: true },
      recurrenceMonthDay: { type: DataTypes.TINYINT, allowNull: true },
      recurrenceMonth: { type: DataTypes.TINYINT, allowNull: true },
      estimatedMinutes: { type: DataTypes.INTEGER, allowNull: true },
      source: { type: DataTypes.ENUM(...VALID_SOURCES), allowNull: false, defaultValue: 'WEB' },
    },
    { tableName: 'tasks', paranoid: true }
  );

  const ShareLink = target.define(
    'ShareLink',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      scopeType: { type: DataTypes.ENUM('DAY', 'RANGE'), allowNull: false, defaultValue: 'DAY' },
      dateFrom: { type: DataTypes.STRING(10), allowNull: false },
      dateTo: { type: DataTypes.STRING(10), allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'share_links' }
  );

  Task.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
  User.hasMany(Task, { foreignKey: 'userId' });
  ShareLink.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
  User.hasMany(ShareLink, { foreignKey: 'userId' });

  // F2 ringkasan AI (dengan cache per rentang+gaya+hash data)
  const Summary = target.define(
    'Summary',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      rangeStart: { type: DataTypes.STRING(10), allowNull: false },
      rangeEnd: { type: DataTypes.STRING(10), allowNull: false },
      style: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'ringkas' },
      content: { type: DataTypes.TEXT, allowNull: false },
      dataHash: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
    },
    { tableName: 'summaries' }
  );

  // F3 tautan kanal chat (satu external_id hanya untuk satu user)
  const ChatLink = target.define(
    'ChatLink',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      provider: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'TELEGRAM' },
      externalId: { type: DataTypes.STRING(64), allowNull: false },
      label: { type: DataTypes.STRING(128), allowNull: true },
    },
    { tableName: 'chat_links', indexes: [{ unique: true, fields: ['provider', 'externalId'] }] }
  );

  const LinkCode = target.define(
    'LinkCode',
    {
      code: { type: DataTypes.STRING(16), primaryKey: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      usedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'link_codes' }
  );

  // Sticky Notes Board (update-3): kategori dinamis + catatan bebas tanggal
  const NoteCategory = target.define(
    'NoteCategory',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      orderIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'note_categories' }
  );

  const StickyNote = target.define(
    'StickyNote',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      title: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
      content: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      color: { type: DataTypes.STRING(16), allowNull: false, defaultValue: '#fef9c3' },
      orderIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'sticky_notes' }
  );

  // F4 langganan Web Push (dedup via hash: index utf8 MySQL tua maks 767 byte)
  const PushSubscription = target.define(
    'PushSubscription',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      endpoint: { type: DataTypes.TEXT, allowNull: false },
      endpointHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
      p256dh: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
      auth: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
      kinds: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'reminder,summary' },
    },
    { tableName: 'push_subscriptions' }
  );

  Summary.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
  User.hasMany(Summary, { foreignKey: 'userId' });  ChatLink.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
  User.hasMany(ChatLink, { foreignKey: 'userId' });
  LinkCode.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
  User.hasMany(LinkCode, { foreignKey: 'userId' });
  PushSubscription.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
  User.hasMany(PushSubscription, { foreignKey: 'userId' });

  NoteCategory.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
  User.hasMany(NoteCategory, { foreignKey: 'userId' });
  StickyNote.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
  User.hasMany(StickyNote, { foreignKey: 'userId' });
  StickyNote.belongsTo(NoteCategory, { foreignKey: { name: 'categoryId', allowNull: true }, onDelete: 'SET NULL' });
  NoteCategory.hasMany(StickyNote, { foreignKey: 'categoryId' });

  return { User, Task, ShareLink, Summary, ChatLink, LinkCode, PushSubscription, NoteCategory, StickyNote };
}

let models = defineModels(sequelize);
export let User = models.User;
export let Task = models.Task;
export let ShareLink = models.ShareLink;
export let Summary = models.Summary;
export let ChatLink = models.ChatLink;
export let LinkCode = models.LinkCode;
export let PushSubscription = models.PushSubscription;
export let NoteCategory = models.NoteCategory;
export let StickyNote = models.StickyNote;

function rebindModels() {
  User = models.User;
  Task = models.Task;
  ShareLink = models.ShareLink;
  Summary = models.Summary;
  ChatLink = models.ChatLink;
  LinkCode = models.LinkCode;
  PushSubscription = models.PushSubscription;
  NoteCategory = models.NoteCategory;
  StickyNote = models.StickyNote;
}

// ---------- helper durasi & tag ----------
export function minutesBetween(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = String(startTime).split(':').map(Number);
  const [eh, em] = String(endTime).split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

export function taskMinutes(t) {
  const real = minutesBetween(t.startTime, t.endTime);
  if (real > 0) return real;
  return Number(t.estimatedMinutes) > 0 ? Number(t.estimatedMinutes) : 0;
}

export function parseTags(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim().replace(/^#+/, '').slice(0, 32))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 10);
}

export function formatTags(arr) {
  return parseTags(Array.isArray(arr) ? arr.join(',') : arr).join(',');
}

// ---------- migrasi aman untuk MySQL tua (tanpa ALTER ... IF NOT EXISTS) ----------
async function columnExists(table, column) {
  const dbName = parseDbName(getDatabaseUrl());
  const [rows] = await sequelize.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    { replacements: [dbName, table, column] }
  );
  return rows.length > 0;
}

async function migrate() {
  // Kolom baru tabel tasks (kompatibel MySQL 5.1, charset utf8)
  const additions = [
    ['priority', "ENUM('HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'MEDIUM'"],
    ['tags', 'VARCHAR(255) NOT NULL DEFAULT \'\''],
    ['recurrence', "ENUM('NONE','DAILY','WEEKDAYS','WEEKLY','MONTHLY') NOT NULL DEFAULT 'NONE'"],
    ['recurrenceUntil', 'DATE NULL'],
    ['recurrenceInterval', 'INT NULL'],
    ['recurrenceDays', 'VARCHAR(16) NULL'],
    ['recurrenceMonthDay', 'TINYINT NULL'],
    ['recurrenceMonth', 'TINYINT NULL'],
    ['estimatedMinutes', 'INT NULL'],
    ['source', "ENUM('WEB','PWA','TELEGRAM','WHATSAPP','GITHUB','VOICE','MCP') NOT NULL DEFAULT 'WEB'"],
    ['deletedAt', 'DATETIME NULL'],
  ];
  for (const [col, ddl] of additions) {
    if (!(await columnExists('tasks', col))) {
      await sequelize.query(`ALTER TABLE \`tasks\` ADD COLUMN \`${col}\` ${ddl}`);
      console.log(`Migrasi: kolom tasks.${col} ditambahkan.`);
    }
  }
  // Perluas ENUM recurrence untuk pola baru (HOURLY, YEARLY).
  // Nilai baru ditambahkan di akhir agar indeks ENUM lama tidak bergeser.
  try {
    const [cols] = await sequelize.query(
      'SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
      { replacements: [parseDbName(getDatabaseUrl()), 'tasks', 'recurrence'] }
    );
    const colType = String(cols?.[0]?.COLUMN_TYPE || cols?.[0]?.column_type || '');
    if (colType && !colType.includes('HOURLY')) {
      await sequelize.query(
        "ALTER TABLE `tasks` MODIFY COLUMN `recurrence` ENUM('NONE','DAILY','WEEKDAYS','WEEKLY','MONTHLY','HOURLY','YEARLY') NOT NULL DEFAULT 'NONE'"
      );
      console.log('Migrasi: ENUM tasks.recurrence diperluas (HOURLY, YEARLY).');
    }
  } catch (err) {
    console.error('Migrasi ENUM recurrence dilewati:', err.message);
  }
}

function isUnknownDatabaseError(err) {
  if (!err) return false;
  const code = err.original?.code || err.code || '';
  const errno = err.original?.errno ?? err.errno;
  const msg = `${err.message || ''} ${err.original?.sqlMessage || ''}`.toLowerCase();
  return code === 'ER_BAD_DB_ERROR' || errno === 1049 || msg.includes('unknown database');
}

async function tanya(pertanyaan) {
  if (!process.stdin.isTTY) return '';
  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question(pertanyaan)).trim();
  } finally {
    rl.close();
  }
}

async function createDatabase(dbName, url) {
  const cfg = baseConfigFromUrl(url);
  const conn = await mysql.createConnection({ ...cfg });
  try {
    await conn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${String(dbName).replace(/`/g, '')}\` CHARACTER SET utf8 COLLATE utf8_unicode_ci`
    );
  } finally {
    await conn.end();
  }
}

function gantiNamaDbDiUrl(url, newName) {
  const u = new URL(url);
  u.pathname = `/${encodeURIComponent(newName)}`;
  return u.toString();
}

async function handleMissingDatabase(dbName, url) {
  console.error(`\nDatabase '${dbName}' tidak ditemukan (Unknown database).`);

  // 1) Tanya dulu: mau dibuatkan otomatis atau tidak?
  let mauBuat = '';
  if (process.stdin.isTTY) {
    mauBuat = (await tanya(`Mau dibuatkan database '${dbName}' secara otomatis? (Y/n): `)).toLowerCase();
  }
  const setuju = mauBuat === '' || mauBuat === 'y' || mauBuat === 'ya' || mauBuat === 'yes';
  if (!process.stdin.isTTY) {
    console.log(`Mode non-interaktif: membuat database '${dbName}' otomatis...`);
  } else if (!setuju) {
    console.log('Batal membuat database otomatis.');
  }

  // 2) Tanya konfirmasi nama: sudah benar atau mau diubah?
  let finalName = dbName;
  if (process.stdin.isTTY) {
    const jawabNama = await tanya(
      `Nama database saat ini '${dbName}'. Sudah benar? (Enter = sudah benar / ketik nama baru): `
    );
    if (jawabNama) {
      if (!/^[A-Za-z0-9_$]+$/.test(jawabNama)) {
        throw new Error(`Nama database '${jawabNama}' tidak valid. Gunakan huruf/angka/underscore saja.`);
      }
      finalName = jawabNama;
    }
  }

  if (!setuju && finalName === dbName) {
    throw new Error(
      `Database '${dbName}' belum ada. Buat manual: CREATE DATABASE ${dbName} CHARACTER SET utf8 COLLATE utf8_unicode_ci; lalu jalankan ulang.`
    );
  }

  const finalUrl = finalName === dbName ? url : gantiNamaDbDiUrl(url, finalName);
  await createDatabase(finalName, finalUrl);
  console.log(`Database '${finalName}' siap.`);

  if (finalName !== dbName) {
    try { await sequelize.close(); } catch { /* abaikan */ }
    sequelize = buildSequelize(finalUrl);
    models = defineModels(sequelize);
    rebindModels();
    console.log(`Catatan: perbarui .env -> DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME agar permanen.`);
  }
  return finalName !== dbName;
}

export async function syncDb() {
  const url = getDatabaseUrl();
  const dbName = parseDbName(url);
  try {
    await sequelize.sync();
    await migrate();
    return;
  } catch (err) {
    if (!isUnknownDatabaseError(err)) throw err;
    await handleMissingDatabase(dbName, url);
    await sequelize.sync();
    await migrate();
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = exports.trafficRelations = exports.traffic = exports.clientsRelations = exports.clients = exports.inboundsRelations = exports.inbounds = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.inbounds = (0, sqlite_core_1.sqliteTable)('inbounds', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    tag: (0, sqlite_core_1.text)('tag').unique().notNull(),
    protocol: (0, sqlite_core_1.text)('protocol').notNull(),
    port: (0, sqlite_core_1.integer)('port').notNull(),
    settings: (0, sqlite_core_1.text)('settings').notNull(), // JSON
    sniffing: (0, sqlite_core_1.text)('sniffing').notNull(), // JSON
    stream: (0, sqlite_core_1.text)('stream').notNull(), // JSON
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
exports.inboundsRelations = (0, drizzle_orm_1.relations)(exports.inbounds, ({ many }) => ({
    clients: many(exports.clients),
}));
exports.clients = (0, sqlite_core_1.sqliteTable)('clients', {
    id: (0, sqlite_core_1.text)('id').primaryKey(), // UUID
    inboundId: (0, sqlite_core_1.integer)('inbound_id').references(() => exports.inbounds.id).notNull(),
    email: (0, sqlite_core_1.text)('email').unique().notNull(),
    uuid: (0, sqlite_core_1.text)('uuid').notNull(),
    flow: (0, sqlite_core_1.text)('flow'), // xtls-rprx-vision
    limitIp: (0, sqlite_core_1.integer)('limit_ip').default(0),
    totalGb: (0, sqlite_core_1.real)('total_gb').default(0),
    expiry: (0, sqlite_core_1.integer)('expiry', { mode: 'timestamp' }),
    enabled: (0, sqlite_core_1.integer)('enabled', { mode: 'boolean' }).default(true),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
exports.clientsRelations = (0, drizzle_orm_1.relations)(exports.clients, ({ one }) => ({
    inbound: one(exports.inbounds, {
        fields: [exports.clients.inboundId],
        references: [exports.inbounds.id],
    }),
    traffic: one(exports.traffic, {
        fields: [exports.clients.id],
        references: [exports.traffic.clientId],
    }),
}));
exports.traffic = (0, sqlite_core_1.sqliteTable)('traffic', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    clientId: (0, sqlite_core_1.text)('client_id').references(() => exports.clients.id).unique().notNull(),
    up: (0, sqlite_core_1.integer)('up', { mode: 'number' }).default(0),
    down: (0, sqlite_core_1.integer)('down', { mode: 'number' }).default(0),
    total: (0, sqlite_core_1.integer)('total', { mode: 'number' }).default(0),
});
exports.trafficRelations = (0, drizzle_orm_1.relations)(exports.traffic, ({ one }) => ({
    client: one(exports.clients, {
        fields: [exports.traffic.clientId],
        references: [exports.clients.id],
    }),
}));
exports.settings = (0, sqlite_core_1.sqliteTable)('settings', {
    key: (0, sqlite_core_1.text)('key').primaryKey(),
    value: (0, sqlite_core_1.text)('value').notNull(),
});

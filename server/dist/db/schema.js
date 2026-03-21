"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.settings = exports.trafficRelations = exports.traffic = exports.clientsRelations = exports.clients = exports.inboundsRelations = exports.inbounds = exports.nodesRelations = exports.nodes = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.nodes = (0, sqlite_core_1.sqliteTable)('nodes', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    address: (0, sqlite_core_1.text)('address').notNull(), // IP or Domain
    apiKey: (0, sqlite_core_1.text)('api_key').notNull(),
    status: (0, sqlite_core_1.text)('status').$type().default('offline'),
    lastSeen: (0, sqlite_core_1.integer)('last_seen', { mode: 'timestamp' }),
    isMaster: (0, sqlite_core_1.integer)('is_master', { mode: 'boolean' }).default(false),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
exports.nodesRelations = (0, drizzle_orm_1.relations)(exports.nodes, ({ many }) => ({
    inbounds: many(exports.inbounds),
}));
exports.inbounds = (0, sqlite_core_1.sqliteTable)('inbounds', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    nodeId: (0, sqlite_core_1.integer)('node_id').references(() => exports.nodes.id).default(1),
    tag: (0, sqlite_core_1.text)('tag').unique().notNull(),
    protocol: (0, sqlite_core_1.text)('protocol').notNull(),
    port: (0, sqlite_core_1.integer)('port').notNull(),
    settings: (0, sqlite_core_1.text)('settings').notNull(), // JSON
    sniffing: (0, sqlite_core_1.text)('sniffing').notNull(), // JSON
    stream: (0, sqlite_core_1.text)('stream').notNull(), // JSON
    isGlobal: (0, sqlite_core_1.integer)('is_global', { mode: 'boolean' }).default(false),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
exports.inboundsRelations = (0, drizzle_orm_1.relations)(exports.inbounds, ({ one, many }) => ({
    node: one(exports.nodes, {
        fields: [exports.inbounds.nodeId],
        references: [exports.nodes.id],
    }),
    clients: many(exports.clients),
}));
exports.clients = (0, sqlite_core_1.sqliteTable)('clients', {
    id: (0, sqlite_core_1.text)('id').primaryKey(), // ID in our system
    inboundId: (0, sqlite_core_1.integer)('inbound_id').references(() => exports.inbounds.id).notNull(),
    subId: (0, sqlite_core_1.text)('sub_id').notNull(), // Subscription ID (UUID grouping configs)
    email: (0, sqlite_core_1.text)('email').unique().notNull(),
    uuid: (0, sqlite_core_1.text)('uuid').notNull(), // Xray UUID
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
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    username: (0, sqlite_core_1.text)('username').unique().notNull(),
    password: (0, sqlite_core_1.text)('password').notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

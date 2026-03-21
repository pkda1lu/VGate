import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const nodes = sqliteTable('nodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address').notNull(), // IP or Domain
  apiKey: text('api_key').notNull(),
  status: text('status').$type<'online' | 'offline'>().default('offline'),
  lastSeen: integer('last_seen', { mode: 'timestamp' }),
  isMaster: integer('is_master', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const nodesRelations = relations(nodes, ({ many }) => ({
  inbounds: many(inbounds),
}));

export const inbounds = sqliteTable('inbounds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nodeId: integer('node_id').references(() => nodes.id).default(1),
  tag: text('tag').unique().notNull(),
  protocol: text('protocol').notNull(),
  port: integer('port').notNull(),
  settings: text('settings').notNull(), // JSON
  sniffing: text('sniffing').notNull(), // JSON
  stream: text('stream').notNull(), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const inboundsRelations = relations(inbounds, ({ one, many }) => ({
  node: one(nodes, {
    fields: [inbounds.nodeId],
    references: [nodes.id],
  }),
  clients: many(clients),
}));

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(), // ID in our system
  inboundId: integer('inbound_id').references(() => inbounds.id).notNull(),
  subId: text('sub_id').notNull(), // Subscription ID (UUID grouping configs)
  email: text('email').unique().notNull(),
  uuid: text('uuid').notNull(), // Xray UUID
  flow: text('flow'), // xtls-rprx-vision
  limitIp: integer('limit_ip').default(0),
  totalGb: real('total_gb').default(0),
  expiry: integer('expiry', { mode: 'timestamp' }),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const clientsRelations = relations(clients, ({ one }) => ({
  inbound: one(inbounds, {
    fields: [clients.inboundId],
    references: [inbounds.id],
  }),
  traffic: one(traffic, {
    fields: [clients.id],
    references: [traffic.clientId],
  }),
}));


export const traffic = sqliteTable('traffic', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: text('client_id').references(() => clients.id).unique().notNull(),
  up: integer('up', { mode: 'number' }).default(0),
  down: integer('down', { mode: 'number' }).default(0),
  total: integer('total', { mode: 'number' }).default(0),
});

export const trafficRelations = relations(traffic, ({ one }) => ({
  client: one(clients, {
    fields: [traffic.clientId],
    references: [clients.id],
  }),
}));

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

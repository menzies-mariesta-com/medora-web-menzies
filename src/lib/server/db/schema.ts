import { sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const simpleCrud = pgTable('simple_crud', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),

  name: text('name').unique(),
  description: text('description'),

  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'string',
  })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});

export type SimpleCrud = InferSelectModel<typeof simpleCrud>;
export type SimpleCrudInsert = InferInsertModel<typeof simpleCrud>;
export type SimpleCrudUpdate = Partial<SimpleCrudInsert>;


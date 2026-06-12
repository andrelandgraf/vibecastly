import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const people = pgTable(
  'people',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    bucketKey: text('bucket_key').notNull(),
    contentType: text('content_type').notNull().default('image/jpeg'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('people_user_id_idx').on(table.userId)],
);

export const images = pgTable(
  'images',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull(),
    prompt: text('prompt').notNull(),
    bucketKey: text('bucket_key').notNull(),
    contentType: text('content_type').notNull().default('image/jpeg'),
    bytes: integer('bytes').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('images_user_id_idx').on(table.userId)],
);

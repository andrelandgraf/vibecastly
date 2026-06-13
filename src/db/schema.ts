import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const people = pgTable(
  'people',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text('organization_id').notNull(),
    createdBy: text('created_by').notNull(),
    createdByName: text('created_by_name').notNull().default(''),
    name: text('name').notNull(),
    bucketKey: text('bucket_key').notNull(),
    contentType: text('content_type').notNull().default('image/jpeg'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('people_org_idx').on(table.organizationId)],
);

// Per-user agent memory: a persistent, resource-scoped profile of how each
// creator likes their AI images. Kept in our own Postgres (not @mastra/memory)
// because that package + @mastra/pg add ~6MB to the function bundle and blow the
// Neon Functions deploy size cap. Same feature, far smaller footprint.
export const creatorProfiles = pgTable('creator_profiles', {
  userId: text('user_id').primaryKey(),
  profile: text('profile').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const images = pgTable(
  'images',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text('organization_id').notNull(),
    createdBy: text('created_by').notNull(),
    createdByName: text('created_by_name').notNull().default(''),
    prompt: text('prompt').notNull(),
    bucketKey: text('bucket_key').notNull(),
    contentType: text('content_type').notNull().default('image/jpeg'),
    bytes: integer('bytes').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('images_org_idx').on(table.organizationId)],
);

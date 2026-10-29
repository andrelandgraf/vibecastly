import { createRealtime, rawSql, type SealedLiveQuery } from '@neon/realtime/server';
import { requireEnv } from './env';

// The branch's NEON_REALTIME_SECRET, set per branch with
// `neon functions deploy --env`. Functions drop user-set NEON_* variables.
const realtime = createRealtime({ secret: requireEnv('REALTIME_SECRET'), db: 'neondb' });

// A sealed query is a bearer capability for exactly this SQL, so every query
// carries its own authorization: workspace queries require a live membership
// row, which also cuts a removed member's subscription off immediately.
const isMember = `exists (
  select 1 from neon_auth.member m
  where m."organizationId"::text = $1 and m."userId"::text = $2
)`;

export type LiveName = 'images' | 'people' | 'addons' | 'team-members' | 'team-invitations';

const workspaceQueries = {
  images: `select id, prompt from images
    where organization_id = $1 and ${isMember}
    order by created_at desc, id`,
  people: `select id, name from people
    where organization_id = $1 and ${isMember}
    order by created_at desc, id`,
  addons: `select id, name, kind from addons
    where organization_id = $1 and ${isMember}
    order by created_at desc, id`,
  'team-members': `select mem.id, mem.role, u.name, u.email, u.image
    from neon_auth.member mem
    join neon_auth.user u on u.id = mem."userId"
    where mem."organizationId"::text = $1 and ${isMember}
    order by mem."createdAt", mem.id`,
  'team-invitations': `select i.id, i.email, i.role
    from neon_auth.invitation i
    where i."organizationId"::text = $1 and i.status = 'pending' and ${isMember}
    order by i."createdAt", i.id`,
} satisfies Record<LiveName, string>;

export function isLiveName(value: string): value is LiveName {
  return Object.hasOwn(workspaceQueries, value);
}

export function sealWorkspaceQuery(
  name: LiveName,
  orgId: string,
  userId: string,
): Promise<SealedLiveQuery<Record<string, unknown>>> {
  return realtime.seal({
    query: rawSql<Record<string, unknown>>(workspaceQueries[name], [orgId, userId]),
  });
}

export type InvitationRow = {
  id: string;
  organization_id: string;
  organization_name: string;
  role: string;
};

// Matches Better Auth's listUserInvitations: only a verified email sees the
// invitations sent to it, because accepting needs nothing but the invitation id.
export function sealInvitations(userId: string): Promise<SealedLiveQuery<InvitationRow>> {
  return realtime.seal({
    query: rawSql<InvitationRow>(
      `select i.id, i."organizationId"::text as organization_id, o.name as organization_name, i.role
        from neon_auth.user u
        join neon_auth.invitation i on lower(i.email) = lower(u.email)
        join neon_auth.organization o on o.id = i."organizationId"
        where u.id::text = $1 and u."emailVerified" and i.status = 'pending'
        order by i."createdAt", i.id`,
      [userId],
    ),
  });
}

export type OrganizationRow = { id: string; name: string };

export function sealOrganizations(userId: string): Promise<SealedLiveQuery<OrganizationRow>> {
  return realtime.seal({
    query: rawSql<OrganizationRow>(
      `select o.id, o.name
        from neon_auth.member m
        join neon_auth.organization o on o.id = m."organizationId"
        where m."userId"::text = $1
        order by o.id`,
      [userId],
    ),
  });
}

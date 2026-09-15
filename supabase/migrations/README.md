# Supabase migrations

SQL migrations for the Gossips database.

## Apply migrations

### Option 1: Supabase CLI (recommended)

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option 2: Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Run the contents of each migration file in order

## Migration files

| File | Phase | Description |
|------|-------|-------------|
| `20250905100000_phase1_foundation.sql` | 1 | Profiles table, RLS policies, auth trigger |
| `20250908100000_phase4_one_to_one_chat.sql` | 4 | Conversations, members, messages, Realtime |

## Notes

- Migrations are ordered by timestamp prefix
- Each phase adds its own migration file — do not modify applied migrations
- Regenerate TypeScript types after schema changes:

```bash
supabase gen types typescript --linked > src/types/database.ts
```

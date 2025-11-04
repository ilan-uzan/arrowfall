# Supabase Database Setup

Since the Supabase MCP is in read-only mode, you need to manually create the database table in your Supabase dashboard.

## Steps

1. Go to your Supabase project dashboard: https://bnkkcumuvzzkxofxdatz.supabase.co
2. Navigate to the SQL Editor
3. Run the following SQL:

```sql
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  winner TEXT NOT NULL,
  loser TEXT NOT NULL,
  winner_kos INTEGER DEFAULT 0,
  loser_kos INTEGER DEFAULT 0,
  rounds_to_win INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

4. Verify the table was created by checking the Tables section in your Supabase dashboard.

## Alternative: Use the init script

You can also run:
```bash
npm run init:db
```

This will print the SQL you need to run if the table doesn't exist yet.

## Environment Variables

Make sure your `.env` file contains:
```
SUPABASE_URL=https://bnkkcumuvzzkxofxdatz.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
PORT=3000
```

The Supabase key is your anon/public key from the Supabase dashboard (Settings > API).


-- Read-only inventory of migrations recorded by Supabase CLI.
-- Compare this result with the repository files under supabase/migrations.
select version, name
from supabase_migrations.schema_migrations
order by version;

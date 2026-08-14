# Supabase Authority

This directory is the authoritative source for the platform's Supabase schema and migrations.

## Migrations
All schema changes must be added here. The individual apps (`SuperAdmin`, `CollegeAdmin`, `LMS`) no longer maintain their own migration folders.

## Usage
To push changes to a project:
1. `npx supabase link --project-ref <your-project-ref>`
2. `npx supabase db push`


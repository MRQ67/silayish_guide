# Implementation Plan: Building Code Support for Campus Locations

Add support for painted campus building identifiers (for example "B-002") across the database, TypeScript definitions, search subsystem, and user interface.

## User Review Required

- Database migration: A new migration file `supabase/migrations/20261014_add_location_code.sql` is added with the exact SQL specified.
- Font configuration: `Stardos_Stencil` (weights 400 and 700) is imported through `next/font/google` and mapped strictly to a utility class `font-stencil`. Body and other components continue using the default sans font.

## Proposed Changes

### 1. Database Migration

#### [NEW] `supabase/migrations/20261014_add_location_code.sql`

Add the nullable, unique uppercase `code` column and check constraint:

```sql
alter table public.locations add column code text;
alter table public.locations add constraint locations_code_format
  check (code is null or (code = upper(btrim(code)) and char_length(code) between 1 and 20));
alter table public.locations add constraint locations_code_key unique (code);
```

### 2. TypeScript Types

#### [NEW] `src/lib/types.ts`

Define the application `Location` interface containing `code: string | null`:

```ts
export type LocationType = "building" | "office" | "dorm" | "lab" | "facility"

export interface Location {
  id: string
  name: string
  code: string | null
  type: LocationType
  parent_id?: string | null
  category_id?: string | null
  description?: string | null
  lat?: number | null
  lng?: number | null
  floor?: number | null
  opening_hours?: string | null
  photo_url?: string | null
  created_at?: string
  updated_at?: string
}
```

#### [MODIFY] `src/lib/supabase/database.types.ts`

Update `locations` table definitions to include `code: string | null` in `Row`, `Insert`, and `Update`.

### 3. Search Subsystem and Unit Tests

#### [NEW] `src/lib/search.ts`

Export pure normalization function `normalizeCode` and location search utility:

- `normalizeCode(code: string | null | undefined): string`: Converts to lower case and strips whitespace and dashes (e.g., "b002", "B 002", "b-002", and "B-002" all normalize to "b002").
- `searchLocations(locations: Location[], query: string): Location[]`:
  - Matches query against `name`, `description`, and `code`.
  - Empty or whitespace-only query returns `[]`.
  - Exact code matches rank first in search results.
  - Case-insensitive substring matching for name and description.

#### [NEW] `src/lib/search.test.ts`

Vitest test suite covering:

- Exact code variants: `"b002"`, `"B 002"`, `"b-002"` all finding `"B-002"`.
- Partial code match: `"B-00"`.
- No match behavior.
- Empty query returning `[]`.
- Locations whose code is `null`.
- Exact code matches ranking ahead of name/description matches.

### 4. UI Components and Font Integration

#### [MODIFY] `src/app/layout.tsx`

Load `Stardos_Stencil` (weights 400 and 700) with CSS variable `--font-stencil` and attach to `html`.

#### [MODIFY] `src/app/globals.css`

Map `--font-stencil` in `@theme inline` and configure `.font-stencil` utility.

#### [NEW] `src/components/code-badge.tsx`

Create `CodeBadge` component:

- Renders `null` when `code` is null or undefined.
- Uses `font-stencil` with bold, high-contrast wall signage styling.

#### [NEW] `src/components/location-list-item.tsx`

Render location row item displaying `<CodeBadge code={location.code} />` next to location name and details.

#### [NEW] `src/components/map-popup.tsx`

Render map popup view embedding `<CodeBadge code={location.code} />` for building identification on the campus map.

### 5. Git and PR Workflow

- Branch `feat/location-code`.
- Small conventional commits.
- Push and open pull request into `main`.

## Verification Plan

### Automated Tests

Run the entire validation suite to verify zero regressions:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Manual Verification

1. Inspect test execution output verifying all search normalization and ranking test cases pass.
2. Verify production Next.js build succeeds with font compilation and Turbopack bundling.

# Edit Workflow Testing Plan

> Repeatable, visual, end-to-end testing for the prez-lite editing workflow.

**Status**: 📋 Planned
**Last updated**: 2026-02-25

## Problem

The editing workflow (auth → load TTL → edit → save → GitHub commit) has known bugs (#6, #10) and limited test coverage. Current e2e tests only verify auth and browse flows — no actual edits are tested. The GitHub OAuth requirement makes testing harder because:

- Auth state must be mocked correctly (token + user + runtime config)
- GitHub Contents API (load/save) must be intercepted
- Data must reset between test runs to avoid accumulation
- Failures are hard to debug without visual replay

## Goals

1. **Comprehensive edit test coverage** — every user-facing edit action tested end-to-end
2. **Visual debugging** — watch tests execute in real-time locally
3. **Repeatable and isolated** — each test starts from a known state, cleans up after itself
4. **CI-compatible** — headless in CI with traces/screenshots on failure
5. **Easy to run** — single command, no manual setup

## Architecture

### Tool: Playwright (already in use)

Playwright provides everything we need:

| Capability | Command | Purpose |
|---|---|---|
| Headless CI | `pnpm test:e2e` | Automated validation in CI |
| Visual UI mode | `pnpm test:e2e:ui` | Watch tests run, time-travel debug, locator picker |
| Trace viewer | `npx playwright show-trace <file>` | Post-mortem debugging of CI failures |
| HTML report | `npx playwright show-report` | Browse all results with screenshots + traces |

No additional tools needed. Playwright UI mode (`--ui`) provides a built-in test browser where you can:
- See all tests in a sidebar, click to run individually
- Watch the browser execute each step in real-time
- Time-travel: hover over any action to see before/after DOM snapshots
- Use the locator picker to identify elements interactively
- Re-run on file change (watch mode)

### Auth Strategy: Full Mock via Playwright Fixtures

Rather than real OAuth, we mock the entire auth + GitHub API layer:

```
┌─────────────────────────────────────────────┐
│ Playwright Test                             │
├─────────────────────────────────────────────┤
│ 1. addInitScript → set gh_token in          │
│    localStorage before page load            │
│ 2. route('api.github.com/user') → mock user │
│ 3. route('api.github.com/repos/*/contents') │
│    → mock GET (load TTL) + PUT (save)       │
│ 4. Runtime config already set in            │
│    playwright.config.ts (CLIENT_ID, etc.)   │
└─────────────────────────────────────────────┘
```

This is fast, deterministic, and works identically in CI and local.

### Data Reset Strategy: Mock-Based (No Real Git)

Each test uses Playwright route interception to serve fixture TTL data. No real GitHub API calls are made. This means:

- **No cleanup needed** — mocks don't persist
- **Deterministic** — same data every time
- **Fast** — no network latency
- **Isolated** — tests can't interfere with each other

For save verification, we capture the PUT request body and assert the patched TTL content.

## Implementation Plan

### Phase 1: Test Infrastructure

Create reusable Playwright fixtures and page objects.

#### 1.1 Auth Fixture (`web/tests/e2e/fixtures/auth.ts`)

Reusable fixture that handles auth setup for all edit tests:

```typescript
import { test as base } from '@playwright/test'

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    // Inject auth token before any navigation
    await page.addInitScript((token) => {
      localStorage.setItem('gh_token', token)
    }, 'mock-gh-token')

    // Mock GitHub user endpoint
    await page.route('https://api.github.com/user', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          login: 'test-user',
          avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
          name: 'Test User',
        }),
      })
    )

    await use(page)
  },
})
```

#### 1.2 GitHub API Mock Fixture (`web/tests/e2e/fixtures/github-api.ts`)

Captures save requests for assertion:

```typescript
export const test = base.extend<{
  authedPage: Page
  mockVocab: { loadTTL: string; savedRequests: SaveRequest[] }
}>({
  mockVocab: async ({ page }, use) => {
    const savedRequests: SaveRequest[] = []
    const loadTTL = FIXTURE_TTL // Known-good test vocabulary

    await page.route('**/api.github.com/repos/*/contents/**', (route, req) => {
      if (req.method() === 'GET') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            sha: 'mock-sha',
            content: Buffer.from(loadTTL).toString('base64'),
          }),
        })
      }
      if (req.method() === 'PUT') {
        const body = JSON.parse(req.postData() || '{}')
        savedRequests.push({
          message: body.message,
          content: Buffer.from(body.content, 'base64').toString(),
          sha: body.sha,
        })
        return route.fulfill({
          status: 200,
          body: JSON.stringify({ content: { sha: 'new-sha' } }),
        })
      }
    })

    await use({ loadTTL, savedRequests })
  },
})
```

#### 1.3 Page Objects

Encapsulate edit UI interactions:

| Page Object | Responsibilities |
|---|---|
| `SchemeEditorPage` | Navigate to scheme, enter edit mode, select concept, save, exit |
| `ConceptFormPage` | Fill/clear properties, add/remove values, set language tags |
| `EditToolbarPage` | Undo, redo, check change count, toggle view mode |
| `SaveModalPage` | Review changes, edit commit message, confirm/cancel |

#### 1.4 Test TTL Fixtures (`web/tests/e2e/fixtures/vocab-data.ts`)

Minimal but complete SKOS vocabulary for testing:

```turtle
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix schema: <https://schema.org/> .

<https://example.org/def/test>
    a skos:ConceptScheme ;
    skos:prefLabel "Test Vocabulary" ;
    skos:definition "A vocabulary for testing edits." ;
    skos:hasTopConcept <https://example.org/def/test/alpha> ;
    schema:creator <https://example.org/org/test> ;
    schema:dateCreated "2026-01-01" .

<https://example.org/def/test/alpha>
    a skos:Concept ;
    skos:prefLabel "Alpha" ;
    skos:definition "First concept." ;
    skos:inScheme <https://example.org/def/test> ;
    skos:topConceptOf <https://example.org/def/test> ;
    skos:narrower <https://example.org/def/test/beta> .

<https://example.org/def/test/beta>
    a skos:Concept ;
    skos:prefLabel "Beta" ;
    skos:definition "Child of Alpha." ;
    skos:inScheme <https://example.org/def/test> ;
    skos:broader <https://example.org/def/test/alpha> .
```

### Phase 2: Edit Workflow Tests

Each test is isolated, uses mock fixtures, and covers a specific edit action.

#### Test Suite: `web/tests/e2e/edit-workflow.spec.ts`

| # | Test Name | What It Verifies |
|---|---|---|
| 1 | Enter full edit mode | Click Edit → Full → toolbar shows "No changes yet" |
| 2 | Enter inline edit mode | Click Edit → Inline → inline table renders |
| 3 | Edit concept label | Change prefLabel → change count = 1 → toolbar shows "1 change" |
| 4 | Edit concept definition | Change definition → verify in change summary |
| 5 | Add a property value | Add altLabel → verify new value appears |
| 6 | Remove a property value | Remove altLabel → verify removal in change summary |
| 7 | Add language tag | Set language on literal → verify tag persists (bug #10) |
| 8 | Undo edit | Make edit → undo → verify reverted |
| 9 | Redo edit | Undo → redo → verify reapplied |
| 10 | Revert single subject | Edit two concepts → revert one → verify only that one reverts |
| 11 | Save with commit message | Save → verify PUT request body contains correct TTL + message |
| 12 | Save minimal diff | Edit one concept → save → verify only that subject block changed |
| 13 | Exit edit mode without saving | Make edits → exit → confirm discard → verify clean state |
| 14 | Multiple edits before save | Edit label + definition + add altLabel → save → verify all in PUT |
| 15 | Edit scheme metadata | Edit vocabulary-level properties (in Vocabulary section) |

#### Test Suite: `web/tests/e2e/edit-concepts.spec.ts`

| # | Test Name | What It Verifies |
|---|---|---|
| 1 | Add new concept | Add concept via form → verify in tree + change summary |
| 2 | Delete concept | Delete concept → verify removed from tree |
| 3 | Move concept (reparent) | Move concept to new broader → verify hierarchy update |
| 4 | Rename concept IRI | Rename subject IRI → verify all references updated |
| 5 | Multiple subject saves | Edit concept A, save, edit concept B, save → two PUT requests |

#### Test Suite: `web/tests/e2e/edit-bugs.spec.ts`

Regression tests for known bugs:

| # | Test Name | Bug | What It Verifies |
|---|---|---|---|
| 1 | Save one subject preserves other changes | #6 | Edit A + B → save A → B still shows as changed |
| 2 | Language tag persists with multiple values | #10 | Add value with @en → add another → first keeps @en |

### Phase 3: View Mode & History Tests

| # | Test Name | What It Verifies |
|---|---|---|
| 1 | Expert/Simple toggle in edit mode | Toggle → verify expert fields show/hide |
| 2 | Expert toggle disabled outside edit | Button disabled with tooltip |
| 3 | History popover shows commits | Mock commits endpoint → verify list |
| 4 | Change detail modal | Click change badge → modal shows property diffs |
| 5 | Spreadsheet view editing | Switch to spreadsheet → inline edit → verify change |

### Phase 4: Robustness Tests

| # | Test Name | What It Verifies |
|---|---|---|
| 1 | Save failure handling | Mock PUT → 409 conflict → error shown, data not lost |
| 2 | Load failure handling | Mock GET → 404 → error message shown |
| 3 | Large vocabulary edit | Load vocab with 100+ concepts → edit → save → no timeout |
| 4 | Concurrent edit warning | Mock stale SHA → save → conflict message |

## File Structure

```
web/tests/e2e/
├── browse.spec.ts               # Existing browse tests
├── search.spec.ts               # Existing search tests
├── edit-flow.spec.ts            # Existing (refactor to use fixtures)
├── edit-workflow.spec.ts        # Phase 2: core edit actions
├── edit-concepts.spec.ts        # Phase 2: concept CRUD
├── edit-bugs.spec.ts            # Phase 2: regression tests
├── edit-views.spec.ts           # Phase 3: view modes + history
├── edit-robustness.spec.ts      # Phase 4: error handling
├── fixtures/
│   ├── auth.ts                  # Auth fixture (authedPage)
│   ├── github-api.ts            # GitHub API mock fixture
│   ├── vocab-data.ts            # Test TTL content
│   └── index.ts                 # Combined fixture exports
├── pages/
│   ├── scheme-editor.page.ts    # Scheme page interactions
│   ├── concept-form.page.ts     # ConceptForm interactions
│   ├── edit-toolbar.page.ts     # EditToolbar interactions
│   └── save-modal.page.ts      # SaveConfirmModal interactions
└── helpers/
    ├── fixtures.ts              # Existing data constants
    └── github-mocks.ts          # Existing (migrate to fixtures/)
```

## Running Tests

```bash
# Headless (CI)
pnpm --filter @prez-lite/web test:e2e

# Visual UI mode (watch tests run, click to replay)
pnpm --filter @prez-lite/web test:e2e:ui

# Run a specific test file
pnpm --filter @prez-lite/web test:e2e -- edit-workflow

# View HTML report after run
npx playwright show-report web/playwright-report

# Debug a specific test with trace
pnpm --filter @prez-lite/web test:e2e -- --trace on edit-workflow
```

## CI Integration

Already configured in `.github/workflows/test.yml`:

```yaml
e2e:
  steps:
    - run: pnpm build:all-export         # Generate static data
    - run: npx nuxt prepare
    - run: npx playwright install --with-deps chromium
    - run: pnpm --filter @prez-lite/web test:e2e
    - uses: actions/upload-artifact@v4    # Upload report + traces
      with:
        name: playwright-report
        path: web/playwright-report/
```

Traces are uploaded on failure for post-mortem debugging via `npx playwright show-trace`.

## Implementation Order

1. **Fixtures + page objects** — foundation for all tests
2. **Refactor existing edit-flow.spec.ts** — use new fixtures
3. **Core edit workflow tests** (Phase 2) — highest value
4. **Bug regression tests** — validate fixes for #6 and #10
5. **View mode + history tests** (Phase 3)
6. **Robustness tests** (Phase 4)

## Success Criteria

- All edit actions have e2e coverage
- Tests pass locally (`test:e2e`) and in CI
- Visual mode (`test:e2e:ui`) works for debugging
- Known bugs (#6, #10) have regression tests
- Test suite runs in under 2 minutes
- No real GitHub API calls — fully mocked

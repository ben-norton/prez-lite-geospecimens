# Vocab Management: Layered Status Bar & Promotion Workflow

> **Status**: Planning
> **Wireframe**: [`web/wireframes/option-a-layered-status-bar.html`](../../web/wireframes/option-a-layered-status-bar.html)

## Overview

Authenticated users are always in edit mode. The **layered status bar** sits below the edit toolbar and shows three tiers of change visibility — unsaved local edits, commits on the work branch, and commits in staging awaiting promotion to production. Each layer is a clickable segment that expands a flyout listing affected concepts. Concept tree nodes display colored dots indicating which layers have changes.

Promotion between environments uses **GitHub Pull Requests** gated by branch protection rules — no custom role system required.

---

## Layers

| Layer | Color | Label | Meaning | Data Source |
|-------|-------|-------|---------|-------------|
| 1 | Amber | Unsaved | In-memory edits not yet committed | `useEditMode.getChangeSummary()` |
| 2 | Blue | On branch | Commits on `edit/<workspace>/<vocab>` vs workspace root | `fetchDiff(workspace_tip, branch_tip)` |
| 3 | Green | In staging | Commits on workspace root (e.g. `staging`) vs `main` | `fetchDiff(main_tip, workspace_tip)` |

Flow visualization: `main <- staging <- branch <- you`

---

## Components

### `useLayerStatus` composable

Orchestrates all three layers into a single reactive interface.

```
Layer 1  ->  useEditMode.getChangeSummary()      (already reactive)
Layer 2  ->  fetch TTL at workspace tip + branch tip, diff N3 stores
Layer 3  ->  fetch TTL at main tip + workspace tip, diff N3 stores
```

Each layer exposes:
- `count: number` — number of affected concepts
- `changes: SubjectChange[]` — concept-level change details
- `loading: boolean`
- `error: string | null`

Derived:
- `conceptLayers: Map<string, Set<'unsaved' | 'branch' | 'staging'>>` — per-concept layer membership for tree dots

Layers 2 and 3 are fetched on page load (when workspace + vocab are ready) and refreshed after save. Cached in memory — only re-fetched when branch tips change.

### `LayerStatusBar.vue`

Renders below `EditToolbar`, above page content.

- Three pill segments: dot + count + label
- Clicking a segment opens a flyout popover listing affected concepts
- Right-aligned flow label: `main <- staging <- branch <- you`
- "Promote" button in layer 2/3 flyouts (creates a PR)

### Tree node dots

Extend `ConceptTreeNode` to accept a layer status map. Each node renders up to three small colored dots (amber, blue, green) based on which layers have changes for that concept. Parent nodes aggregate child indicators.

---

## Promotion Workflow

Promotion between environments is handled via GitHub Pull Requests, gated by branch protection rules on the GitHub repository.

| Action | Mechanism | Who can do it |
|--------|-----------|---------------|
| Save edits | Direct push to `edit/<ws>/<vocab>` | Any authenticated user |
| Promote branch to staging | PR: `edit/<ws>/<vocab>` -> `staging` | Merge requires `vocab-authors` team |
| Promote staging to main | PR: `staging` -> `main` | Merge requires `vocab-admins` team |

### GitHub branch protection setup

```
Branch: staging
  - Require pull request before merging
  - Required reviewers: 1 (from vocab-admins)
  - Restrict pushes: vocab-authors team

Branch: main
  - Require pull request before merging
  - Required reviewers: 2 (from vocab-admins)
  - Restrict pushes: nobody (PR-only)
```

### "Promote" button

The layer 2 and layer 3 flyouts include a "Promote" action:
- Creates a PR via `POST /repos/{owner}/{repo}/pulls`
- Auto-generates title: `promote: <vocab-label> (<source> -> <target>)`
- If a PR already exists, shows its status (open, approved, merged)
- After merge, layer count clears on next refresh

---

## Implementation Plan

### Phase 1: Layer data

1. Create `useLayerStatus` composable
2. Wire layer 1 from existing `useEditMode`
3. Implement layer 2/3 by diffing TTL between branch tips (reuse `fetchVersionContent` + `buildChangeSummary`)
4. Compute `conceptLayers` map for tree dots

### Phase 2: Status bar UI

5. Create `LayerStatusBar.vue` with three segments
6. Add flyout popovers per layer (reuse changes popover pattern)
7. Integrate into `scheme.vue` below `EditToolbar`
8. Add flow label

### Phase 3: Tree dots

9. Extend `ConceptTreeNode` props for multi-layer indicators
10. Render colored dots per node
11. Aggregate child indicators to parent nodes

### Phase 4: Promotion

12. Add "Promote" button to layer 2/3 flyouts
13. Create PR via GitHub API
14. Show existing PR status in layer segment
15. Document branch protection setup for deployers

---

## Test Cases

### Unit: `useLayerStatus`

| # | Test | Expectation |
|---|------|-------------|
| 1 | Layer 1 count reflects edit mode changes | Count matches `getChangeSummary().subjects.length` |
| 2 | Layer 2 empty when no workspace selected | Returns 0 count, empty changes |
| 3 | Layer 2 shows changes when branch ahead of staging | Returns concept-level diffs |
| 4 | Layer 3 shows changes when staging ahead of main | Returns concept-level diffs |
| 5 | All layers empty for fresh branch | All counts 0 |
| 6 | Layer 1 decreases after save, layer 2 increases | Counts shift correctly |
| 7 | API error handled gracefully | Count 0, error message set |
| 8 | `conceptLayers` map correct for multi-layer concept | Concept appears in correct layer sets |

### Unit: `LayerStatusBar.vue`

| # | Test | Expectation |
|---|------|-------------|
| 9 | Renders three segments with counts | All three visible with correct numbers |
| 10 | Click segment opens flyout | Flyout popover appears |
| 11 | Click active segment closes flyout | Flyout closes |
| 12 | Flyout lists concepts with type badges | Correct icons and labels |
| 13 | Shows flow label | `main <- staging <- branch <- you` visible |
| 14 | Loading state shown while fetching | Spinner on layers 2/3 |

### Unit: Tree dots

| # | Test | Expectation |
|---|------|-------------|
| 15 | Unsaved change shows amber dot | Single amber indicator |
| 16 | Branch change shows blue dot | Single blue indicator |
| 17 | Staging change shows green dot | Single green indicator |
| 18 | Multi-layer concept shows multiple dots | All applicable dots rendered |
| 19 | Parent aggregates child indicators | Parent shows dots for any descendant change |

### Integration

| # | Test | Expectation |
|---|------|-------------|
| 20 | Edit -> save -> layer shift | Layer 1 clears, layer 2 increments |
| 21 | Layer 3 matches staging vs main diff | Concept list matches expected changes |

---

## Open Questions

- **Performance**: Layers 2/3 require parsing full TTL files for both branch tips. Should we lazy-load on segment click instead of on page load?
- **Stale data**: How often to refresh layer 2/3? On save only, or periodic polling?
- **Multiple vocabs**: Should layers show aggregate counts across all vocabs in a workspace, or per-vocab only?
- **PR templates**: Should promotion PRs include a change summary in the body?

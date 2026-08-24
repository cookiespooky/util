# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static corporate site for «Утилитсервис» (waste-handling services, Russian-language). Built with [Notepub](https://github.com/cookiespooky/notepub) — a Go static site generator that turns Markdown + `rules.yaml` into HTML. CI publishes to GitHub Pages at `https://cookiespooky.github.io/util/` (a **project** Pages site, so everything lives under the `/util` path prefix).

There is no package manager, no test suite, and no JS build step. Assets are hand-written CSS/JS served as-is.

Alongside the static site there is now a small PHP backend in [api/](api/) (request form + geo-IP city detection). It cannot run on GitHub Pages — it targets a VPS layout described in [api/nginx.sample.conf](api/nginx.sample.conf). Both targets currently coexist; see "Backend" below for what is and isn't wired up.

## Commands

```bash
./scripts/build.sh                 # validate → index → validate links → export backend data → build → check dist
./scripts/deploy.sh "commit msg"   # build, commit an allowlist of paths, push (CI deploys)
notepub serve --config ./config.dev.yaml --rules ./rules.yaml   # local preview on :8080
```

Individual pipeline stages (useful for fast iteration; `build.sh` wipes `dist/`, `.notepub/` and `artifacts/` each run):

```bash
notepub validate --config ./config.yaml --rules ./rules.yaml
notepub index    --config ./config.yaml --rules ./rules.yaml          # writes .notepub/artifacts/resolve.json
notepub validate --config ./config.yaml --rules ./rules.yaml --resolve ./.notepub/artifacts/resolve.json --links --markdown
python3 ./scripts/export-backend-data.py                              # writes api/site-data.generated.json
notepub build    --config ./config.yaml --rules ./rules.yaml --dist ./dist --artifacts ./.notepub/artifacts
python3 ./scripts/check-dist.py ./dist
```

`--artifacts ./.notepub/artifacts` on `build` is required: without it Notepub writes materialized collections to a separate top-level `artifacts/` directory that then diverges from the index written by `index`.

**Do not trust `check-dist.py` as a link checker.** It asserts `index.html`, `search.json` and `sitemap.xml` exist, and it *would* resolve relative links — but it skips `http(s)://` links and root-relative `/…` links outright, and `base_url` in both configs is absolute, so every emitted internal link is an `https://…` URL and nothing gets checked. Its success line counts HTML files, not links. Broken internal links must be caught by hand or by `notepub validate --links`.

The Notepub version is pinned by commit SHA in **two** places that must stay in sync: `NOTEPUB_REF` in [scripts/build.sh:7](scripts/build.sh#L7) and in [.github/workflows/pages.yml:18](.github/workflows/pages.yml#L18). `build.sh` `go install`s it into `.bin/` if `notepub` isn't on PATH (needs Go 1.22+); override with `NOTEPUB_BIN`.

## Build pipeline

```
content/*.md (frontmatter + [[wikilinks]])
  → rules.yaml (type → template + permalink, collections, links, validation)
  → theme/templates/*.html (Go templates)
  → dist/
                     ↘ scripts/export-backend-data.py → api/site-data.generated.json (PHP backend)
```

[rules.yaml](rules.yaml) is the routing authority. Its `validation:` block is strict — duplicate route, unknown type, duplicate slug, missing template, and permalink-without-slug are all hard errors, so a malformed page fails the build rather than degrading.

**Adding a page type requires coordinated edits:**
1. a `types:` entry in `rules.yaml` (template + permalink + `include_in`), plus adding the type name to the `links:` `from_types`/`to_types` lists and, if public, to `sitemap.include_types` / `search.include_types`;
2. `theme/templates/<name>.html`;
3. branches in [theme/templates/layout.html](theme/templates/layout.html) for its shell and assets — per-type CSS/JS is conditionally linked there, nowhere else (see "Page types and the shell");
4. any new frontmatter keys added to `fields.optional` in `rules.yaml` — unlisted keys fail validation;
5. a `collections:` entry if other pages need to list it.

`collections:` are materialized filters over frontmatter sorted by `fm.nav_order`; that is how service/city listings get their ordering, and — since the contacts refactor — how phone numbers reach the header, footer and home map. Templates read them as `{{ range .Collections.<name>.Items }}` with `.Slug` and `.FM.*` on each item. Note `company_pages` has `materialize: false` and so is *not* available to templates.

[partials/v2_header.html](theme/templates/partials/v2_header.html) is entirely collection-driven — it ranges over `services_v2`, `company_v2`, `cities_v2` for its menus, over `search_v2` to inline a client-side search index, and over `cities_v2` again to emit a hidden `[data-city-index]` that `main.js` reads. Adding a page therefore updates the nav automatically; setting `draft: true` or exceeding a collection `limit` silently removes it.

Two service types are easy to miss: `partial` (`content/_partials/`, routed to `/_partials/{{ slug }}/` via `page.html`, `robots: disallow`) and `system` (`content/_system/` — `404`, `search`, `thank-you`, `consent` — via `system.html`). `build.sh` additionally copies `dist/404/index.html` to `dist/404.html` so GitHub Pages picks it up. [theme/templates/notfound.html](theme/templates/notfound.html) is referenced by nothing in `rules.yaml` and is dead.

## Page types and the shell

The v2 redesign has been **promoted to the canonical site** (commit `d8ef6a2`). The `-v2` suffix now survives only as a type and template name — it no longer affects routes, indexing, or which pages are public.

Live types and where their content lives:

| Type | Content | Route |
|---|---|---|
| `home-v2` | [content/home.md](content/home.md) | `/` |
| `catalog-v2` | [content/services.md](content/services.md) | `/services/` |
| `service-v2` | `content/services/` (7 pages) | `/{slug}/` |
| `company-v2` | `content/company/` (about, contacts, faq, licenses, partners) | `/{slug}/` |
| `city-v2` | `content/cities/` (surgut, tyumen, nyagan) | `/{slug}/` |
| `legal` | `content/pages/privacy.md` | `/privacy/` |
| `system` | `content/_system/` | `/{slug}/` |

The previous generation (`home`, `catalog`, `service`, `city`, `company`, `design`, `home-concept`, `partial`) has **no content left** — the Markdown was moved to [content-v1-backup/](content-v1-backup/), which is outside `content.local_dir` and is not built. Their `types:` entries, templates ([service.html](theme/templates/service.html), [catalog.html](theme/templates/catalog.html), …), partials ([partials/header.html](theme/templates/partials/header.html), [partials/footer.html](theme/templates/partials/footer.html), the `home_*`/`service_*` partials) and CSS (`home-page.css`, `service-page.css`, `catalog-page.css`, `catalog-city-page.css`, `company-legal-page.css`, `design-system.css`, `home-concept.*`, `token-showcase.*`, `visual-components.*`, `map-fixes.js`) are retained only so the backup can be restored. **Treat them as dead code**; don't fix bugs there and don't copy their patterns.

Everything currently built uses the same shell: `partials/v2_header.html` + `partials/v2_footer.html`, `<body class="v2-body">`, `v2.css` + `v2.js`. In [layout.html](theme/templates/layout.html) that shell is selected by **five separate full-set conditionals** (v2 CSS, body class, header, footer, v2.js), each listing all **seven** live types (`home-v2`, `catalog-v2`, `service-v2`, `company-v2`, `city-v2`, `legal`, `system`). A new type must be added to all five plus its own per-page CSS branch — miss one and the page renders with the dead v1 shell or unstyled.

Per-page assets on top of `v2.css`: `service-v2.css` (service-v2 **and** catalog-v2), `company-v2.css` (company-v2), and `service-v2.css` + `company-v2.css` + `city-v2.css` (city-v2). `home-v2` additionally loads `action-components.js`, which drives the geo map (`[data-presence-map]`) and syncs it with the header city select.

Indexing: `sitemap.include_types` and `search.include_types` now list the v2 types; `home-v2` is in the sitemap but excluded from search. The `search_v2` collection still exists and still feeds the header's inline search index — the comment in `rules.yaml` claiming v2 pages are absent from `search.json` is stale, they are in both, but the two indexes have different membership (`search_v2` includes `home-v2`, `search.json` does not).

## Content model

Pages are **frontmatter-driven**: `service-v2`, `company-v2`, `city-v2` and `catalog-v2` templates read `.FM.hero_title`, `.FM.facts`, `.FM.process`, `.FM.faq` etc. and render every section from structured YAML; the Markdown body is a one-line stub saying so. To change a service page you edit its frontmatter, not its prose. `home-v2` goes further — its content is hardcoded in [home-v2.html](theme/templates/home-v2.html) and the Markdown file only supplies the route and metadata.

Consequence: any new section means a new key in `fields.optional` (`rules.yaml`) *and* a matching `{{- if .FM.<key> }}` branch in the template. Templates gate sections on field presence, so an absent field silently drops its section.

The archived v1 Markdown in `content-v1-backup/` carries markers like `<!-- block:service-hero -->` and `<!-- component:request-form -->` (the intent documented in [docs/BLOCK-CONTRACT.md](docs/BLOCK-CONTRACT.md) and [theme/components/README.md](theme/components/README.md)). **Those markers are inert** — Notepub never parsed them. Don't port that convention into current pages; structured frontmatter replaced it.

[theme/assets/component-classes.js](theme/assets/component-classes.js) maps legacy selectors onto `ui-*` classes at runtime. It is an explicitly temporary migration shim: don't extend it.

### Icon chains

`facts` entries carry an `icon` name resolved to inline SVG by an `if`/`else if` chain, and an unknown name falls through to a default box glyph — so a typo degrades silently rather than failing the build. **The chain is copy-pasted into four templates whose supported sets differ:**

| Template | Missing from the full set |
|---|---|
| [partials/v2_facts.html](theme/templates/partials/v2_facts.html) (used only by `catalog-v2`) | — (all twelve) |
| [service-v2.html](theme/templates/service-v2.html) | `clock`, `people`, `pin` |
| [company-v2.html](theme/templates/company-v2.html) | `camera`, `route` |
| [city-v2.html](theme/templates/city-v2.html) | `camera`, `route`, `search` |

Full set: `layers`, `calendar`, `clock`, `document`, `search`, `route`, `truck`, `shield`, `flame`, `camera`, `people`, `pin`. Check the specific template before using a name, and when adding one, add it to all four.

Three further, unrelated glyph chains exist and use **different vocabularies** — don't mix them up:
- [partials/v2_service_glyph.html](theme/templates/partials/v2_service_glyph.html), keyed by `service_key` (`medical`, `industrial`, `food`, `biological`, `documents`, `passports`, `cremation`), shared by the catalog and the header menu. It is invoked *inside* a `range` with a collection item as the dot, so it cannot reach `.BaseURL` or `.Page`.
- [partials/v2_metric_glyph.html](theme/templates/partials/v2_metric_glyph.html) (`flame`, `truck`, `people`, `pin`, `plant`, `award`, `calendar`, `shield`) is **currently referenced by nothing** — the city pages' «Подразделение в цифрах» section it served was removed. The live `stats` chain is inlined in `company-v2.html` and supports a *different* set (`flame`, `truck`, `people`, `pin`, `clock`, `document`), so the partial is not a drop-in replacement for it.
- The company-menu page glyph in `v2_header.html`, keyed by the page-level `icon:` field of `company-v2` pages: only `building`, `document`, `people`, `question`.

## Contacts: one source of truth

Phone numbers, e-mails, addresses, hours and the VK community link live **only in the frontmatter of `content/cities/*.md`** (`contact.phones[].value`/`.link`, `contact.email`, `contact.address`, `contact.hours`, optional `contact.vk`, plus `city_key`, `nav_title`, `city`). Everything else derives from there:

- **Header, footer, home geo map, request-form contact block** — via the `cities_v2` collection. The shared block is [partials/v2_request_contact.html](theme/templates/partials/v2_request_contact.html), used by all four page templates that carry a form.
- **`main.js`** — no longer holds a `cityContacts` literal; it builds the map from the hidden `[data-city-index]` markup the header emits, and the default city is simply the first item (`nav_order`), not a hardcoded `surgut`. The header shows a **second** phone via `[data-city-phone-2]`, fed by `data-phone2`/`data-phone2-link` in that index; only Tyumen has one, so `main.js` hides the element for cities that don't.
- **The header and footer VK icon** — rendered by ranging `cities_v2` and emitting a link for every city that defines `contact.vk`. Today only Tyumen does, so exactly one icon appears; the asset is `theme/assets/vk-logo.svg` (the copy at repo root is not served).
- **The PHP backend** — via `api/site-data.generated.json`, regenerated by [scripts/export-backend-data.py](scripts/export-backend-data.py) on every build. That script parses top-level YAML with regexes (no pyyaml on the build host), so it only sees flat keys plus the `contact:` block; it fails the build if a city page lacks `city_key` or if no city/service survives.

When editing a city page, keep the shapes the parser and templates expect: `contact.phones` must be a non-empty list (`index … 0` is taken unguarded), and `city_key` must match the keys used in `api/config.sample.php` (`recipients`, `geo.regions`, `geo.cities`).

What still duplicates contacts and must be changed alongside: `settings:` in [config.yaml](config.yaml) *and* [config.dev.yaml](config.dev.yaml) (already drifted — `general_email` is `utilit@bk.ru` in prod, `555897sur@bk.ru` in dev, so local preview is not authoritative for contact details), and the dead v1 partials.

City switching itself is client-side in [theme/assets/main.js](theme/assets/main.js): the selected key is persisted to `localStorage['utilit-city']`, applied to `[data-city-phone]`, `[data-city-email]`, `[data-request-city]`, and broadcast as a `utilit:citychange` event on `document`. `v2_header.html` keeps a hidden native `<select data-city-select>` behind its custom dropdown precisely so `main.js` keeps working unchanged — preserve that when editing the header. On a first visit only, `main.js` asks `/api/city.php` for a suggested city; failures are swallowed, so on GitHub Pages (no PHP) the site simply stays on the default.

Home-page map caveat: city dots are positioned from `map_x`/`map_y` in city frontmatter, but the connecting `<path>` in the SVG above them is hand-drawn from the same numbers — templates have no arithmetic, so **moving a dot means editing the path by hand** ([home-v2.html](theme/templates/home-v2.html)).

## Backend (`api/`)

PHP 8, no composer dependencies, two endpoints:

- [api/request.php](api/request.php) — accepts the request form as `POST` (form-encoded or JSON). Order is deliberate: **append to `storage/requests.jsonl` first, then send mail**, so a broken SMTP never loses a lead; the client is told `ok` either way. Anti-spam is a `website` honeypot plus a `form_ts` minimum fill time (both emitted by [partials/v2_form_guard.html](theme/templates/partials/v2_form_guard.html), the timestamp filled in by `v2.js` because the site is static), plus a per-IP rate limit. City and service are validated against `site-data.generated.json`; unknown extra fields (the per-service dynamic fields) are accepted as-is, length- and count-capped, rather than duplicating the field list a seventh time.
- [api/city.php](api/city.php) — returns `{city: <key>|null}` only, so pages stay static and cacheable. Resolution is by region (nginx `GEOIP_*` vars first, then an optional MaxMind `.mmdb`), and deliberately maps all of ХМАО to the head office: Surgut and Nyagan cannot be told apart by IP.

`api/config.php` holds SMTP credentials and is gitignored; without it `load_config()` falls back to [api/config.sample.php](api/config.sample.php) in a "dry" mode that stores requests but sends nothing. `storage/` (request log + GeoIP database) is gitignored and must not be web-served.

**Not yet wired:** the form templates still render `action="#"` with no `data-endpoint`, and `initSubmit` in [theme/assets/v2.js](theme/assets/v2.js) falls back to the stubbed confirmation message when that attribute is absent. Connecting the backend means setting `data-endpoint` on the `[data-v2-form]` forms in `home-v2.html`, `catalog-v2.html`, `service-v2.html`, `company-v2.html` and `city-v2.html`.

Note `config.sample.php` refers to `cities.generated.json`; the file the code actually reads is `site-data.generated.json`.

## Templates

Two content sections are shared across page types: [partials/v2_logos.html](theme/templates/partials/v2_logos.html) and [partials/v2_testimonials.html](theme/templates/partials/v2_testimonials.html) render the client plaques and testimonials from `.FM.logos` / `.FM.testimonials`. `company-v2` passes its own page context; `home-v2` ranges `company_v2`, picks the `partners` item and passes that — so the home page shows the same server-rendered markup with no second copy of the data. Their CSS lives in `v2.css` (not `company-v2.css`) precisely because the home page does not load the latter.

Single shell: [theme/templates/layout.html](theme/templates/layout.html) — head, header/footer partials, `{{ .Body }}` in `<main>`, deferred scripts. Page templates render an `<article>`; partials in [theme/templates/partials/](theme/templates/partials/) are pulled in with `{{ template "name.html" . }}` — usually the dot is the whole page context, so inside `range` you need `$.BaseURL`. The glyph partials are the exception (see above): they are invoked with a collection item as the dot.

Available in templates: `.Page` (`.Type`, `.Title`, `.Description`, `.Slug`), `.FM` (raw frontmatter — arbitrary nested YAML), `.Body` (rendered Markdown HTML), `.Collections.<name>.Items`, `.BaseURL`, `.AssetsBase`, `.Meta` (`.Robots`, `.OpenGraph`, `.JSONLD`), `.Canonical`, `.SearchMode`.

Always build internal links as `{{ .BaseURL }}/path/` — bare `/path/` breaks under the `/util` prefix, and nothing in the pipeline will catch it (see the `check-dist.py` note above).

## Frontmatter

Required: `type`, `slug`, `title`. Optional keys are enumerated in `rules.yaml` under `fields.optional` — the base set (`description`, `draft`, `layout`, `page_kind`, `nav_order`, `section`, `city`, `service_key`, `related`, `noindex`, `updated_at`, documented in [FRONTMATTER.md](FRONTMATTER.md)) plus commented groups of structural fields per page type. `related` holds slugs and is resolved by the `related` link rule; `[[wikilinks]]` in the body are resolved by the `wiki` rule (path → filename → slug, ambiguity is an error, missing is a warning).

Several base keys are validated but inert: routing keys off `type` alone, so `layout:` is read by nothing at all, and `page_kind`, `section` and `city` are used only as `data-kind`/label attributes in the header's search and city indexes. Don't try to change a page's rendering by editing `layout:`.

## CSS and JS

Load order in `layout.html` is the cascade contract: `design-tokens.css` → `primitives.css` → `styles.css` → `overrides.css` → forms/palette/component-theme/site-shell → per-type page CSS → then the late patch layers `legacy-cta-fixes.css`, `page-widths.css`, `request-forms.css`, `design-consistency.css`. Those last four are accumulated overrides loaded after everything else — prefer fixing the component or token rather than adding to them.

Naming is BEM-like: `.service-card`, `.service-card__title`, `.service-card--featured`; current classes are namespaced `v2-*` with per-page prefixes (`sv2-`, `cv2-`, `ct2-`). Avoid structural selectors into `.prose`.

The typeface is self-hosted Manrope: one variable `woff2` at `theme/assets/fonts/manrope-var.woff2`, declared at the top of `design-tokens.css` with `font-display: optional` and preloaded in the `<head>`. The `Manrope/` directory at repo root is the upstream download, not the shipped asset.

## Content rules (Russian text)

[CONTENT-GLOSSARY.md](CONTENT-GLOSSARY.md) is binding terminology, not background reading. It draws legally meaningful distinctions: «обезвреживание» vs «уничтожение» vs «размещение», «вывоз» (marketing) vs «транспортирование» (legal), and forbids «утилизация» as a generic synonym. Never write that the company itself performs an operation (размещение, обработка) unless its licence actually covers it.

[CONTENT-SPEC.md](CONTENT-SPEC.md) fixes menu structure, CTA wording («Получить расчёт», «Задать вопрос специалисту», «Проверить возможность приёма»), the request-form fields and per-service dynamic fields, and the mandatory disclaimer that submitting a request does not confirm the waste can be accepted. Reuse this exact wording instead of inventing new copy. The per-service dynamic fields are the `dynamicFields` map at the top of [theme/assets/v2.js](theme/assets/v2.js), keyed by `service_key`. No auto-reply is sent to the client — the on-page status message plus that disclaimer are the only feedback, by design.

Unverified numbers, licence details, and client/partner names are the customer's to approve — don't publish placeholders as facts.

## Gotchas

- **A template error silently collapses the whole theme, and the build still reports success.** Templates are parsed as one set, so a single bad file (e.g. an undefined function — Notepub's templates have no arithmetic helpers, no `add`) makes *every* page fall back to Notepub's built-in `np-shell` layout. `notepub build` prints `build completed`, `check-dist.py` passes, and nothing in the pipeline flags it. After touching a template, verify with `grep -c 'np-shell' dist/index.html` — `0` means the theme applied, `1` means it fell back.
- `dist/`, `.notepub/`, `.bin/`, `artifacts/` are generated and gitignored; `build.sh` deletes the first, second and fourth on every run. `api/config.php` and `storage/` are gitignored secrets/data.
- `deploy.sh` commits a hard-coded path allowlist (`content content-v1-backup theme api config.yaml config.dev.yaml rules.yaml scripts .github README.md FRONTMATTER.md .gitignore media`). Files outside it — `docs/`, `CONTENT-SPEC.md`, `CONTENT-GLOSSARY.md`, `manifest.json`, `CLAUDE.md`, top-level `logo.svg` and `Manrope/` — are **not** committed by that script; stage them manually. Note `logo.svg` exists both at repo root and at `theme/assets/logo.svg`; only the latter is served and committed.
- `og_type_by_type` in both configs is still keyed by v1 type names; live pages fall back to `website` anyway.
- Content, docs, code comments and script output are Russian. Keep new user-facing strings, comments and documentation in Russian.
- README.md still describes stage 2 and the v1 structure only; it predates the redesign. Ongoing focus is stage 3 — finishing form submission (wiring `data-endpoint`), city logic, 360–1920px QA, SEO, project handover.

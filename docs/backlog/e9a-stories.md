# E9a — Log delle importazioni (Employee): dettaglio storie

> L'Employee consulta i **propri** log di importazione (lista con filtri) e apre il **dettaglio per riga** con i messaggi d'errore delle righe fallite. Include la **persistenza del log** (vedi nota di riconciliazione sotto). Vista di **tutti** i log, filtro per dipendente e filtri avanzati sono fuori scope → **E9b**.
>
> **Nota sugli ID**: gli ID `STORY-E9a-N` sono provvisori; assegnare i numeri definitivi (globali, progressivi) all'inserimento in sprint.

---

## Nota di riconciliazione — E8a chiusa senza persistenza del log

La roadmap assegnava la tabella `imports` a E8a, ma **E8a è stata completata senza persistere alcun log**: `POST /api/me/imports` (`backend/app/routers/imports.py`) esegue il submit sugli adapter, restituisce i risultati **solo nella response HTTP** (effimeri) e fa l'upsert di `connector_row_mappings`; non esistono le tabelle `imports`/`import_rows` né endpoint `GET`. Il bottone "Log dettagliato" nella schermata risultato (`ImportPage.tsx` → `StepResult`, `navigate('/log')`) punta oggi a una pagina vuota.

**Decisione**: E9a **assorbe** la persistenza mancante (E8a è chiusa, backlog effimero). Rispetto al piano iniziale "read-side only", E9a **non è più solo-lettura**: possiede i modelli `imports` + `import_rows` e la relativa migrazione, e aggiunge la scrittura del log all'interno del `POST /api/me/imports` esistente. Le storie sotto riflettono questo scope.

---

## Modello dati posseduto da E9a

Convenzioni di naming e vincoli come da [`ADR-004`](../adr/ADR-004-orm-conventions.md).

**`imports`** (header di un'importazione):

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID | PK |
| `employee_id` | UUID FK → `users.id` | dipendente di riferimento del timesheet; `ondelete=CASCADE` |
| `operator_id` | UUID FK → `users.id` nullable | NULL se self-import; valorizzato da E8b/HR (import per conto terzi) |
| `status` | enum `success` \| `partial` \| `failed` | esito complessivo derivato dai conteggi |
| `period_start` / `period_end` | date | derivati dalle date min/max delle entries importate |
| `total_rows` / `success_rows` / `failed_rows` | int | conteggi aggregati |
| `created_at` / `updated_at` | timestamp | `TimestampMixin` |

**`import_rows`** (dettaglio per riga inviata a un connettore):

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID | PK |
| `import_id` | UUID FK → `imports.id` | `ondelete=CASCADE` |
| `row_number` | int | indice riga (1-based) come visto dall'utente nel foglio |
| `connector_label` | String | connettore usato (ref logico a `user_tokens.label`) |
| `service` | enum `odoo` \| `jira` \| `linear` \| `asana` | backend |
| `excel_project` / `excel_task` | String | dati originali dell'Excel |
| `remote_project_id` / `remote_project_name` | String nullable | progetto sul sistema remoto |
| `remote_task_id` / `remote_task_name` | String nullable | task sul sistema remoto |
| `hours` | float | ore rendicontate |
| `status` | enum `success` \| `failed` | esito della singola riga sul connettore |
| `error_message` | String nullable | valorizzato per le righe fallite |
| `created_at` / `updated_at` | timestamp | `TimestampMixin` |

Il "backend coinvolto" usato dai filtri di lista è derivabile dai `service`/`connector_label` delle `import_rows` (o denormalizzabile su `imports`, a scelta implementativa).

---

## STORY-E9a-1 — Modelli `imports` + `import_rows` + migrazione Alembic

- **Stato**: ⬜ Todo
- **Tipo**: Backend
- **Dipende da**: E3 (`users`)

**Obiettivo**: esistono le tabelle che memorizzano l'header di un'importazione e il dettaglio per riga, base di lista e dettaglio dei log.

**Criteri di accettazione**:
- `backend/app/models/import_log.py` (o `import_.py`): modello `Import(TimestampMixin, Base)` (`__tablename__ = "imports"`) e `ImportRow(TimestampMixin, Base)` (`__tablename__ = "import_rows"`) con i campi della tabella "Modello dati" sopra.
- Enum PostgreSQL nativi `import_status_enum` (`success|partial|failed`) e `import_row_status_enum` (`success|failed`), sul pattern di `user_tokens_service_enum` in `user_token.py`.
- Vincoli/naming (ADR-004): FK `fk_imports_employee_id_users`, `fk_imports_operator_id_users`, `fk_import_rows_import_id_imports` (`ondelete=CASCADE`); index `ix_imports_employee_id` e `ix_import_rows_import_id`.
- Export in `backend/app/models/__init__.py`.
- Migrazione `backend/alembic/versions/0007_create_imports_and_import_rows.py` con `upgrade()`/`downgrade()` implementati; enum creati a mano (ADR-004); nessuna distruzione dati.
- `backend/tests/unit/test_import_model.py`: creazione header + righe, cascade su delete import, cascade su delete utente.

---

## STORY-E9a-2 — Persistenza del log alla submit + `import_id` nella response

- **Stato**: ⬜ Todo
- **Tipo**: Backend
- **Dipende da**: STORY-E9a-1

**Obiettivo**: ogni importazione confermata viene registrata come log consultabile, senza cambiare il contratto di successo/errore già usato dal wizard.

**Criteri di accettazione**:
- In `backend/app/routers/imports.py`, `POST /api/me/imports` crea **una riga `imports`** (header) e **N righe `import_rows`** all'interno della stessa richiesta, oltre all'upsert esistente di `connector_row_mappings`.
- `employee_id = current_user.id`; `operator_id = NULL` (self-import; l'import per conto terzi è E8b). `period_start`/`period_end` derivati dalle date delle entries.
- Esito per riga derivato dall'`ImportResult` dell'adapter: una `(row, connector_label)` è `failed` se il suo `row_number` compare negli `errors` di quel connettore (con `error_message`), altrimenti `success`. `status` header: `success` se nessun errore, `failed` se nessuna riga riuscita, altrimenti `partial`. Conteggi coerenti.
- `ImportResponse` esteso con `import_id: UUID` (i `results` per-connettore restano invariati per non rompere il wizard E8a).
- Errori adapter (`AdapterAuthError`/`AdapterConnectionError`) continuano a mappare come oggi; decisione documentata su cosa persistere in caso di connettore irraggiungibile (log `failed` per le righe di quel connettore vs nessun log — scegliere e testare).
- `backend/tests/integration/test_imports_persist.py`: submit con esiti misti (`E2E__OK`/`E2E__FAIL`) → header con `status`/conteggi corretti e `import_rows` coerenti; `import_id` presente nella response; le `connector_row_mappings` restano aggiornate.

---

## STORY-E9a-3 — Endpoint lista + dettaglio log propri

- **Stato**: ⬜ Todo
- **Tipo**: Backend
- **Dipende da**: STORY-E9a-2

**Obiettivo**: l'Employee legge l'elenco delle proprie importazioni (filtrabile) e il dettaglio per riga con gli errori.

**Criteri di accettazione**:
- `GET /api/me/imports` → `200 [ImportLogSummary]` filtrato **sempre** su `employee_id == current_user.id` (mai log altrui — la vista di tutti i log è E9b); `require_role([employee, hr, admin])`.
- Filtri query opzionali: `period_from`/`period_to` (su `period_start`/`period_end`), `service` (backend), `status`; ordinamento `created_at` discendente.
- `GET /api/me/imports/{import_id}` → `200 ImportLogDetail` con header + `rows: ImportRow[]` (da `import_rows`), inclusi `error_message` delle righe fallite; `404` se l'import non esiste **o** non appartiene a `current_user` (stessa risposta nei due casi, nessun leakage cross-utente).
- Schemi Pydantic `ImportLogSummary` (`id`, `period_start`, `period_end`, `status`, `total_rows`, `success_rows`, `failed_rows`, `services`, `created_at`), `ImportRow`, `ImportLogDetail`.
- Aggiornare la tabella permessi in `docs/specs/005-tech-spec-rbac.md` con le due rotte.
- `backend/tests/integration/test_imports_read.py`: lista propria ordinata + ciascun filtro; log di altro utente assente dalla lista; dettaglio con righe miste; `404` inesistente; `404` import di altro utente.

---

## STORY-E9a-4 — Tipi TypeScript + hook dati (TanStack Query)

- **Stato**: ⬜ Todo
- **Tipo**: Frontend
- **Dipende da**: STORY-E9a-3

**Obiettivo**: il frontend dispone dei tipi e degli hook per leggere lista e dettaglio dei log e per raccogliere l'`import_id` dopo il submit.

**Criteri di accettazione**:
- Tipi (`frontend/src/lib/timesheet/types.ts` o nuovo `log/types.ts`): `ImportLogSummary`, `ImportLogDetail`, `ImportRow`, enum stato.
- `frontend/src/hooks/useImports.ts`: `useImports(filters)` (lista) e `useImportDetail(id)` (dettaglio) via `apiClient` + TanStack Query, sul pattern di `useConnectors.ts`; query key che include i filtri; stati loading/error.
- Estendere il tipo response di `useSubmitImport.ts` (e `ConnectorResult` in `frontend/src/types/index.ts`) con `import_id`, così la schermata risultato può linkare al log appena creato.
- Test unit (Testing Library + mock `apiClient`): fetch ok popola i dati; risposta di errore → stato error; cambio filtri → nuova query key.

---

## STORY-E9a-5 — LogPage: lista + filtri

- **Stato**: ⬜ Todo
- **Tipo**: Frontend
- **Dipende da**: STORY-E9a-4

**Obiettivo**: la pagina `/log` (oggi stub) mostra la tabella dei propri log con i filtri periodo/backend/esito.

**Criteri di accettazione**:
- Implementa `frontend/src/pages/LogPage.tsx` (attualmente solo header): tabella con colonne **data**, **backend**, **righe ok/fail**, **esito** (riuso `StatusBadge` da `frontend/src/components/ui/`), coerente con UX brief §3.4.
- Controlli filtro periodo (`period_from`/`period_to`), backend (`service`), esito (`status`) collegati a `useImports`.
- Stati gestiti: loading (skeleton/overlay), vuoto ("nessuna importazione"), errore; `data-testid` su tabella, righe e controlli filtro (mai selettori CSS/testo).
- Click su una riga naviga al dettaglio (rotta di STORY-E9a-6).
- Test unit: rendering lista da hook mockato; interazione filtro aggiorna i parametri; stato vuoto ed errore.

---

## STORY-E9a-6 — Dettaglio importazione + aggancio bottone "Log dettagliato"

- **Stato**: ⬜ Todo
- **Tipo**: Frontend
- **Dipende da**: STORY-E9a-4, STORY-E9a-5

**Obiettivo**: dalla lista e dalla schermata risultato del wizard l'Employee apre il dettaglio di un'importazione e vede gli errori per riga.

**Criteri di accettazione**:
- Vista dettaglio su rotta `/log/:id` (registrata in `frontend/src/App.tsx`) che usa `useImportDetail`: sezione metadati (periodo, esito, conteggi) + tabella `import_rows` con progetto/task (Excel e remoto), ore, stato e **messaggio d'errore** per le righe fallite.
- Collegare il bottone "Log dettagliato" già presente in `ImportPage.tsx` (`StepResult`, oggi `navigate('/log')`) a `navigate('/log/${import_id}')` usando l'`import_id` restituito dal submit (STORY-E9a-2/E9a-4).
- Stati loading/errore/`404` (import non proprio → messaggio "non trovato"); `data-testid` su contenitore dettaglio e righe.
- Test unit: rendering dettaglio con righe miste → messaggi d'errore visibili solo sulle righe fallite; navigazione lista→dettaglio; il bottone del wizard naviga con l'id corretto.

---

## STORY-E9a-7 — E2E: log consultabile + RBAC "solo i propri log"

- **Stato**: ⬜ Todo
- **Tipo**: E2E
- **Dipende da**: STORY-E9a-5, STORY-E9a-6

**Obiettivo**: gli scenari end-to-end del log Employee sono verdi in CI.

**Criteri di accettazione**:
- **Scenario #13** ([`004-e2e-test-plan.md`](../specs/004-e2e-test-plan.md)): un'importazione con una riga `E2E__FAIL` genera un log **immediatamente consultabile** (via bottone "Log dettagliato" e via `/log`); il dettaglio mostra il messaggio d'errore della riga fallita.
- **Scenario #15**: con `storageState` Employee, la lista dei log mostra **solo** i propri log (un log seedato per un altro utente non compare).
- Fixture/seed deterministici (marcatori `E2E__`); selettori `data-testid`; nessuna dipendenza da ordine di esecuzione.
- Verde in `npx playwright test` (smoke incluso nel gate di merge su `main`).

---

## STORY-E9a-8 — Documentazione (Definition of Done)

- **Stato**: ⬜ Todo
- **Tipo**: Documentazione
- **Dipende da**: STORY-E9a-3, STORY-E9a-6

**Obiettivo**: la documentazione funzionale e utente riflette la persistenza e la vista log dell'Employee.

**Criteri di accettazione**:
- Guida utente `docs/guides/log-importazioni.md` (ruolo Employee): come consultare lo storico, leggere gli esiti e il dettaglio errori.
- Documentare il modello `imports`/`import_rows` e la scrittura alla submit dove risiede la doc permanente del dominio import (spec dedicata o §del functional spec); aggiornare `docs/specs/001-functional-spec.md` (§log) e `docs/specs/003-timesheet-hub-ux-brief.md` §3.4 se emergono scostamenti.
- Confermare/aggiornare la tabella permessi in `docs/specs/005-tech-spec-rbac.md` con `GET /api/me/imports` e `GET /api/me/imports/{id}`.
- Annotare in roadmap la riconciliazione: la persistenza del log (`imports`/`import_rows`), assegnata a E8a in v0.5, è stata realizzata in E9a.

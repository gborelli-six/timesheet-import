# E8a — Flusso di importazione (Employee): dettaglio storie

> Epica del wizard self-import dell'Employee (step 1–4, nessuno Step 0): upload → preview → **assegnazione connettori per riga** → submit → risultato. `POST /imports` sul proprio utente. Dipende da E5 (connettori), E6 (parsing/`TimesheetEntry`), E7 (adapter Odoo + autocomplete progetti/task). Possiede la tabella `imports` e la tabella `connector_row_mappings` (memoria suggerimenti).
>
> **Nota sugli ID**: gli ID `STORY-E8a-N` sono provvisori; assegnare i numeri definitivi all'inserimento in sprint.
>
> **Scope di questo file**: sono dettagliate qui le storie introdotte dal requisito **assegnazione multi-connettore per riga + suggerimenti da storico** (spec [`007-multi-connector-row-mapping.md`](../specs/007-multi-connector-row-mapping.md)). Le restanti storie del wizard (orchestrazione step, `imports`, schermata risultato, log) si dettagliano just-in-time all'inserimento in sprint, come da convenzione del [README](README.md).

---

## STORY-E8a-1 — Tabella `connector_row_mappings` + migrazione Alembic

- **Stato**: ⬜ Todo
- **Tipo**: Backend
- **Dipende da**: E3 (`users`), E5 (`user_tokens`)

**Obiettivo**: esiste la tabella che memorizza, per utente, l'associazione tra la coppia (progetto, task) Excel e il connettore + progetto + task remoto, base dei suggerimenti.

**Criteri di accettazione**:
- `backend/app/models/connector_row_mapping.py`: modello `ConnectorRowMapping(TimestampMixin, Base)` con i campi di §2 della spec 007 (`user_id` FK CASCADE, `excel_project`, `excel_task`, `connector_label`, `remote_project_id/name`, `remote_task_id/name`, `last_used_at`).
- Vincoli con naming convention (ADR-004): `UniqueConstraint(user_id, excel_project, excel_task, connector_label)` → `uq_connector_row_mappings_user_project_task_connector`; index `ix_connector_row_mappings_user_project_task` su `(user_id, excel_project, excel_task)`; FK `fk_connector_row_mappings_user_id_users`.
- Export in `backend/app/models/__init__.py`.
- Migrazione `backend/alembic/versions/NNNN_create_connector_row_mappings.py` con `upgrade()` e `downgrade()` implementati; nessuna distruzione dati.
- `backend/tests/unit/test_connector_row_mapping_model.py`: creazione, vincolo unique, cascade su delete utente.

---

## STORY-E8a-2 — Endpoint autocomplete progetti/task (live adapter)

- **Stato**: ⬜ Todo
- **Tipo**: Backend
- **Dipende da**: E7 (interfaccia adapter con `getProjects`/`getTasks`), E5 (`user_tokens`)

**Obiettivo**: il frontend può interrogare in tempo reale progetti e task di un connettore dell'utente per popolare gli autocomplete.

**Criteri di accettazione**:
- `GET /api/adapters/{label}/projects?query=` → `200 [{ id, name }]`; risolve il connettore via `(current_user.id, label)` su `user_tokens`, istanzia l'adapter (E7) e delega a `getProjects(query)`.
- `GET /api/adapters/{label}/projects/{projectId}/tasks?query=` → `200 [{ id, name }]`; delega a `getTasks(projectId, query)`.
- RBAC: 404 se la `label` non appartiene all'utente corrente; mai accesso ai connettori altrui.
- Mapping errori adapter coerente con E7: connettore `needs_reauth`/credenziali scadute → 409/422 con codice; sistema remoto irraggiungibile → 502/504.
- `backend/tests/integration/test_adapter_autocomplete.py`: caso ok (stub `E2E__OK`), connettore inesistente (404), connettore di altro utente (404), backend down (`E2E__DOWN` → 5xx).

---

## STORY-E8a-3 — Endpoint suggerimenti + persistenza mappature alla submit

- **Stato**: ⬜ Todo
- **Tipo**: Backend
- **Dipende da**: STORY-E8a-1

**Obiettivo**: il sistema propone le associazioni dallo storico e le aggiorna a ogni importazione.

**Criteri di accettazione**:
- `POST /api/me/mapping-suggestions` body `{ rows: [{ excelProject, excelTask }] }` → `200 { suggestions: ConnectorAssignment[][] }` allineato per indice alle `rows`; tutte le assegnazioni con `suggested: true`.
- Lookup per `(user_id, normalize(excel_project), normalize(excel_task))`; normalizzazione chiavi come da §2 (trim + collasso spazi + lowercase), applicata identica in lettura e scrittura.
- Filtro: scarta mappature il cui `connector_label` non è più tra i connettori configurati dell'utente (§3).
- Alla submit (`POST /imports`): per ogni `ConnectorAssignment` inviata, **upsert** su `connector_row_mappings` (chiave unique) con aggiornamento di `remote_*` e `last_used_at`. Le associazioni rimosse dall'utente non vengono cancellate dallo storico.
- `backend/tests/integration/test_mapping_suggestions.py`: nessun match → liste vuote; match dopo una prima submit → suggerimento corretto; connettore eliminato → suggerimento filtrato; coppia con normalizzazione (spazi/maiuscole) → match.

---

## STORY-E8a-4 — Modal assegnazione connettori per riga (multi-connettore + autocomplete)

- **Stato**: ⬜ Todo
- **Tipo**: Frontend
- **Dipende da**: STORY-E6-4 (PreviewTable), STORY-E8a-2

**Obiettivo**: dalla preview l'utente assegna a ciascuna riga uno o più connettori e, per ognuno, progetto e task remoto tramite autocomplete live.

**Criteri di accettazione**:
- Componente modal/pannello richiamabile dalla colonna "Connettori assegnati" della `PreviewTable`; opera su una `TimesheetEntry` e ne aggiorna `connectorAssignments`.
- Aggiunta/rimozione di più connettori per la stessa riga (multi-connettore, anche più istanze dello stesso servizio con label diverse).
- Per ogni connettore: `Autocomplete` MUI progetto (chiamate a `GET /api/adapters/{label}/projects?query=` con debounce, stati loading/empty/error via TanStack Query) e `Autocomplete` task (`.../projects/{projectId}/tasks?query=`, disabilitato finché il progetto non è scelto).
- Una riga senza connettori è ammessa (non verrà importata) ed è evidenziata visivamente.
- Test unit (Testing Library): aggiunta connettore + selezione progetto/task aggiorna lo stato; rimozione connettore; task disabilitato senza progetto.

---

## STORY-E8a-5 — Integrazione suggerimenti pre-popolati e indicatore "Suggerito"

- **Stato**: ⬜ Todo
- **Tipo**: Frontend
- **Dipende da**: STORY-E8a-3, STORY-E8a-4

**Obiettivo**: alla transizione verso lo step di assegnazione le righe risultano già pre-compilate con i suggerimenti dello storico, sempre modificabili.

**Criteri di accettazione**:
- All'ingresso nello step di assegnazione, batch `POST /api/me/mapping-suggestions` con le coppie (progetto, task) delle righe; le `connectorAssignments` con `suggested: true` popolano le righe.
- Chip "Suggerito" visibile nella colonna della `PreviewTable` e nel modal; modificando o confermando un'assegnazione `suggested` passa a `false`.
- L'utente può rimuovere/cambiare/aggiungere assegnazioni suggerite prima del submit.
- Prima importazione (storico vuoto) → nessun suggerimento, nessun errore.
- Test unit: rendering con suggerimenti → chip "Suggerito"; modifica → chip rimosso.

---

## STORY-E8a-6 — E2E: la seconda importazione suggerisce le associazioni

- **Stato**: ⬜ Todo
- **Tipo**: E2E
- **Dipende da**: STORY-E8a-3, STORY-E8a-5

**Obiettivo**: lo scenario end-to-end "memoria delle associazioni" è verde in CI.

**Criteri di accettazione**:
- Fixture Excel con righe deterministiche (marcatori `E2E__OK` ecc.) e storageState Employee.
- Prima importazione: l'utente assegna manualmente una riga a un connettore con progetto/task; submit con esito `E2E__OK`; la mappatura è persistita.
- Seconda importazione dello stesso file: la riga risulta **pre-assegnata** (chip "Suggerito") con il connettore/progetto/task della volta precedente, senza intervento manuale.
- Lo stub adapter (E7) espone progetti/task deterministici per gli autocomplete.
- Scenario verde in `npx playwright test`.

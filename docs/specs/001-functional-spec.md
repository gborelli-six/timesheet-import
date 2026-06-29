# Timesheet Hub — Specifiche funzionali

| Campo | Valore |
|---|---|
| Versione | 0.1 |
| Data | 2026-05-28 |
| Stato | Bozza |

---

## Scopo

Timesheet Hub è uno strumento interno per centralizzare l'importazione mensile dei timesheet dei dipendenti su più sistemi di rendicontazione eterogenei. Elimina la necessità di inserire manualmente gli stessi dati su piattaforme diverse, riducendo il tempo speso e gli errori di trascrizione.

---

## Attori

| Attore | Descrizione |
|---|---|
| **Dipendente** | Carica il proprio timesheet Excel e seleziona i backend su cui importare |
| **HR Manager** | Carica il timesheet per conto di qualsiasi dipendente; ha visibilità su tutti i log |
| **Admin** | Configura i backend attivi, gestisce gli utenti e i ruoli, inserisce le credenziali di sistema |

---

## Caso d'uso 1 — Il dipendente importa il proprio timesheet

1. Il dipendente accede all'applicazione tramite il proprio account Google aziendale (`@sixfeetup.it`).
2. Carica il proprio file Excel seguendo il template aziendale standard.
3. L'applicazione mostra un'anteprima dei dati parsati: dipendente, periodo, righe per progetto e task con le ore.
4. Il dipendente verifica la correttezza dei dati e seleziona su quali backend importare (es. solo Jira, o Jira + Odoo).
5. Conferma l'importazione.
6. L'applicazione invia i dati ai backend selezionati tramite i rispettivi adapter.
7. Viene mostrato il risultato per ciascun backend: successo, errori parziali o fallimento.
8. Il log dell'importazione viene salvato e consultabile in seguito.

---

## Caso d'uso 2 — L'HR Manager importa per conto di un dipendente

1. L'HR Manager accede con il proprio account Google aziendale.
2. Seleziona il dipendente per cui sta operando.
3. Carica il file Excel del dipendente.
4. Segue gli stessi passi 3–8 del caso d'uso 1.
5. Il log registra sia il dipendente di riferimento sia l'HR che ha effettuato l'operazione.

---

## Il timesheet Excel

Il file Excel è un template **standard aziendale**, uguale per tutti i dipendenti. Contiene:

- Identificativo del dipendente (nome, email o matricola)
- Periodo di riferimento (mese/anno)
- Righe con: progetto, task, ore giornaliere o totali per il periodo

Il mapping tra le colonne del file Excel e i campi interni è **configurabile** dal pannello HR, per adattarsi a eventuali variazioni future del template senza modificare il codice.

---

## Backend supportati

L'applicazione supporta l'importazione su più sistemi, configurabili indipendentemente per ciascun progetto:

| Backend | Tipo | Note |
|---|---|---|
| **Jira** | Cliente / interno | Worklogs su issue tramite REST API v3 |
| **Odoo** | Interno | Timesheet module tramite JSON-RPC |
| **Linear** | Cliente | Time tracking tramite GraphQL API |
| **Asana** | Cliente | Time entries tramite REST API |

Ogni backend è **opzionale e indipendente**: un'importazione può coinvolgere uno o più backend contemporaneamente. L'aggiunta di nuovi backend non richiede modifiche ai componenti esistenti.

---

## Pannello di controllo (Admin)

L'admin può configurare:

- **Backend attivi per progetto**: quale adapter usare per ciascun progetto/cliente.
- **Credenziali di sistema**: token e URL dei backend (cifrati, mai visibili in chiaro dopo l'inserimento).
- **Utenti e ruoli**: assegnazione dei ruoli `employee`, `hr`, `admin` agli utenti che hanno effettuato almeno un accesso.
- **Mapping colonne Excel**: associazione tra colonne del template e campi interni.

---

## Gestione dei connettori per-utente

> Dettaglio decisioni implementative in [`ADR-005`](../adr/ADR-005-connector-credentials-security.md).

Ciascun dipendente configura nel proprio profilo le credenziali dei connettori per i backend che utilizza. Ogni connettore è identificato da una **label** (nome assegnato dall'utente, es. "Jira Azienda") e ha:

- **`account_identifier`** — username, email o ID account del servizio esterno; visibile in chiaro nella UI dopo il salvataggio.
- **`secret`** — token API o password; **write-only**: non viene mai restituito né visualizzato dopo l'inserimento, solo sostituibile.
- **`base_url`** — URL base per istanze self-hosted (es. Odoo on-premise); opzionale.

Il segreto è cifrato con AES-256-GCM prima della scrittura in DB; più connettori dello stesso servizio (es. due istanze Jira diverse) sono supportati con label distinte.

Se un segreto risulta scaduto o non valido al momento dell'importazione, il connettore viene marcato "da aggiornare" e il dipendente viene notificato di sostituire la credenziale.

---

## Log delle importazioni

Ogni importazione genera un record di log contenente:

- Dipendente di riferimento
- Utente che ha effettuato l'operazione (può essere diverso se è HR)
- Data e ora
- Backend coinvolti
- Numero di righe processate / importate con successo / fallite
- Eventuali messaggi di errore per righe fallite

I log sono consultabili:

- Dal **dipendente**: solo i propri.
- Dall'**HR Manager**: tutti.
- Dall'**Admin**: tutti, con filtri per utente, periodo e backend.

---

## Frequenza d'uso attesa

L'importazione avviene tipicamente **una volta al mese** per dipendente, a chiusura del periodo di rendicontazione. Il sistema non è progettato per importazioni in tempo reale o ad alta frequenza.

---

## Requisiti non funzionali

| Requisito | Valore atteso |
|---|---|
| Accesso | Solo da rete aziendale o VPN (configurabile a livello infrastrutturale) |
| Autenticazione | Google OAuth, solo dominio `@sixfeetup.it` |
| Sessione | Durata 8 ore, corrispondente alla giornata lavorativa |
| Disponibilità | Best effort — strumento interno, downtime brevi tollerati |
| Costo operativo | Minimizzato — infrastruttura cloud a consumo (~10-15 €/mese) |

---

## Fuori scope (v1)

- Creazione o modifica del timesheet direttamente nell'applicazione (si importa sempre da Excel).
- Sincronizzazione bidirezionale: il flusso è solo in scrittura verso i backend.
- Notifiche automatiche di reminder per la scadenza mensile.
- Supporto multi-azienda.
- App mobile nativa.

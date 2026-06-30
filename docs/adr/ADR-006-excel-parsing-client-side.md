# ADR-006 — Parsing Excel client-side con ExcelJS

**Stato**: Accepted  
**Data**: 2026-06-30  
**Deciso da**: Giorgio Borelli

---

## Contesto

L'epica E6 richiede di leggere file Excel (`.xlsx`) caricati dall'utente e trasformarli in `TimesheetEntry[]` prima di inviarli al backend. Il parsing deve avvenire *prima* della sottomissione definitiva, per mostrare la preview con i warning (Step 2 del wizard E8a). Questo rende il parsing un'operazione client-side per design.

Sono state valutate tre alternative:

| Alternativa | Pro | Contro |
|---|---|---|
| **SheetJS CE (`xlsx`)** | Matura, API semplice, bundle leggero | Abbandonata: le security fix vanno alla versione Pro a pagamento. Vulnerabilità note non risolte (prototype pollution, ReDoS, OOB read). |
| **ExcelJS** | Attivamente manutenuta, zero vulnerabilità critiche note, API asincrona moderna | Bundle leggermente più grande (~700 KB minificato); richiede build browser-specific. |
| **Parsing lato server** | Usa `openpyxl` (Python), massima sicurezza | **Escluso**: accoppia l'upload al parsing e rompe il flusso "preview → conferma → submit" di E8a. Il file non deve raggiungere il server finché l'utente non approva le righe normalizzate. |

---

## Decisione

Si usa **ExcelJS** per il parsing client-side dei file Excel.

Il parsing lato server è **esplicitamente escluso** dall'architettura di Timesheet Hub: la preview con warning (Step 2 wizard) deve avvenire interamente nel browser, prima che qualsiasi dato raggiunga il backend. Separare upload e submit è un requisito funzionale, non una preferenza tecnica.

SheetJS CE è scartata per ragioni di sicurezza: il progetto è un'app interna con utenti autenticati, ma adottare consapevolmente una libreria con vulnerabilità irrisolte dal maintainer è una scelta che non scalerà alla revisione di sicurezza.

---

## Conseguenze

- `exceljs` è una dipendenza di produzione del frontend.
- Il componente `FileUpload` usa l'API asincrona di ExcelJS (`workbook.xlsx.load(arrayBuffer)`) invece del callback `FileReader`.
- ExcelJS legge solo il formato OOXML `.xlsx`, non il formato binario legacy `.xls`: l'upload accetta perciò esclusivamente `.xlsx`.
- Il bundle frontend aumenta di ~300 KB gzippati rispetto a `xlsx`. Accettabile per un'app interna su rete aziendale.
- Eventuali future esigenze di parsing server-side (es. importazione batch da script) useranno `openpyxl` (Python), separata da questa decisione.

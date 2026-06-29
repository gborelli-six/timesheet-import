# Configurare i connettori

I connettori collegano il tuo profilo Timesheet Hub ai backend esterni (Jira, Odoo, Linear, Asana) su cui vengono importati i timesheet. Prima di poter avviare un'importazione devi configurare almeno un connettore per il servizio che utilizzi.

---

## Cos'è un connettore

Un connettore è composto da:

| Campo | Descrizione |
|---|---|
| **Servizio** | Il backend esterno: Jira, Odoo, Linear o Asana |
| **Label** | Un nome leggibile che assegni tu (es. "Jira Azienda", "Odoo Interno") |
| **Identificativo account** | Il tuo username, email o ID sull'altro sistema |
| **Segreto** | Il tuo API token o password — write-only, mai visualizzato dopo il salvataggio |
| **URL base** | L'URL dell'istanza (solo per servizi self-hosted come Odoo on-premise) |

Puoi avere più connettori per lo stesso servizio con label diverse — utile se lavori su due istanze Jira distinte.

---

## Accedere alla schermata profilo

Clicca sull'icona **Profilo** nel menu laterale. La schermata mostra i tuoi dati utente e la lista dei connettori già configurati.

---

## Aggiungere un connettore

1. Clicca sul bottone **Aggiungi connettore** in fondo alla lista.
2. Nel drawer che si apre, seleziona il **tipo di servizio** dal menu a tendina.
3. Inserisci una **label** (obbligatoria, deve essere unica tra i tuoi connettori).
4. Inserisci il tuo **identificativo account** (username, email o ID sul servizio esterno).
5. Inserisci il **segreto** (API token o password).
6. Se il servizio è self-hosted (es. Odoo), inserisci anche l'**URL base** dell'istanza.
7. Clicca **Salva**.

Il connettore appare in lista con il badge **Configurato**.

---

## Modificare un connettore

1. Clicca sulla riga del connettore per espanderla.
2. Aggiorna i campi che vuoi modificare.
3. Il campo **Segreto** mostra `•••• già configurato` se un segreto è già presente: lascialo vuoto per non modificarlo, oppure digita il nuovo valore per sostituirlo.
4. Clicca **Salva**.

La label è assegnata alla creazione e non è modificabile (serve come chiave identificativa).

---

## Eliminare un connettore

1. Espandi la riga del connettore.
2. Clicca **Elimina**.
3. Conferma l'operazione nella finestra di dialogo.

L'eliminazione è permanente.

---

## Stato del connettore

| Stato | Significato |
|---|---|
| **Configurato** | Credenziali presenti e valide |
| **Da aggiornare** | Il servizio esterno ha rifiutato le credenziali (errore 401); è necessario reinserire il segreto |

Se compare il banner **"Da aggiornare"**, espandi il connettore, inserisci il nuovo segreto e salva.

---

## Sicurezza

- Il segreto non viene mai restituito né visualizzato dopo il salvataggio — è cifrato nel database con AES-256-GCM.
- L'identificativo account (`account_identifier`) è visibile in chiaro nella UI; non inserirvi dati sensibili.
- Il segreto viene decifrato in memoria solo al momento dell'importazione e immediatamente scartato.

Per i dettagli tecnici vedi [`ADR-005`](../adr/ADR-005-connector-credentials-security.md).

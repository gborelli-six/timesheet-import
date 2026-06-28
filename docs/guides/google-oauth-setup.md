# Configurazione Google OAuth — Timesheet Hub

> Guida per sviluppatori e amministratori di sistema. Descrive i passi necessari per configurare l'applicazione OAuth su Google Cloud Console e le variabili d'ambiente richieste.

---

## 1. Google Cloud Console

### Progetto GCP

Crea (o riutilizza) un progetto GCP dedicato chiamato **"Timesheet Hub"** su [console.cloud.google.com](https://console.cloud.google.com).

### OAuth Consent Screen

Percorso: **APIs & Services → OAuth consent screen**

| Campo | Valore | Note |
|---|---|---|
| User Type | **Internal** | Limita l'accesso al solo Workspace `sixfeetup.it`; nessuna verifica Google richiesta |
| App name | Timesheet Hub | |
| User support email | team IT | |
| Authorized domains | `sixfeetup.it` | |
| Scopes | `openid`, `email`, `profile` | Nessuno scope aggiuntivo necessario |

Con **Internal**, solo gli utenti `@sixfeetup.it` del Google Workspace vedono la consent screen. Il warning "app non verificata" non appare.

### Credenziali OAuth 2.0

Percorso: **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**

| Campo | Produzione | Sviluppo locale |
|---|---|---|
| Application type | Web application | Web application |
| Authorized JavaScript origins | `https://6feetup-timesheet.up.railway.app` | `http://localhost:5173` |
| Authorized redirect URIs | `https://6feetup-timesheet.up.railway.app/auth/callback` | `http://localhost:5173/auth/callback` |

Annota **Client ID** e **Client Secret** — servono al passo successivo. Non aggiungerli mai al repository.

---

## 2. Variabili d'ambiente

### Sviluppo locale

Crea un file `.env` nella root del progetto (già nel `.gitignore`):

```bash
GOOGLE_CLIENT_ID=<Client ID da Google Cloud Console>
GOOGLE_CLIENT_SECRET=<Client Secret da Google Cloud Console>
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
JWT_SECRET=$(openssl rand -hex 32)
TOKEN_ENCRYPT_KEY=$(openssl rand -hex 32)
```

### Railway (staging / production)

Imposta le variabili in **Railway → Service → Variables** per ogni environment:

| Variabile | Valore |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID da Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Client Secret da Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://6feetup-timesheet.up.railway.app/auth/callback` |
| `JWT_SECRET` | Stringa hex 256-bit (`openssl rand -hex 32`) |
| `TOKEN_ENCRYPT_KEY` | Stringa hex 256-bit (`openssl rand -hex 32`) |

`JWT_SECRET` e `TOKEN_ENCRYPT_KEY` vanno generati una volta per environment e non condivisi tra staging e production.

---

## 3. Stato attuale del codice

| Layer | Stato | Storie |
|---|---|---|
| Backend (`/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`, `/api/me`) | ✅ Implementato (E3) | STORY-017…020 |
| Frontend (`LoginPage`, `CallbackPage`, `useAuth`, `AuthGuard`, `apiClient`) | ⬜ Da implementare | STORY-022 |

Il flusso completo è documentato in [`docs/specs/002-tech-spec-auth-google.md`](../specs/002-tech-spec-auth-google.md).

---

## 4. Note

- **Nessuna API aggiuntiva da abilitare.** Le claim necessarie (`email`, `name`, `hd`) sono incluse nell'`id_token` standard senza dover chiamare la Google People API.
- **Vincolo di dominio a doppio livello:** il parametro `hd=sixfeetup.it` nella richiesta a Google è un controllo UX; la verifica di sicurezza reale avviene lato backend sulla claim `hd` dell'`id_token` decodificato. Entrambi sono necessari.
- **Rotazione del Client Secret:** ogni 12 mesi (o in caso di compromissione), genera un nuovo secret in Cloud Console, aggiornalo su Railway e rideploya il backend. Il `GOOGLE_CLIENT_ID` non cambia.

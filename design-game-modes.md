# CATASTROPHE INC.: progettazione delle modalità di gioco

Documento di progettazione per i quattro task di backlog (dashboard, campagna, 1vs1, sfida del giorno) e per i temi emersi in riunione (survival, gamification, monetizzazione, motore generatore + validatore).

Non contiene codice di implementazione. Ogni affermazione sullo stato attuale cita `file:riga` (percorsi relativi ad `app/`, salvo dove indicato). Quello che la riunione non ha deciso sta nella sezione 10 come domanda aperta, con una raccomandazione.

---

## 1. Stato attuale

### 1.1 Cosa c'è già

| Tema | Cosa esiste | Dove |
|---|---|---|
| **Daily** | Un "giorno" condiviso da tutti: `dayNumber()` conta i giorni UTC da `DAY_EPOCH` (15 aprile 2026); `daySeed(day) = day + 11` | `src/domain/calendar.ts:2-13` |
| | Il giorno viene fissato una volta al mount della sessione; i 7 livelli si generano da quel seed | `src/game/useGameSession.ts:25-26` |
| | I 7 livelli si generano uno per volta, con timer sfalsati di 40 ms, partendo appena `Shell` monta | `src/game/hooks/useLevels.ts:7-26` |
| **Siti** | 7 nomi fissi; `SITE_COUNT` e `LAST_SITE` derivano da lì | `src/domain/sites.ts:2-10` |
| | Rampa per sito: n nodi e stelle target (4/1, 7/1, 10/2, 14/2, 18/3, 24/3, 30/3) | `src/domain/engine.ts:315-318` |
| **Scoring** | `stars*10 - 5*(used-par)`, con minimo 0; voto S/A/B/C/D; keep-best | `src/domain/scoring.ts:6-39` |
| | Mirror SQL: colonna generata `score` | `sql/2026-09-07-weighted-score.sql:28-31` |
| | Il trigger keep-best tiene il `cats_used` migliore | `sql/2026-09-07-site-clears-keep-best.sql:19-33` |
| | Massimo un gatto oltre il par; il secondo viene rifiutato ("PAYROLL SAYS NO") | `src/game/constants.ts:36`, `src/game/state/gameReducer.ts:66-68` |
| **Salvataggio** | Upsert su `site_clears` con chiave `(user_id, day_number, site_index)`, solo se si è autenticati; il client dichiara da sé `cats_used` | `src/services/repositories/siteClears.ts:8-16`, `src/game/GameScreen.tsx:91-99` |
| **Leaderboard** | Viste `leaderboard_alltime` e `leaderboard_weekly` (finestra mobile di 7 giorni su `created_at`) e `player_scores` | `sql/2026-09-08-merge-nickname-username.sql:35-65` |
| | Repository: top 20, board filtrata per id | `src/services/repositories/leaderboards.ts:6-39` |
| **"1vs1" già presente** | Solo un confronto asincrono di punteggi aggregati (settimana e all-time) tra due profili. Non c'è un match | `src/screens/Crew/HeadToHead.tsx:8-13`, `src/screens/Crew/versus.ts:6-17` |
| **Generatore** | Composizione di gadget (spur, hub, path3/4/5, crown, ring4/6) | `src/domain/engine.ts:77-97` |
| | Crescita e densificazione per il livello 3 | `src/domain/engine.ts:224-248` |
| | Riparazione dei pareggi aggiungendo spur | `src/domain/engine.ts:262-282` |
| **Solver** | Branch-and-bound esatto: restituisce `k`, `count` (numero di coperture ottime), `sol`, `alt` e `visits`; si interrompe oltre 600.000 visite | `src/domain/engine.ts:135-173` |
| **Misura di difficoltà** | `difficulty()`: 1 stella se basta la regola della foglia, 2 se servono foglia + fold di grado 2 (triangolo compreso), altrimenti 3 | `src/domain/engine.ts:175-215` |
| **Validatore implicito** | `makeLevel` accetta un livello solo se: soluzione ottima unica (`count === 1`), stelle uguali al target, n nella finestra `[target(-1), target+2]`, filtro opzionale `accept: LevelFilter` | `src/domain/engine.ts:296-302`, `src/domain/types.ts:23` |
| | In mancanza d'altro c'è un fallback "più vicino" (`_score`) | `src/domain/engine.ts:303-304, 312` |
| | Oltre a quello, un ultimo ripiego a 1 stella con cast `as Level`: se anche quello fallisce, restituisce `null` mascherato | `src/domain/engine.ts:329` |
| **Hint** | SURVEY (foglia), ESTIMATE (matching, cioè lower bound), INSIDER (rivela un nodo della soluzione) | `src/game/state/hints.ts:7-25`, `src/domain/engine.ts:336-354` |
| **Determinismo** | Snapshot dei seed 12, 40 e 97, con `Date.now` congelato | `src/domain/determinism.test.ts:16-34` |
| | In produzione il budget usa l'orologio reale | `src/domain/engine.ts:285-288` |
| **Sprite gatti** | 6 razze × 3 pose su canvas 192×192, baseline 182 | `src/assets/cats/index.ts:29-40` |
| | La razza di ogni nodo è deterministica: `(i*5 + siteIdx*2) % 6` | `src/game/scene/buildScene.ts:74-75` |
| | Flip-book a due frame | `src/sprites/CatFlipbook.tsx:5-18` |
| **Routing** | `type Screen = 'workOrder' \| 'game' \| 'account'`; lo schermo iniziale è `workOrder` | `src/app/App.tsx:14, 21` |
| **Persistenza locale** | Solo `sessionStorage` per l'orientamento | `src/app/useOrientation.ts:7-10` |
| | CLAUDE.md vieta nuova persistenza senza approvazione | CLAUDE.md, sezione Layout |
| **Supabase / sicurezza** | RLS spento in tutto il progetto: il controllo d'accesso passa solo dai GRANT | `sql/2026-09-08-crew-squads.sql:8-12` |
| | Problemi noti: chiunque sia autenticato può scrivere su righe altrui | `sql/2026-09-07-profiles-email-privacy.sql:15-19` |

### 1.2 Lacune rilevanti per le nuove modalità

1. **Il gioco è cablato su "7 siti del giorno".**
   - `GameState.results` ha dimensione `SITE_COUNT` (`gameReducer.ts:46`) e `go` accetta solo `isSiteIndex` (`gameReducer.ts:95`).
   - `banner`/`pips` usano `SITE_COUNT`/`LAST_SITE` (`selectors.ts:33-60`).
   - `GameScreen` legge `SITES[idx]` e `shareText(day, …)` (`GameScreen.tsx:136-137`).
   - `useGameSession` è il giorno (`useGameSession.ts:25-26`).
   - Per riusare la board in campagna e 1vs1 serve un refactor di parametrizzazione (task T0, sezione 9).
2. **I livelli del giorno si generano sempre**, anche se l'utente andrà in campagna, perché `useGameSession` vive in `Shell` (`App.tsx:20`).
3. **Il determinismo dipende dall'orologio.** `makeLevel` interrompe la ricerca su `Date.now()` (`engine.ts:285-288`), quindi due dispositivi possono generare puzzle diversi per lo stesso seed. Lo ammette anche il commento in `determinism.test.ts:10-15`. È tollerabile per il daily asincrono, **inaccettabile per un 1vs1** in cui i due giocatori devono avere lo stesso grafo.
4. **Lo score è dichiarato dal client** (`siteClears.ts:11-14`) e il server non verifica la copertura. Va bene per una leaderboard amichevole, non per un match competitivo o per assegnare premi con valore.
5. **Lo schema base non è nel repo.** `site_clears` e `profiles` vengono da `design_handoff_account_leaderboard/supabase-schema.sql`, citato in `sql/2026-09-07-weighted-score.sql:3` ma assente: le migrazioni in `app/sql/` sono solo delta.
6. **Copy incoerente.** La UI parla di "settimana" ("7 SITES · ONE WORKING WEEK", `WorkOrderScreen.tsx:59`; "weekly invoice", `invoice.ts:4`), ma il set di livelli cambia ogni giorno.

---

## 2. Motore: generatore + validatore esplicito

### 2.1 Obiettivo

Rendere esplicito e riusabile ciò che oggi è implicito in `makeLevel` (unicità + stelle + taglia). Si aggiungono metriche che distinguono un livello "troppo semplice" o "troppo complicato" a parità di stelle, così da avere una curva fine per la campagna (decine di livelli) e lasciare il daily invariato.

### 2.2 Metriche candidate

Tutte pure e calcolabili da `Level` più gli output esistenti di `solve` e `reduce`.

| Metrica | Come si calcola | Cosa intercetta |
|---|---|---|
| `n`, `m`, `k` | dal `Level` | taglia; `k/n` misura la densità della soluzione |
| `stars` | `difficulty()` (`engine.ts:211`) | tecnica minima richiesta |
| `visits` | `SolveResult.visits` (`engine.ts:11, 150`) | durezza della ricerca. Proxy grezzo, dipende dall'ordine per grado (`engine.ts:138`) |
| `matchingGap` | `k - hintMatching(lv).length` (`engine.ts:344`) | se è 0, ESTIMATE rivela già il numero esatto: livello più facile del previsto |
| `forcedOpening` | numero di foglie iniziali (`adj[i].length === 1`) | quante mosse "gratis" ci sono all'inizio. Troppe significa banale |
| `reductionTrace` | strumentare `reduce()` (`engine.ts:181-210`) per contare passi foglia/triangolo/fold e quanto resta dopo le regole | profondità di deduzione; il residuo indica un branch "vero" |
| `deg3`, `components` | dal grafo | leggibilità e varietà |
| `footprint` | bounding box del lattice | quanto scorrimento serve alla camera (CLAUDE.md, "camera") |

### 2.3 Dove vive

- `src/domain/levelMetrics.ts`, nuovo e puro, con test. `measure(lv): LevelMetrics`. Per `reductionTrace` serve esporre da `engine.ts` una variante di `reduce` che restituisca i conteggi senza cambiare `difficulty()`.
- `src/domain/validator.ts`, nuovo e puro. `DifficultyProfile` (range per metrica) e `validate(metrics, profile): { ok, reasons[] }`. Le soglie stanno in **un'unica tabella di profili**, coerente con la regola DRY ("one source for every constant").
- Aggancio: `makeLevel` accetta già un `LevelFilter` (`engine.ts:284, 300`), e il validatore si passa da lì. **Non serve cambiare la firma.**
- Il tipo `LevelMetrics` va in `domain/types.ts`.

### 2.4 Non cambiare i puzzle esistenti

Fatto chiave: in `makeLevel` qualsiasi rifiuto consuma RNG e cambia l'esito. Il ramo `!okShape → break` (`engine.ts:302`) fa partire un altro tentativo con lo stesso `rng`. Basta quindi un filtro diverso su un giorno esistente per cambiarne il puzzle e rompere gli snapshot (`determinism.test.ts:29-34`).

Proposta:

1. **Daily, fase 1: solo osservazione.** `makeLevelForDay`/`makeDay` restano byte-identici. Le metriche si calcolano *dopo*, su livelli già generati, per telemetria e test. Gli snapshot non cambiano.
2. **Calibrazione offline.** Uno script in `app/tools/` (stesso pattern di `prep-rooms.py`/`prep-sfx.py`, ma in TS e Vitest-free) genera i giorni 1..N con l'orologio congelato e registra la distribuzione delle metriche per indice di sito. Le soglie dei profili si fissano su quei percentili, non a sentimento.
3. **Campagna.** Usa il validatore come `accept` fin dal primo giorno. Non ha storico da preservare.
4. **Daily, fase 2: opzionale, decisione esplicita.** Se il team vuole il validatore anche sul daily, si introduce `GENERATOR_VERSION` con un **giorno di cutover**: `day < CUTOVER` resta sulla pipeline attuale (snapshot invariati), `day >= CUTOVER` usa la v2 e ha un nuovo snapshot. Va chiesto prima, come impone CLAUDE.md ("ask the user before changing generation").

### 2.5 Determinismo fuori dall'orologio

Per campagna e 1vs1 si raccomanda di **non generare a runtime**:

- **Campagna.** Livelli pre-generati offline, validati, congelati in un file dati versionato (per esempio `src/domain/campaign/levels.v1.json`: seed, metriche, grafo). Così l'output non dipende dal dispositivo, si evita il costo di generazione di siti grandi come il 30 nodi (`useLevels.ts:9-11`) e si possono rivedere i livelli a mano.
- **1vs1.** Il grafo della partita viene salvato nella riga del match (sezione 5). Così entrambi i client giocano **lo stesso oggetto**, e non due generazioni dello stesso seed.

Il problema del budget a orologio sul daily resta un gap noto. Correggerlo cambia i puzzle, quindi va trattato come domanda aperta (D3).

---

## 3. Dashboard di ingresso (task 1)

### Inserimento nel routing

- `App.tsx:14`: `Screen` diventa `'hub' | 'workOrder' | 'game' | 'account'`, più gli schermi di modalità (`'campaign'`, `'match'`) quando arriveranno.
- `App.tsx:21`: lo schermo iniziale passa da `'workOrder'` a `'hub'`.
- `WorkOrder` resta il **briefing della sfida del giorno**, raggiungibile dalla card "Daily" della dashboard; CLOCK IN porta a `game` come oggi (`App.tsx:41-42`).
- `StaffOffice` resta raggiungibile dallo `StaffBadge` anche dalla dashboard (`openAccount`, `App.tsx:26`). `accountFrom` va esteso a `'hub'`.
- L'orientamento oggi parte solo su `workOrder` (`App.tsx:23`): va deciso se mostrarlo sulla dashboard.

### Contenuto

- Tre card: **Sfida del giorno** (work order #N, progresso x/7 da `perfectCount`, `selectors.ts:62`), **Campagna** (capitolo corrente), **1vs1** (stato match / "trova avversario").
- Le card richiedono login dove serve (D5), con CTA verso StaffOffice.
- File nuovi: `src/screens/Hub/HubScreen.tsx` e il relativo CSS Module, usando i primitivi `ui/` (Panel, Button, Tag, StaffBadge). Niente hex nuovi.

### Effetto collaterale

`useGameSession` (`App.tsx:20`) oggi genera il daily all'avvio. Con la dashboard conviene istanziare la sessione per modalità, oppure tenere il daily "lazy" fino all'ingresso. La prima generazione costa (`useLevels.ts:9-11`).

---

## 4. Campagna (task 2)

### Struttura proposta (da validare, D6)

- **Capitoli = siti tematici.** I 7 `SITES` (`sites.ts:2-5`) diventano i 7 capitoli, una "commessa" per tipo di edificio. Riusa naming e copy esistenti senza alterare il daily, che continua a chiamare "sito" il singolo livello.
- **Livelli per capitolo:** per esempio 8-10, con difficoltà crescente *dentro* il capitolo e *tra* i capitoli. Curva:
  - Capitoli 1-2: solo profili 1★ e taglie 4-10, introducono foglia e hub.
  - Capitoli 3-4: 2★ (fold) e 10-18 nodi.
  - Capitoli 5-7: 3★ con crown, ring e branch, 18-30+ nodi. Le metriche di sezione 2 separano "3★ facile" da "3★ duro" (`reductionTrace`, `visits`, `matchingGap`).
- Il capitolo 1 può fare da tutorial e sostituire in parte l'orientamento.
- **Seed:** ogni livello ha un seed fisso. Si genera offline e si congela in JSON (sezione 2.5). Il formato del record di livello è identico a `Level` (`types.ts:11-21`), più `id`, `chapter`, `metrics`.

### Progressione

- Si sblocca il livello successivo al clear, a prescindere dal par. Le "stelle di campagna" (0-3 per livello: clear, on-budget, senza hint) servono da gate soft per i capitoli successivi.
- Lo scoring riusa `scoreRun` (`scoring.ts:23`): una sola implementazione.
- Gli hint (`hints.ts`) restano. Usare INSIDER può impedire la terza stella (decisione di game design, D7).

### Persistenza

- **Autenticato:** nuova tabella `campaign_progress` (sezione 8).
- **Anonimo:** CLAUDE.md vieta localStorage senza chiedere, e afferma che "a signed-out player gets the whole game". Opzioni (D5):
  1. progresso solo in memoria, perso al refresh, con invito al login;
  2. localStorage, previa approvazione esplicita, con merge sul server al login;
  3. campagna solo per autenticati, che però contraddice il principio citato.
- Raccomandazione: la 2. Sarebbe la prima persistenza locale non di sessione, quindi va approvata.

### Impatto sul codice

Serve il refactor T0: `GameState` e i selettori parametrizzati sul *set* di livelli (lunghezza, nomi, etichetta "NEXT"), invece che su `SITE_COUNT`. In più una `useCampaignSession` sorella di `useGameSession`. Il reducer resta unico: le regole tap/hire/recall (`gameReducer.ts:52-86`) valgono per tutte le modalità.

---

## 5. 1vs1 multiplayer (task 3)

### Formato raccomandato per l'MVP (D8)

**Gara sincrona sullo stesso puzzle.** Vince chi pulisce il sito a par per primo. Se nessuno è a par entro il tempo limite, vince chi ha il punteggio migliore (par+1); a parità conta il tempo.

| Aspetto | Proposta |
|---|---|
| **Matchmaking** | MVP: **sfida diretta** tra amici o membri di squad, che sfrutta `friendships` e `squads` (`sql/2026-09-08-crew-squads.sql:38-72`) e il codice invito. Coda pubblica in v2, quando ci sarà volume. |
| **Stesso puzzle** | Il server crea il match e scrive il grafo (`level jsonb`) nella riga. Il seed arriva dal server, il grafo dal pool pre-validato della campagna o generato e congelato al momento della creazione. Il client non rigenera mai. |
| **Condizione di vittoria** | Il primo `submit` valido con `used == k`. Il server verifica la copertura: con `edges` e i nodi inviati, una funzione SQL controlla che ogni arco sia coperto, cosa banale in plpgsql. Così si chiude la lacuna 1.2.4 per questa modalità. |
| **Sync** | Supabase Realtime: canale `match:<id>` per presenza e "ready". Lo stato autorevole sta nelle righe di `matches`, aggiornate solo via RPC `security definer`. Per l'MVP basta mostrare all'avversario il conteggio di archi coperti, senza nodi. Nel repo non c'è oggi nessun uso di Realtime (`services/supabase/client.ts:11`). |
| **Equità e tempi** | `started_at` e `finished_at` sono scritti da `now()` del server dentro le RPC `start_match` e `submit_match`, mai dal client. Countdown condiviso: il server fissa `starts_at = now() + 3s` e i client mostrano il conto alla rovescia verso quell'istante. |
| **Abbandoni** | Disconnessione rilevata via presence. Grace period (per esempio 30 s), poi forfeit. Partita mai iniziata: annullata senza effetti sulle statistiche. Un timeout globale chiude il match con il miglior stato inviato. |
| **Hint** | Disabilitati o penalizzati in 1vs1 (D7). INSIDER rivela la soluzione (`engine.ts:352-354`). |
| **Sicurezza** | Con RLS spento (`crew-squads.sql:8-12`) un GRANT table-wide permetterebbe a chiunque di chiudere i match altrui. Le tabelle del 1vs1 vanno **senza GRANT di scrittura al client**: si scrive solo tramite RPC `security definer`, oppure si abilita RLS su queste tabelle (D10). |

### Survival mode

Non c'è un task in backlog. Il concetto è "più livelli possibili entro un tempo limite", cioè una **modalità single-player a tempo** che riusa il generatore e il validatore con rampa crescente. Valutazione:

- Non è una variante del 1vs1: non richiede un avversario. Può però *diventarlo* in seguito ("survival race": stessa sequenza di seed, vince chi ne fa di più).
- Dipende da: refactor T0, validatore (per avere livelli rapidi ma non banali), timer server-side se ha leaderboard.
- **Raccomandazione:** modalità a sé, **rimandata** dopo i 4 task, da tracciare come nuovo task in backlog. Va presa in considerazione solo se la dashboard può ospitare una quarta card. Oggi la regola "no timer" è un principio del brief originale (`chats/chat1.md:20`): introdurre il tempo è una scelta di design da confermare (D9).

---

## 6. Sfida del giorno (task 4)

Cambia poco. Quello che esiste già *è* la sfida del giorno.

- **Invariati:** generazione (`makeDay`/`makeLevelForDay`), 7 siti, scoring, `site_clears`, leaderboard, snapshot.
- **Cambiano:**
  - Si accede dalla dashboard invece di essere la home (`App.tsx:21`).
  - Copy "settimana" contro "giorno" (`WorkOrderScreen.tsx:59`, `invoice.ts:4`): va deciso se il daily è "7 siti al giorno" o se diventa davvero settimanale. La riunione dice "daily" (D2).
  - Lo **streak** di giorni consecutivi è il motivo naturale per tornare ogni giorno. Si deriva da `site_clears.day_number` senza nuove tabelle, con una vista `player_streaks`.
  - Facoltativo: metriche dal validatore mostrate nella `SitePlaque`, solo in lettura.
- **Gap noto da risolvere o accettare:** il budget a orologio (`engine.ts:285-288`) può dare puzzle diversi su dispositivi lenti (D3).

---

## 7. Gamification e monetizzazione

### 7.1 Punti e badge

- **Punti:** si riusa il punteggio esistente (`scoring.ts:9-11`, SQL `weighted-score.sql:28-31`). Campagna e 1vs1 non devono finire nelle viste daily (`leaderboard_weekly`/`alltime` sommano tutto `site_clears`, `merge-nickname-username.sql:36-53`), quindi vanno in tabelle proprie. Un'eventuale "valuta" separata dai punti classifica è una domanda aperta (D11).
- **Badge:** catalogo statico più badge ottenuti. Esempi derivabili dai dati esistenti: "settimana PURR-FECT" (7/7 a par), streak 7/30, primo 3★ senza hint, capitolo completato, prima vittoria 1vs1.
- **Assegnazione:** server-side (trigger o RPC su `site_clears`, `campaign_progress`, `matches`). Con RLS spento, assegnarli dal client permetterebbe a chiunque di darseli.

### 7.2 Cosmetici sui gatti (solo estetici)

Vincoli dello sprite system:

- Ogni razza ha tre pose su canvas 192×192 con baseline comune (`assets/cats/index.ts:28-31`, CLAUDE.md: "don't rescale sprites individually").
- La razza di un nodo è deterministica (`buildScene.ts:74-75`).
- La board disegna `wakeA`/`wakeB` alternati (`CatFlipbook.tsx:10-16`); `sleep` oggi non si usa.

Proposta:

- **Asset:** un accessorio è un set di PNG pre-cotti **sullo stesso canvas 192×192**, uno per (razza × posa in uso), con contratto sul nome `<item>-<breed>-<pose>.png` in `src/assets/cosmetics/`. Il glob è come `things/index.ts`. Va pre-cotto per razza e posa perché testa e postura cambiano tra le pose: un unico overlay ancorato sarebbe impreciso. Costo artistico: con 6 razze × 2 pose attive servono 12 frame per accessorio (D12).
- **Rendering:** `CatFlipbook` aggiunge un `<image>` per frame, sincronizzato con la stessa animazione `cc-frame-a`/`cc-frame-b`. `PadSprite` (usato da board, work order e orientamento, CLAUDE.md "never re-draw a pad") lo riceve come prop: niente disegno altrove.
- **Scene:** `buildScene` arricchisce lo sprite `pad` con `accessory?: CosmeticId` risolto dal loadout del giocatore. Il calcolo resta puro e la risoluzione degli URL avviene in `sprites/`.
- **Modello dati:**
  - `cosmetics`: catalogo con id, slot (`head` | `neck`), nome, rarità, prezzo o modalità di sblocco.
  - `player_cosmetics`: posseduti.
  - `player_loadout`: equipaggiati per slot, globali o per razza (D12).
  - Le scritture su posseduti avvengono **solo** da webhook di pagamento o RPC server.
- **Domain:** il tipo `Cosmetic` va in `domain/types.ts`. Le regole (slot compatibili, default) vanno in un piccolo `domain/cosmetics.ts` puro.

### 7.3 Subscription e ads: decisioni aperte

La riunione **non ha deciso** il modello. Opzioni:

1. Solo cosmetici, con acquisto singolo o pacchetti.
2. Subscription, con paywall da definire. Candidati: campagna oltre il capitolo N, 1vs1 illimitato, archivio dei daily passati, cosmetici esclusivi.
3. Ads: interstitial tra i siti, oppure rewarded per un hint extra.
4. Combinazioni delle precedenti.

Vincoli emersi dal codice:

- Il principio "a signed-out player gets the whole game" (CLAUDE.md) è in tensione con qualsiasi paywall sul gioco base.
- Qualsiasi acquisto richiede un backend di pagamento (Edge Function più provider, o gli store se l'app viene impacchettata) e scritture server-only.
- Gli ads su web mobile richiedono consenso cookie/GDPR.

Vedi D13-D15.

---

## 8. Modello dati Supabase

Convenzioni allineate a `app/sql/`:

- un file per cambiamento, `YYYY-MM-DD-<nome>.sql`;
- intestazione "Run once in the Supabase SQL editor…" e un "Why";
- GRANT espliciti;
- upsert solo con GRANT `update` (lezione da `2026-09-07-site-clears-upsert-grant.sql`).

| Tabella / vista | Colonne principali | Accesso |
|---|---|---|
| `campaign_progress` | `user_id`, `level_id` (text, per esempio `c3-07`), `cats_used`, `par`, `stars`, `hints_used`, `score` generata (stessa espressione di `site_clears`), `cleared_at`; PK `(user_id, level_id)` | select own; insert e update via RPC o trigger keep-best come `site_clears` |
| `matches` | `id`, `level jsonb` (nodes, edges, k), `level_source` (`campaign:<id>` \| `seed:<n>`), `status` (`pending` \| `countdown` \| `live` \| `done` \| `void`), `created_by`, `starts_at`, `ended_at`, `winner_id` | select ai due partecipanti; **nessuna** scrittura diretta, solo RPC `security definer` (`create_match`, `accept_match`, `submit_match`, `forfeit_match`) |
| `match_players` | `match_id`, `user_id`, `joined_at`, `finished_at` (server), `cats_used`, `result` | come sopra |
| `badges` / `player_badges` | catalogo; `(user_id, badge_id, earned_at)` | catalogo pubblico; assegnazione solo da trigger o RPC |
| `cosmetics` / `player_cosmetics` / `player_loadout` | sezione 7.2 | catalogo pubblico; posseduti in scrittura solo server; loadout update own via RPC che verifica il possesso |
| `player_streaks` (vista) | derivata da `site_clears.day_number` | select come `player_scores` |
| `site_clears` | **invariata** | n/a |

**RLS.** Il progetto ha RLS spento e lo segnala come gap (`crew-squads.sql:8-12`). Per le tabelle nuove con valore competitivo o economico non basta più.

- Raccomandazione: **attivare RLS sulle sole tabelle nuove** con policy `user_id = auth.uid()` in lettura e scrittura via RPC.
- Il problema esistente su `friendships`/`squad_members` va chiuso in un task separato.
- Prerequisito: portare nel repo lo schema base mancante (lacuna 1.2.5), per poter scrivere migrazioni riproducibili.

**Repository** (CLAUDE.md: "one file per aggregate", `Result<T>`): `services/repositories/campaign.ts`, `matches.ts`, `badges.ts`, `cosmetics.ts`. Si consumano via `useResource`; Realtime in un hook dedicato con cleanup.

---

## 9. Rischi e ordine di implementazione

### 9.1 Rischi

1. **Regressione dei puzzle giornalieri.** Toccare `makeLevel` o `makeLevelForDay` (anche solo aggiungendo un filtro) cambia i puzzle e rompe gli snapshot. Mitigazione: daily in sola osservazione, cutover versionato (2.4).
2. **Puzzle diversi tra dispositivi.** Il budget a orologio (`engine.ts:285-288`) è fatale per il 1vs1 se si rigenera dal seed. Mitigazione: grafo salvato nel match, livelli di campagna congelati (2.5).
3. **Sicurezza e integrità con RLS spento.** Match, premi e cosmetici a pagamento scrivibili da qualsiasi client; punteggi dichiarati dal client. Mitigazione: RPC `security definer` più RLS sulle tabelle nuove, verifica server della copertura.
4. **Refactor del game core.** `SITE_COUNT` è cablato in reducer, selettori e GameScreen: rischio di regressione sul daily. Mitigazione: T0 dietro i test esistenti (`gameReducer.test.ts`, `selectors.test.ts`, `App.test.tsx`), daily come prima istanza della nuova astrazione.
5. **Costo artistico dei cosmetici:** 12 frame per accessorio, sezione 7.2.
6. **Conflitto paywall con "whole game for signed-out".**
7. **Performance:** generazione di livelli grandi on-device (`useLevels.ts:9-11`).

### 9.2 Ordine

| # | Task | Backlog | Dipende da |
|---|---|---|---|
| T0 | Refactor: sessione di gioco parametrica (set di livelli, nomi, fine set) invece di `SITE_COUNT`; daily invariato | **nuovo** | – |
| T1 | Dashboard di ingresso + routing `hub` | task 1 | T0 (minimo) |
| T2 | Sfida del giorno: ingresso da dashboard, copy giorno/settimana, vista streak | task 4 | T1 |
| T3 | `levelMetrics` + `validator` (puri, testati), script di calibrazione, daily in sola osservazione | **nuovo** | – (parallelo a T0) |
| T4 | Schema base nel repo + RLS sulle tabelle nuove + linee guida RPC | **nuovo** | – |
| T5 | Campagna: pool congelato, `campaign_progress`, UI capitoli | task 2 | T0, T3, T4 |
| T6 | 1vs1: `matches` + RPC + Realtime + sfida tra amici | task 3 | T0, T4, T5 (pool livelli) |
| T7 | Badge (server-side) e punti | **nuovo** | T4, T5 |
| T8 | Cosmetici: asset pipeline + rendering + tabelle | **nuovo** | T4; T9 per la vendita |
| T9 | Monetizzazione (pagamenti / subscription / ads) | **nuovo**, bloccato da D13-D15 | T8 |
| T10 | Survival mode | **nuovo**, rimandato | T3, T5 |

---

## 10. Domande aperte

Per ciascuna: la domanda e una raccomandazione motivata. Nessuna è stata decisa in riunione.

| # | Domanda | Raccomandazione |
|---|---|---|
| D1 | Il validatore deve applicarsi anche al daily, cambiandone i puzzle da un giorno di cutover? | No per ora: daily in sola osservazione, si rivaluta dopo la calibrazione. Preserva la promessa "stesso puzzle per tutti" e gli snapshot. |
| D2 | Il daily è "7 siti al giorno" (codice) o "settimanale" (copy)? | Daily: lo dice la riunione e il codice lo è già. Si aggiorna il copy. |
| D3 | Correggere il budget a orologio di `makeLevel` (determinismo reale tra dispositivi)? | Sì, ma insieme al cutover di D1: un solo cambio di puzzle, annunciato. |
| D4 | Soglie concrete del validatore ("troppo semplice/complicato")? | Ricavarle dai percentili misurati sullo storico (T3), non a priori. |
| D5 | Campagna e progresso per l'anonimo: localStorage, sola memoria o login obbligatorio? | localStorage con merge al login, previa approvazione: mantiene "whole game signed-out" senza perdere progressi. |
| D6 | Struttura della campagna: 7 capitoli = 7 SITES? Quanti livelli? Narrazione? | 7 capitoli × 8-10 livelli, con nome = sito: riusa copy e asset, è scalabile. |
| D7 | Hint in campagna e 1vs1: ammessi, penalizzati, a pagamento? | Campagna: ammessi, ma niente terza stella con INSIDER. 1vs1: disabilitati. Mai a pagamento all'inizio (rischio pay-to-win). |
| D8 | Formato 1vs1: gara sincrona, turni, o asincrono "stesso puzzle, miglior tempo"? | Sincrona tra amici per l'MVP. L'asincrona è un'ottima v2 a basso costo. |
| D9 | Survival: sì o no, e quando? Rompe il principio "no timer"? | Modalità a sé, rimandata dopo i 4 task. Prima un prototipo interno per verificare che il tempo non snaturi il puzzle "deducibile". |
| D10 | RLS: abilitarlo sulle tabelle nuove, o su tutto il progetto? | Sulle nuove subito; sul resto in un task dedicato, perché tocca dati live. |
| D11 | I punti sono solo classifica o anche valuta spendibile (per esempio per i cosmetici)? | Tenerli separati: classifica ≠ valuta. Evita che la monetizzazione distorca la leaderboard. |
| D12 | Cosmetici: per razza o globali? Quali slot (cappello, cravatta…)? Chi produce gli asset? | Globali per slot, con asset pre-cotti per razza e posa. Si parte da 2 slot e 2-3 oggetti per validare la pipeline. |
| D13 | Modello di ricavo: cosmetici, subscription, ads, o mix? | Partire dai soli cosmetici: coerenti col tema e senza conflitto con "whole game". Subscription e ads dopo aver misurato la retention. |
| D14 | Con subscription: cosa sta dietro paywall? | Mai il daily. Candidati: capitoli avanzati, archivio dei daily passati, 1vs1 illimitato, cosmetici esclusivi. |
| D15 | Ads: quale formato e con quale consenso? | Solo rewarded (opt-in), mai interstitial nel puzzle. Richiede un banner di consenso GDPR. |
| D16 | Piattaforma di pagamento: web (Stripe) o store (app impacchettata)? | Dipende dalla distribuzione prevista: da decidere prima di T9. |
| D17 | Il 1vs1 assegna punti in classifica generale? | No: classifica 1vs1 separata (ELO o W/L), per non mischiare metriche. |
| D18 | Badge: quali, e sono visibili sul profilo o nella crew? | Partire da 5-6 badge derivabili dai dati esistenti (7.1), mostrati nell'ID card di StaffOffice. |

---

## Decisioni prese (2026-10-07)

### Motore generatore + validatore: fuori scope, solo mockup
Il generatore con validatore è già sviluppato in un altro branch e arriverà come implementazione **backend**. In questo lavoro **non** si tocca `domain/engine.ts` e non si implementa nessun validatore. Questo chiude D1, D3 e D4 per ora: il daily resta su `makeDay` (`engine.ts:331`) invariato e gli snapshot di `determinism.test.ts` non cambiano.

Le modalità nuove (campagna, 1vs1, eventuale survival) prendono i livelli da un **mock**:
- una porta `LevelSource` in `src/services/` (asincrona, come lo sarà la chiamata al backend), per esempio `getLevel(request): Promise<Result<Level>>`, dove `request` dice modalità e identificativo (capitolo/livello, id partita);
- un'implementazione `mockLevelSource` che restituisce una **mappa base fissa** (uno o pochi `Level` scritti a mano o congelati, con `k`/`sol` corretti), uguale per tutti, senza RNG e senza orologio;
- il contratto è il tipo `Level` di `domain/types.ts:11`: quando arriva il backend si sostituisce solo l'implementazione della porta, non Board, reducer o scoring;
- il mock va segnalato chiaramente nel codice e nella UI di sviluppo come provvisorio.

### Risposte del team (2026-10-07)
- **D5 — Login obbligatorio** per la campagna: niente progresso anonimo, nessuna nuova persistenza locale. La dashboard deve portare al sign-in esistente (`StaffOffice`) quando serve.
- **D6 — Campagna di 100 livelli.** Rapporto con i 7 SITES/capitoli ancora da proporre nel piano. Finché c'è il mock, tutti i livelli ricevono la stessa mappa base (o un piccolo set fisso): progressione, sblocco e salvataggio vanno comunque costruiti per 100 livelli.
- **D8 — 1vs1 in tempo reale**: entrambi i giocatori giocano in contemporanea con Supabase Realtime (presenza, avvio sincronizzato, avanzamento avversario, esito). Il puzzle è lo stesso per entrambi e viene fissato nella partita (dal mock, in seguito dal backend). L'esito si decide con tempi server-side.
- **D9 — Survival mode adesso**: diventa una quarta modalità nel perimetro (senza task in backlog, da creare). Sono livelli consecutivi a tempo, presi dalla stessa porta `LevelSource`.

# Piano di implementazione: modalità di gioco (CATASTROPHE INC.)

> **Aggiornamento (2026-10-20): le fonti dei livelli sono cambiate.** Il generatore non è più `domain/engine.ts` ma `domain/generation/`, e non c'è un backend esterno: i livelli di campagna, survival e 1vs1 vengono da **pool pubblicati a DB** (`level_pools`, `pool_levels`), generati prima dall'admin da `/pools.html` a partire da una `LevelCurve` configurabile. Il server sceglie il livello (`campaign_level`, `survival_level`, `create_match(opponent, tier)`) e i parametri `p_level` sono spariti. Dove questo piano parla di `engine.ts`, di backend o di mock, vale quanto scritto in CLAUDE.md ("Level pools"). Il mock resta solo per i test.

Fonte: `design-game-modes.md`, in particolare "Decisioni prese" e "Risposte del team" (2026-10-07), che prevalgono sulle raccomandazioni precedenti. Il brief è in `prompt-claude-code.md`. I percorsi sono relativi ad `app/`, salvo dove indicato.

Il piano non contiene codice. Le domande a cui il team non ha ancora risposto non bloccano il lavoro: per ognuna si adotta la raccomandazione del documento, marcata nel testo con **[ASSUNZIONE Dn]**, e raccolta nella sezione finale "Assunzioni da confermare".

---

## 0. Vincoli che valgono per tutti i task

- **`src/domain/engine.ts` non si tocca.** Restano invariati anche `calendar.ts`, `house.ts`, `makeDay` e `makeLevelForDay`. Il generatore con validatore arriverà dal backend (decisione presa), quindi D1, D3 e D4 sono chiusi.
- **Layer.** `domain` ← `game`/`services` ← `screens`/`app`. `ui` e `sprites` restano foglie. Le regole sono già imposte da `.oxlintrc.json` e non si aggiungono eccezioni.
- **Persistenza locale: nessuna** (D5, login obbligatorio per la campagna). Lo stato in memoria di una sessione non conta come persistenza.
- **"Done" per ogni task:**
  - `npm run check` verde (lint + `tsc --noEmit` + Vitest + build);
  - `src/domain/__snapshots__/determinism.test.ts.snap` **non compare nel diff**;
  - ogni nuovo modulo puro ha i suoi test;
  - CLAUDE.md è aggiornato quando cambia la struttura (regola "Keep this file in sync").
- **Migrazioni SQL.** Le applica a mano chi ha accesso al progetto Supabase (nessun DB tool lato client), nel formato dei file esistenti:
  - nome `YYYY-MM-DD-<nome>.sql`;
  - intestazione "Run once in the Supabase SQL editor…";
  - un paragrafo "Why";
  - GRANT espliciti, con `update` concesso quando serve un upsert.

  Il prefisso data è quello del merge. Le date nella sezione 5 sono indicative.

---

## 1. Task in ordine

Legenda: **[BL n]** = task di backlog (1 dashboard, 2 campagna, 3 1vs1, 4 sfida del giorno). **[NUOVO]** = task trasversale o da creare.

| # | Task | Tipo | Dipende da | Incremento |
|---|---|---|---|---|
| T1 | Porta `LevelSource` + `mockLevelSource` | NUOVO | – | 1 |
| T2 | Sessione di gioco parametrica (refactor `SITE_COUNT`) | NUOVO | – | 1 |
| T3 | Dashboard di ingresso + routing `hub` | BL 1 | T2 | 1 |
| T4 | Sfida del giorno: ingresso da dashboard, copy, streak | BL 4 | T3 (streak: T5) | 1 (copy), 2 (streak) |
| T5 | Schema DB: schema base nel repo + convenzioni RLS/RPC | NUOVO | – | 2 (in parallelo a T1/T2) |
| T6 | Campagna da 100 livelli | BL 2 | T1, T2, T3; persistenza: T5 | 1 (scheletro), 2 (salvataggio) |
| T7 | Survival mode | NUOVO, testo del task nella sezione 2 | T1, T2, T3; classifica: T5 | 3 |
| T8 | 1vs1 in tempo reale | BL 3 | T1, T2, T3, T5 | 3 |
| T9 | Gamification: badge server-side | NUOVO | T5, T6 (e T8 per il badge 1vs1) | 4 |
| T10 | Cosmetici (solo estetici, sblocco senza pagamento) | NUOVO | T5, T9 | 4 |
| – | Monetizzazione (pagamenti, subscription, ads) | **fuori piano**, bloccata da D13-D16 | T10 | – |

T1, T2 e T5 sono indipendenti e si possono fare in parallelo. Lo stesso vale per T7 e T8, una volta chiuso l'incremento 2.

---

## 2. Dettaglio dei task

### T1 · Porta `LevelSource` + mock

**Obiettivo.** Un'unica fonte di livelli per campagna, survival e 1vs1. Quando arriverà il backend si sostituirà solo l'implementazione della porta.

**File**
- `src/domain/types.ts` (modifica, solo aggiunte): `LevelRequest`, unione discriminata per modalità:
  - `{ mode: 'campaign'; levelNo: number }`, con `levelNo` da 1 a 100;
  - `{ mode: 'survival'; runSeed: string; step: number }`;
  - `{ mode: 'match'; matchId: string }`.

  `Level` resta il contratto e non cambia.
- `src/services/levels/levelSource.ts` (nuovo): interfaccia `LevelSource { getLevel(req): Promise<Result<Level>> }`.
- `src/services/levels/mockLevelSource.ts` (nuovo): restituisce una **mappa base fissa**, o un piccolo set fisso di 3-5 mappe scelte con un indice deterministico (`levelNo`, `step`, hash di `matchId` modulo N). Niente RNG, niente orologio, niente chiamate a `makeLevel`. Commento in testa: "MOCK provvisorio: sostituire con il backend".
- `src/services/levels/fixtures/baseMaps.ts` (nuovo): i `Level` scritti a mano o congelati, con `nodes`, `edges`, `adj`, `k`, `sol` e `stars` corretti. Sono dati statici: non si generano al caricamento del modulo.
- `src/services/levels/index.ts` (nuovo): espone l'istanza attiva (`levelSource`) e il flag `IS_MOCK_SOURCE`, che la UI usa per il tag "DEV MOCK".
- `src/game/hooks/useSourcedLevel.ts` (nuovo): carica un livello dalla porta. Ignora le risposte obsolete e passa da `useResource` se la sua forma è compatibile, come chiede CLAUDE.md per i dati asincroni.

**Test**
- `mockLevelSource.test.ts`. Per ogni fixture:
  - `adj` coerente con `edges`;
  - `sol` è una copertura (`coveredEdges` di `domain/cover.ts`);
  - `|sol| === k`;
  - copertura ottima unica, verificata con `solve()` di `engine.ts` (usato, non modificato): `count === 1` e `k` uguale.

  In più: stessa richiesta, stesso livello (determinismo del mock); `levelNo` fuori range restituisce `Result` di errore.
- `useSourcedLevel` testato con una sorgente finta: gestione dei risultati obsoleti e cleanup.

**Done.** `npm run check` verde. Nessun import di `engine.ts` fuori dai test. Il tipo `LevelSource` non dipende da Supabase.

---

### T2 · Sessione di gioco parametrica

**Obiettivo.** Il reducer, i selettori e `GameScreen` oggi sono cablati su `SITE_COUNT`/`LAST_SITE`/`SITES` (vedi `grep`: `gameReducer.ts:3,46,95,110`, `selectors.ts:2,33-41,55`, `GameScreen.tsx:4,55-57,136,161-162`, `Sidebar.tsx:33`). Vanno resi dipendenti da un **set di livelli** descritto da dati. Il daily diventa la prima istanza del nuovo modello, con comportamento identico.

**File**
- `src/domain/types.ts` (aggiunta): `PlaySet { count: number; name(i): string; unitLabel: 'SITE' | 'LEVEL'; finishLabel: string }`, più i flag di modalità `PlayFeatures { hints: boolean; invoice: boolean; share: boolean }`.
- `src/domain/sites.ts` (aggiunta): `DAILY_SET: PlaySet`, costruito da `SITES`. `SITE_COUNT`, `LAST_SITE` e `isSiteIndex` restano per il codice del daily (DRY: la costante ha ancora una sola fonte).
- `src/game/state/gameReducer.ts` (modifica minima, vedi sezione 3):
  - `initialGameState(count = SITE_COUNT)`;
  - `go` controlla il limite su `s.results.length` invece di `isSiteIndex`;
  - `isLastSite(idx, count)`;
  - nuovo campo `consulted: 0 | HintTier`, il tier massimo consultato nel tentativo corrente, azzerato su `reset`/`go`, riportato nell'evento `cleared` (serve alla terza stella di campagna, D7);
  - nuova azione `restart(count)`, che torna allo stato iniziale conservando `seq` (serve alla survival).
- `src/game/state/selectors.ts` (modifica): `banner` e `pips` ricevono `PlaySet` invece di leggere `SITE_COUNT`/`LAST_SITE`.
- `src/game/GameScreen.tsx` (modifica). Riceve per prop:
  - `set: PlaySet`;
  - `features: PlayFeatures`;
  - `save: (idx, run, consulted) => Promise<Result<null>> | null`, cioè la strategia di salvataggio della modalità;
  - `hud?: ReactNode`, uno slot per countdown e avversario;
  - `locked?: boolean`, che rende i tap no-op prima del via del 1vs1.

  Il salvataggio daily (`recordClear`) si sposta fuori da `GameScreen`, dentro la sessione daily. Per restare sotto le 200 righe si estrae `src/game/hooks/useClearSaver.ts`.
- `src/game/useGameSession.ts` (modifica): resta la sessione daily. Espone in più `set: DAILY_SET`, `features` e `save`. Interfaccia comune `PlaySession`, definita in `src/game/session.ts` (nuovo).
- `src/game/components/Sidebar.tsx` (modifica): l'`aria-label` usa `set.count`.
- `src/app/App.tsx` (modifica): passa a `GameScreen` la sessione daily come oggi.

**Test**
- `gameReducer.test.ts` e `selectors.test.ts` esistenti invariati e verdi: è la garanzia di non regressione del daily. Casi nuovi:
  - `go` fuori range per `count` = 1 e = 12;
  - `restart`;
  - `consulted` aggiornato da `consult`, azzerato da `reset`/`go`, presente nell'evento `cleared`;
  - `banner`/`pips` con un `PlaySet` diverso da 7.
- `App.test.tsx` verde senza modifiche alle aspettative del daily.

**Done.** `npm run check` verde, snapshot invariati, comportamento del daily identico (stesse stringhe di banner, pips e invoice).

---

### T3 · Dashboard di ingresso (backlog 1)

**File**
- `src/app/App.tsx` (modifica):
  - `type Screen = 'hub' | 'workOrder' | 'game' | 'account' | 'campaign' | 'survival' | 'match'`, con le ultime tre aggiunte da T6/T7/T8;
  - schermo iniziale `'hub'`;
  - `accountFrom` esteso a `'hub'`.

  Se `Shell` cresce troppo, il routing si estrae in `src/app/useScreen.ts` (nuovo). La sessione daily resta istanziata in `Shell` come oggi (scelta meno invasiva): la generazione sfalsata parte all'avvio come ora. Renderla lazy è un'ottimizzazione rimandata.
- `src/app/useOrientation.ts` (modifica): `onWorkOrder` diventa "schermo di ingresso" (`hub`), quindi l'orientamento compare sulla dashboard. **[ASSUNZIONE: orientamento sulla dashboard]**
- `src/screens/Hub/HubScreen.tsx` + `HubScreen.module.css` (nuovi). Quattro card con i primitivi `ui/` (`Panel`, `Button`, `Tag`, `StaffBadge`), niente hex nuovi:
  1. **Sfida del giorno**: work order #N e progresso `perfectCount`/7. Porta a `workOrder`.
  2. **Campagna**: capitolo e livello correnti. Se non si è autenticati, CTA "SIGN IN" verso `StaffOffice` (D5).
  3. **Survival**: record personale; CTA.
  4. **1vs1**: sfide in arrivo o "SFIDA UN AMICO". Login richiesto.

  Le card delle modalità non ancora rilasciate mostrano "COMING SOON" (disabilitate), così T3 si può rilasciare prima di T6/T7/T8.
- `src/screens/Hub/hubCards.ts` (nuovo, puro): deriva lo stato delle card da auth e progressi (niente regole nel JSX).
- `src/screens/WorkOrder/WorkOrderScreen.tsx` (modifica): un'azione "BACK" verso `hub`.
- `src/game/components/Sidebar.tsx` (modifica): `onOpenWorkOrder` resta. Si aggiunge l'uscita verso la dashboard (`onOpenHub`).

**Test**
- `hubCards.test.ts`: autenticato/anonimo, progresso 0/7 e 7/7, modalità disabilitate.
- `HubScreen.test.tsx` (RTL): click sulla card daily, poi `workOrder`; click su campagna da anonimo, poi `account`.
- `App.test.tsx`: lo schermo iniziale è la dashboard. Aggiornare le aspettative esistenti che assumono `workOrder` come home: è una modifica di test **intenzionale**, da dichiarare nella PR.

**Done.** `npm run check` verde; il daily si raggiunge in due tap (card, CLOCK IN).

---

### T4 · Sfida del giorno (backlog 4)

Generazione, scoring, `site_clears` e leaderboard restano **invariati**.

**4a (incremento 1): copy e ingresso**
- `src/screens/WorkOrder/WorkOrderScreen.tsx:59`: "7 SITES · ONE WORKING WEEK" diventa la versione giornaliera, per esempio "7 SITES · TODAY'S SHIFT". **[ASSUNZIONE D2: il daily è giornaliero, si corregge il copy]**
- Allineamento delle altre stringhe "settimana":
  - `src/domain/invoice.ts:4` ("weekly invoice");
  - `src/game/state/selectors.ts` ("WEEK DONE" → "SHIFT DONE");
  - `screens/HowToPlay/slides.tsx:34`, `demos/InfoDemos.tsx:44`.

  Le etichette delle leaderboard settimanali ("THIS WEEK", `IdCard.tsx:51`, `ProfileView.tsx:34`) restano: la vista `leaderboard_weekly` *è* settimanale.
- Test: `invoice.test.ts`, `selectors.test.ts` e `HowToPlay.test.tsx` aggiornati sulle nuove stringhe.

**4b (incremento 2): streak**
- SQL: la vista `player_streaks` (sezione 5, file 2) deriva da `site_clears.day_number` la streak corrente e la migliore.
- `src/services/repositories/streaks.ts` (nuovo): `getStreak(userId): Promise<Result<Streak>>`.
- `src/domain/types.ts`: `Streak { current: number; best: number }`.
- Visualizzazione: card daily della dashboard e `IdCard`.
- Test: `repositories.test.ts` (mapping e errore), `hubCards.test.ts` con streak.

**Done.** `npm run check` verde; snapshot invariati. In 4b la vista è applicata e documentata in `app/sql/`.

---

### T5 · Schema DB e convenzioni di sicurezza

**Obiettivo.** Chiudere la lacuna 1.2.5 (lo schema base non è nel repo) e fissare le regole per le tabelle nuove.

- File SQL 1 (sezione 5): lo schema base di `profiles` e `site_clears` così com'è in produzione, ricavato da un dump dello schema del progetto Supabase (serve qualcuno con accesso). Scritto in forma idempotente (`create table if not exists`), solo come riferimento riproducibile: non deve alterare nulla in produzione.
- `app/sql/README.md` (nuovo): convenzioni del formato, ordine di applicazione e regola per le tabelle nuove. Le regole:
  - **RLS attivo sulle sole tabelle nuove** **[ASSUNZIONE D10]**: lettura con policy `user_id = auth.uid()` o "partecipante";
  - scritture competitive solo via RPC `security definer` con `set search_path = public`;
  - nessun GRANT di scrittura diretta su `matches`/`match_players`/`survival_runs`/`player_badges`/`player_cosmetics`.

  Questo è un file di documentazione tecnica che il brief richiede (punto 4 del brief). Se non lo si vuole, le stesse regole vanno nell'intestazione di ogni migrazione.
- La chiusura del problema esistente su `friendships`/`squad_members` resta un task separato, fuori da questo piano.

**Done.** I file sono presenti e rivisti; nessun impatto sul client; `npm run check` invariato.

---

### T6 · Campagna da 100 livelli (backlog 2)

**Struttura proposta (D6: 100 livelli).** **[ASSUNZIONE D6-bis: rapporto capitoli/SITES]**
- **7 capitoli = 7 `SITES`**, con un numero di livelli crescente che somma 100: **10 · 12 · 14 · 14 · 16 · 16 · 18**. I capitoli finali, con i grafi grandi, hanno più livelli.
- Un'unica tabella costante in `src/domain/campaign.ts`: `CHAPTERS = [{ site: 0, from: 1, to: 10 }, …]`. Il resto deriva da lì: capitolo di un livello, primo e ultimo livello, nome = `SITES[site]` (nessuna duplicazione dei nomi).
- Identificativo del livello: `levelNo` intero da 1 a 100, stabile anche quando il backend sostituirà il mock.
- Finché c'è il mock, tutti i 100 livelli ricevono le mappe di `baseMaps` (T1). La UI mostra un tag "DEV MOCK" se `IS_MOCK_SOURCE`.

**Progressione**
- Il livello 1 è sbloccato; il livello n+1 si sblocca al **clear** di n, anche oltre il par.
- **Stelle di campagna** (0-3): clear; on budget (`used <= k`); senza INSIDER (`consulted < 3`, da T2). **[ASSUNZIONE D7: hint ammessi, INSIDER toglie la terza stella]**
- Gate soft tra capitoli: un capitolo si apre al completamento del precedente. Niente soglia di stelle nell'MVP. **[ASSUNZIONE: nessun gate a stelle]**
- Punteggio: `scoreRun` (`domain/scoring.ts:23`) invariato e keep-best. La campagna **non** finisce nelle viste del daily (`site_clears` invariata).
- Login obbligatorio (D5): da anonimi la dashboard porta a `StaffOffice`. Nessun localStorage.

**File**
- `src/domain/campaign.ts` (nuovo, puro):
  - `CHAPTERS`;
  - `chapterOf(levelNo)`, `chapterSet(ch): PlaySet`;
  - `campaignStars(run, consulted)`;
  - `unlockedUpTo(clears)`;
  - `chapterProgress(clears, ch)`.
- `src/domain/types.ts`: `CampaignClear { levelNo; catsUsed; par; stars; campaignStars; score }`.
- `src/services/repositories/campaign.ts` (nuovo): `getCampaignClears(userId)` e `recordCampaignClear(...)`, entrambe con `Result<T>`. L'upsert è protetto da keep-best lato DB, come `site_clears`.
- `src/game/useCampaignSession.ts` (nuovo): sessione **per capitolo**, quindi `GameState` ha la lunghezza del capitolo (10-18 pips, non 100). Carica i livelli via `useSourcedLevel` e implementa `PlaySession` con `save` = `recordCampaignClear`.
- `src/screens/Campaign/CampaignScreen.tsx`, `ChapterList.tsx`, `Campaign.module.css` (nuovi): mappa dei 7 capitoli e griglia dei livelli con lucchetti e stelle. Il gioco riusa `GameScreen` con `set = chapterSet(ch)` e `features = { hints: true, invoice: false, share: false }`.
- `src/screens/Campaign/useCampaignProgress.ts` (nuovo): legge i clear via `useResource`.
- `src/app/App.tsx`: schermo `'campaign'`.

**Rilascio in due fasi**
- **Scheletro (incremento 1).** Mappa capitoli e livelli giocabili dal mock. Progresso solo in memoria per la sessione corrente (nessuna persistenza), con la nota "SALVATAGGIO IN ARRIVO".
- **Salvataggio (incremento 2).** File SQL 3 (sezione 5) applicato, repository collegato, sblocchi letti dal server.

**Test**
- `campaign.test.ts`:
  - somma dei capitoli = 100;
  - copertura contigua 1..100 senza buchi;
  - `chapterOf` ai bordi;
  - `campaignStars` (tutti i casi, incluso INSIDER);
  - `unlockedUpTo` con buchi e replay.
- `repositories.test.ts`: mapping ed errori di `campaign.ts`.
- `CampaignScreen.test.tsx`: livelli bloccati non cliccabili; anonimo reindirizzato al sign-in.

**Done.** `npm run check` verde, snapshot invariati, nessuna chiamata a `engine.ts` dal percorso campagna.

---

### T7 · Survival mode (nuovo, D9)

**Testo proposto per il task di backlog:**

> **Survival mode: più siti possibili prima che scada il tempo**
> Quarta modalità, single-player. Il giocatore ha un tempo limite totale (proposta: 3 minuti) per pulire quanti più siti consecutivi possibile. I livelli arrivano dalla porta `LevelSource` (`mode: 'survival'`, `runSeed`, `step`); finché c'è il mock è un piccolo set fisso di mappe a rotazione. Un sito pulito avanza subito al successivo; si può pulire anche oltre il par (massimo +1, come nel daily), ma vale meno: punteggio per sito = `scoreRun`, punteggio della run = somma. Gli hint sono disabilitati. Fine run: tempo scaduto oppure abbandono. Accesso dalla card "Survival" della dashboard; login richiesto solo per salvare in classifica. Criteri di accettazione: timer visibile, avanzamento automatico, riepilogo di fine run (siti, punteggio, record personale), `npm run check` verde, snapshot di determinismo invariati. Fase 2: classifica con tempi verificati dal server (RPC), nessun tempo dichiarato dal client.

**Scelte** **[ASSUNZIONE D9-bis: parametri survival]**
- Tempo totale fisso di 180 s, senza bonus per sito.
- Hint disabilitati, per coerenza con la modalità a tempo.
- Rampa di difficoltà demandata al backend (`step` nella richiesta): con il mock non c'è rampa.

**File**
- `src/domain/survival.ts` (nuovo, puro):
  - `SURVIVAL_LIMIT_MS`;
  - `remainingMs(startedAt, now)`, con il tempo passato come argomento (niente `Date.now()` nel domain);
  - `runSummary(results)`;
  - `isOver(...)`.
- `src/game/useSurvivalSession.ts` (nuovo):
  - un reducer con `count = 1`, riavviato con `restart` (T2) a ogni sito;
  - aggregato della run;
  - timer in un hook con cleanup (`setInterval`/rAF);
  - prefetch del livello `step + 1` mentre si gioca `step`.
- `src/screens/Survival/SurvivalScreen.tsx`, `SurvivalSummary.tsx`, `Survival.module.css` (nuovi): `GameScreen` con `hud` = timer e contatore, `features.hints = false`.
- **Fase 2, classifica:**
  - `src/services/repositories/survival.ts` (nuovo): `startSurvivalRun()` e `submitSurvivalSite(runId, step, nodes)` via RPC;
  - SQL file 7. Il server fissa `started_at`, verifica la copertura e rifiuta i clear oltre `started_at + limite`.

**Test**
- `survival.test.ts`: tempo residuo, fine run, aggregazione del punteggio.
- `useSurvivalSession` con fake timers: avanzamento automatico, stop a tempo scaduto, cleanup all'unmount.
- `SurvivalScreen.test.tsx`: riepilogo finale.

**Done.** `npm run check` verde e snapshot invariati. In fase 2 nessun tempo arriva dal client.

---

### T8 · 1vs1 in tempo reale (backlog 3, D8)

**Formato.** Gara sincrona sullo stesso puzzle.
- Vince il primo `submit` valido con `used == k`.
- Allo scadere del tempo (proposta: 5 minuti) vince il miglior clear inviato (par+1); a parità conta il `finished_at` del server.
- Partita annullata se non parte.

**Matchmaking.** Sfida diretta tra amici o membri di squad (`friendships`/`squads` esistenti). La coda pubblica è v2.

**Hint.** Disabilitati in 1vs1. **[ASSUNZIONE D7]**

**Puzzle nella partita.** Il grafo viene salvato in `matches.level` (jsonb) alla creazione; i client lo leggono dalla riga e non rigenerano mai. **[ASSUNZIONE: con il mock, il client che crea la sfida passa a `create_match` il livello ottenuto da `mockLevelSource`]** La RPC ne valida la struttura (archi tra nodi esistenti, `sol` copertura, `|sol| = k`). Quando arriverà il backend, `create_match` lo otterrà dal server e il parametro sparirà. Fino ad allora un client manomesso può scegliere il grafo, ma non può falsare l'esito: la copertura viene comunque verificata sul grafo salvato, uguale per entrambi.

**Realtime (Supabase)**
- Canale `match:<id>` con **presence**, per ready e disconnessione.
- **broadcast** effimero per l'avanzamento dell'avversario: solo il numero di archi coperti, mai i nodi.
- `postgres_changes` su `matches`/`match_players` per lo stato autorevole (RLS: visibile solo ai partecipanti).
- Countdown verso `starts_at = now() + 3s`, fissato dal server.
- Abbandono: grace period di 30 s via presence, poi `forfeit_match`. **[ASSUNZIONE: 5 minuti di limite e 30 s di grace]**

**File**
- `src/domain/match.ts` (nuovo, puro):
  - `MatchStatus` (`pending` | `countdown` | `live` | `done` | `void`);
  - `matchOutcome(...)` per la UI (vinto, perso, pari, annullato);
  - `countdownMs(startsAt, now)`;
  - `isMatchLevel(json): json is Level`, una guardia di tipo sul jsonb.
- `src/domain/types.ts`: `Match`, `MatchPlayer`, `MatchRecord`.
- `src/services/repositories/matches.ts` (nuovo): `createMatch`, `acceptMatch`, `declineMatch`, `submitMatch(matchId, nodes)`, `forfeitMatch`, `listMyMatches`, `getMatchRecord`. Solo RPC, tutte con `Result<T>`.
- `src/services/realtime/matchChannel.ts` (nuovo): wrapper su `supabase.channel` (presence, broadcast, postgres_changes) con `unsubscribe`. È il primo uso di Realtime nel repo (`services/supabase/client.ts:11`).
- `src/game/useMatchSession.ts` (nuovo): `PlaySession` con `count = 1`, `features.hints = false`, `locked` finché lo stato non è `live`, `save` = `submitMatch`. Su un clear oltre par il giocatore può richiamare e riprovare finché c'è tempo.
- `src/screens/Match/`: `MatchLobby.tsx` (sfide in arrivo e inviate, scelta dell'amico dalla crew), `MatchScreen.tsx` (`GameScreen` + `hud` con countdown, barra dell'avversario e timer), `MatchResult.tsx`, `useMatch.ts` (canale e cleanup), `Match.module.css`.
- `src/screens/Crew/HeadToHead.tsx` (modifica leggera): un pulsante "SFIDA" che apre la lobby con l'amico preselezionato. Il confronto asincrono esistente resta.
- Classifica 1vs1 separata, con vittorie e sconfitte (vista `match_records`); non entra nelle leaderboard del daily. **[ASSUNZIONE D17: niente ELO nell'MVP]**

**Test**
- `match.test.ts`: esiti, countdown, guardia jsonb (livello malformato rifiutato).
- Repository con client Supabase mockato.
- `useMatch` con un canale finto: subscribe, unsubscribe all'unmount, presenza persa → forfeit dopo la grace.
- `MatchScreen.test.tsx`: tap ignorati prima del via.
- SQL: script di prova manuale nell'intestazione della migrazione: casi di `cover_is_valid` (copertura valida, arco scoperto, nodo fuori range).

**Done.** `npm run check` verde e snapshot invariati. Nessun GRANT di scrittura diretta sulle tabelle del match. Due browser con due account completano una partita end-to-end in ambiente di sviluppo.

---

### T9 · Gamification: badge (nuovo)

**Scelte** **[ASSUNZIONE D18 + D11]**
- 6 badge derivabili dai dati, assegnati **solo server-side**:
  - PURR-FECT SHIFT (7/7 a par nello stesso giorno);
  - streak 7;
  - streak 30;
  - capitolo di campagna completato;
  - 3 stelle di campagna senza INSIDER;
  - prima vittoria 1vs1.
- Mostrati nell'ID card di `StaffOffice` e nel profilo della crew.
- Nessuna valuta spendibile: i punti restano solo classifica.

**File**
- SQL file 8: `badges` (catalogo, seed), `player_badges`, funzioni di award richiamate da trigger `after insert or update` su `site_clears`, `campaign_clears` e `match_players`.
- `src/domain/badges.ts` (nuovo, puro): catalogo statico per la UI (id, nome, descrizione), unica fonte lato client degli id; deve combaciare con il seed SQL.
- `src/services/repositories/badges.ts` (nuovo).
- `src/screens/StaffOffice/BadgeShelf.tsx` (nuovo) e inserimento in `IdCard.tsx` e `Crew/ProfileView.tsx`.

**Test**
- `badges.test.ts`: id unici, catalogo completo.
- Repository.
- `StaffOffice.test.tsx` con badge.

**Done.** `npm run check` verde. Nessun percorso client che scriva su `player_badges`.

---

### T10 · Cosmetici (nuovo, solo estetici)

**Scelte** **[ASSUNZIONE D12 + D13]**
- 2 slot (`head`, `neck`) con 2-3 oggetti, **globali per slot**.
- Asset pre-cotti per razza e posa attiva (6 × `wakeA`/`wakeB` = 12 frame per oggetto), sullo stesso canvas 192×192 con baseline 182.
- Sblocco **solo tramite badge** (T9) finché la monetizzazione non è decisa. Nessun pagamento.

**File**
- `src/assets/cosmetics/` (nuovo): PNG `<item>-<breed>-<pose>.png`, `index.ts` con glob (stesso pattern di `assets/things/`) e README del contratto.
- `src/domain/cosmetics.ts` (nuovo, puro): `CosmeticId`, slot, compatibilità, default. Tipo `Cosmetic` in `domain/types.ts`.
- `src/sprites/CatFlipbook.tsx` e `src/sprites/PadSprite.tsx` (modifica): prop opzionale `accessory`, un `<image>` per frame sincronizzato con `cc-frame-a`/`cc-frame-b`. Senza prop l'output è identico.
- `src/game/scene/buildScene.ts` (modifica): campo opzionale `accessory` sullo sprite `pad`, risolto dal loadout passato in input. **Non cambia** la formula della razza (`buildScene.ts:74-75`) né l'ordine di disegno.
- `src/game/components/Board.tsx` / `SpriteLayer.tsx` (modifica): passano il loadout fino allo sprite.
- `src/services/repositories/cosmetics.ts` (nuovo): catalogo, posseduti, `setLoadout` via RPC.
- `src/screens/StaffOffice/Wardrobe.tsx` (nuovo).
- SQL file 9: `cosmetics`, `player_cosmetics`, `player_loadout`, RPC `set_loadout` (verifica il possesso) e sblocco agganciato all'award dei badge.

**Test**
- `cosmetics.test.ts`.
- `buildScene.test.ts`: senza loadout la scena è identica a prima (confronto profondo); con loadout cambia solo `accessory`.
- `sprites.test.tsx`: `CatFlipbook` con e senza accessorio.

**Done.** `npm run check` verde e snapshot invariati. Board senza loadout identica a oggi.

---

### Fuori piano: monetizzazione

Bloccata da D13-D16 (modello di ricavo, paywall, ads, piattaforma di pagamento). Il piano si limita a **non chiudere porte**:
- possesso dei cosmetici scrivibile solo dal server;
- nessun paywall sul daily;
- il principio "signed-out gets the whole game" vale per il daily e per la survival senza classifica.

---

## 3. Percorso minimo invasivo: cosa si riusa e cosa si tocca

| Modulo | Riuso | Modifica necessaria | Perché |
|---|---|---|---|
| `domain/engine.ts` | `solve` e helper degli hint, solo dai test del mock; `makeDay`/`makeLevelForDay` per il daily | **Nessuna** | Decisione presa: il generatore arriva dal backend |
| `domain/scoring.ts` | `scoreRun`, `keepBest`, `totalScore` per tutte le modalità | **Nessuna** | Un'unica implementazione del punteggio, che specchia l'SQL. Le stelle di campagna vivono in `campaign.ts` e non alterano lo score |
| `game/state/gameReducer.ts` | Regole tap/hire/recall/refused/consult identiche per tutte le modalità | (1) `initialGameState(count)`; (2) `go` limitato da `results.length`; (3) `isLastSite(idx, count)`; (4) campo `consulted` + evento `cleared` arricchito; (5) azione `restart` | (1-3) sganciarsi da `SITE_COUNT`; (4) terza stella di campagna senza INSIDER; (5) survival a livelli consecutivi. Il blocco pre-partita del 1vs1 sta in `GameScreen` (`locked`), non nel reducer |
| `game/state/selectors.ts` | `hud`, `statusMessage`, `budgetTone`, `perfectCount` | `banner`, `pips` ricevono `PlaySet` | Etichette e conteggi per modalità |
| `game/GameScreen.tsx` | Tutta la logica di board, eventi, tastiera, score card | Props `set`, `features`, `save`, `hud`, `locked`; salvataggio estratto in `useClearSaver` | Una sola schermata di gioco per 4 modalità |
| `Board` (+ layers) | Integrale: camera, house, scene | **Nessuna** fino a T10. In T10 solo il passaggio di `accessory` | `siteIdx` continua a decidere la razza: in campagna si passa l'indice nel capitolo |
| `buildScene.ts` | Integrale | Solo T10, campo opzionale | Cosmetici |
| `useLevels.ts` | Daily | **Nessuna** | Il daily resta su `makeLevelForDay` |
| `App.tsx` | `AuthProvider`, `Shell` | Routing `hub` + modalità | Dashboard |

---

## 4. Determinismo

Lo snapshot di `src/domain/determinism.test.ts` dipende solo da `makeDay` (seed 12, 40, 97) e da `buildHouse`/`houseSeed`. Nessun task modifica `engine.ts`, `house.ts`, `calendar.ts` o il manifest delle stanze, quindi **nessun task deve cambiarlo**. Qualsiasi diff sul file `.snap` è un bug.

Task con rischio residuo e come neutralizzarlo:

| Task | Rischio | Mitigazione |
|---|---|---|
| T2 (refactor sessione) | Toccando `useLevels`/`useGameSession` si potrebbe cambiare seed o indici passati a `makeLevelForDay` (per esempio `daySeed(day)` o l'ordine 0..6) | `useLevels.ts` non si modifica; `useGameSession` mantiene `daySeed(dayNumber())`. Test esistente `useLevels.test.ts` invariato. Nessun nuovo parametro verso il generatore |
| T1 (mock) | Fixture "congelate" prodotte chiamando `makeLevel` al caricamento del modulo: consumerebbero RNG e dipenderebbero dal budget a orologio (`engine.ts:285-288`) | Fixture come **dati letterali**. `engine.ts` si importa solo nei test di verifica, che usano `solve` (puro, senza RNG) |
| T6/T7/T8 | Usare `makeLevel` con un `LevelFilter` per "variare" i livelli mock | Vietato: le modalità nuove passano solo da `LevelSource` |
| T10 (cosmetici) | Modificare la formula della razza o l'ordine dello sprite pass in `buildScene` | Campo solo additivo; test di uguaglianza della scena senza loadout. Il house seed (`houseSeed(lv)`) non viene toccato |
| Tutti | `Math.random()` in codice nuovo (per esempio la scelta della fixture o un id di run) | La scelta della fixture è deterministica (indice o hash). `runSeed`/`matchId` arrivano dal server (`gen_random_uuid()`); lato client si usa `crypto.randomUUID()` solo fuori dal domain e mai per decidere un puzzle |

Controllo consigliato in review: `git diff --stat` non deve contenere `src/domain/engine.ts`, `src/domain/house.ts` o `src/domain/__snapshots__/`.

---

## 5. Migrazioni SQL da aggiungere in `app/sql/`

Formato come gli esistenti:
- intestazione "Run once in the Supabase SQL editor (Database > SQL Editor) against the live project…";
- "Why:" e "Fix:";
- `create or replace` / `drop … if exists` dove serve idempotenza;
- GRANT espliciti (`update` incluso se c'è un upsert, lezione di `2026-09-07-site-clears-upsert-grant.sql`).

Prefisso = data del merge. Ordine di applicazione:

| # | File (nome proposto) | Task | Contenuto |
|---|---|---|---|
| 1 | `2026-10-08-base-schema.sql` | T5 | `profiles` e `site_clears` come in produzione (`create table if not exists`, vincoli, colonna generata `score`), per riproducibilità. Non altera nulla di esistente |
| 2 | `2026-10-09-player-streaks.sql` | T4b | Vista `player_streaks (user_id, current_streak, best_streak, last_day)` da `site_clears.day_number` (gaps-and-islands). `grant select` come `player_scores` |
| 3 | `2026-10-10-campaign-clears.sql` | T6 | Tabella `campaign_clears`: `user_id`, `level_no smallint check 1..100`, `cats_used`, `par`, `stars`, `campaign_stars smallint 0..3`, `score` generata con la stessa espressione di `site_clears`, `cleared_at`, PK `(user_id, level_no)`. Trigger keep-best come `site_clears_keep_best` (anche su `campaign_stars`, con `greatest`). RLS attivo: select, insert e update solo con `user_id = auth.uid()`. `grant select, insert, update` ad `authenticated` |
| 4 | `2026-10-12-matches.sql` | T8 | Tabelle `matches` (`id uuid`, `level jsonb`, `level_source text`, `status`, `created_by`, `opponent_id`, `created_at`, `starts_at`, `ends_at`, `ended_at`, `winner_id`) e `match_players` (`match_id`, `user_id`, `joined_at`, `finished_at`, `cats_used`, `result`). RLS: select solo ai partecipanti. **Nessun** grant di insert, update o delete al client. `alter publication supabase_realtime add table matches, match_players` |
| 5 | `2026-10-12-match-rpc.sql` | T8 | Funzione `cover_is_valid(level jsonb, nodes int[]) returns boolean`. RPC `security definer` con `set search_path = public`: `create_match(opponent uuid, level jsonb)` (verifica amicizia o squad e struttura del livello), `accept_match`, `decline_match` (che porta a `void`), `submit_match(match_id, nodes int[])` (verifica la copertura, scrive `finished_at = now()` e chiude se `used = k`), `forfeit_match`, `close_expired_matches()` (scadenze; chiamabile da cron o al primo accesso). `grant execute` ad `authenticated` |
| 6 | `2026-10-12-match-records.sql` | T8 | Vista `match_records (user_id, played, won, lost, drawn)` per la classifica 1vs1 separata. `grant select` |
| 7 | `2026-10-14-survival-runs.sql` | T7 fase 2 | `survival_runs` (`id`, `user_id`, `started_at` server, `ends_at`, `sites_cleared`, `score`, `status`) e `survival_clears` (`run_id`, `step`, `cats_used`, `par`, `stars`, `cleared_at` server). RPC `start_survival_run()` e `submit_survival_site(run_id, step, level jsonb, nodes int[])`, che rifiuta oltre `ends_at` e riusa `cover_is_valid`. Vista `leaderboard_survival`. RLS: select own e classifica pubblica via vista; nessuna scrittura diretta |
| 8 | `2026-10-16-badges.sql` | T9 | `badges` (catalogo + seed dei 6 badge), `player_badges (user_id, badge_id, earned_at)`, funzioni di award e trigger su `site_clears`, `campaign_clears`, `match_players`. RLS su `player_badges` (select pubblica per profilo; nessuna scrittura client) |
| 9 | `2026-10-18-cosmetics.sql` | T10 | `cosmetics` (catalogo, slot, `unlock_badge_id`), `player_cosmetics`, `player_loadout (user_id, slot, cosmetic_id)`. RPC `set_loadout(slot, cosmetic_id)` che verifica il possesso. Sblocco automatico agganciato all'award dei badge. Nessun prezzo attivo |

Prerequisito per i file 3-9: il file 1 nel repo, perché le migrazioni siano riproducibili su un progetto nuovo.

---

## 6. Incrementi rilasciabili

### Incremento 1 (primo rilascio): dashboard + daily invariata + scheletro campagna

Contiene T1 + T2 + T3 + T4a + scheletro di T6:
- **Dashboard** come nuova home, con quattro card. Daily e campagna attive; survival e 1vs1 in "COMING SOON".
- **Sfida del giorno** identica a oggi per generazione, scoring, salvataggio e leaderboard, raggiunta da dashboard → work order → CLOCK IN, con il copy "giornaliero" corretto.
- **Scheletro campagna.** Mappa dei 7 capitoli (100 livelli), livelli giocabili dalla mappa base del mock con tag "DEV MOCK", sblocco progressivo e stelle di campagna **in memoria di sessione**. Login richiesto per entrare; nessun salvataggio ancora.
- Nessuna migrazione SQL richiesta: si rilascia senza toccare il DB.

Valore: la nuova struttura a modalità è visibile e usabile, il daily non regredisce e il percorso porta → reducer → board è provato su una seconda modalità.

### Incremento 2: persistenza

T5 + T4b (streak) + salvataggio campagna (SQL 1-3).

### Incremento 3: modalità competitive

T7 (survival: fase 1 locale, poi fase 2 con classifica server-side) e T8 (1vs1), in parallelo.

### Incremento 4: gamification

T9 badge, poi T10 cosmetici.

---

## 7. Assunzioni da confermare

Il piano procede con queste scelte, tutte prese dalle raccomandazioni di `design-game-modes.md` salvo dove indicato. Ognuna è reversibile senza rifare i task a monte.

| # | Assunzione adottata | Dove pesa |
|---|---|---|
| D2 | Il daily è "7 siti al giorno": si corregge il copy "settimana"; le leaderboard settimanali restano tali | T4a |
| D6-bis | 100 livelli = 7 capitoli legati ai `SITES`, distribuiti 10/12/14/14/16/16/18; `levelNo` 1..100 come id stabile; nessun gate a stelle tra capitoli | T6, SQL 3 |
| D7 | Campagna: hint ammessi, INSIDER toglie la terza stella. 1vs1 e survival: hint disabilitati. Mai hint a pagamento | T2 (`consulted`), T6, T7, T8 |
| D9-bis | Survival: tempo totale 180 s, nessun bonus per sito, hint off; classifica solo in fase 2 con tempi server | T7, SQL 7 |
| D8-bis | 1vs1: limite 5 min, grace 30 s, matchmaking solo tra amici e squad. Con il mock il livello lo passa il client a `create_match` (validato dal server) | T8, SQL 4-5 |
| D10 | RLS attivo sulle sole tabelle nuove; scritture competitive solo via RPC `security definer`; il fix di `friendships`/`squad_members` è un task separato | T5, SQL 3-9 |
| D11 | Punti solo classifica, nessuna valuta spendibile | T9 |
| D17 | 1vs1 con classifica separata (vinte/perse), niente ELO e nessun punto nelle leaderboard del daily | T8, SQL 6 |
| D18 | 6 badge server-side, mostrati in ID card e profilo | T9, SQL 8 |
| D12 | Cosmetici globali per slot, 2 slot, 2-3 oggetti, 12 frame per oggetto. Chi produce gli asset è da definire | T10 |
| D13-D16 | Monetizzazione fuori piano; cosmetici sbloccabili solo tramite badge finché non si decide; nessun paywall sul daily | T10, fuori piano |
| Orientamento | Il tutorial di primo avvio compare sulla dashboard invece che sul work order | T3 |
| Sessione daily | Resta istanziata in `Shell` (generazione all'avvio come oggi); renderla lazy è rimandato | T3 |
| Schema base | Qualcuno con accesso a Supabase fornisce il dump dello schema di `profiles`/`site_clears` | T5, SQL 1 |
| Mock | 3-5 mappe fisse a rotazione invece di una sola, per non rendere survival e campagna monotone | T1 |

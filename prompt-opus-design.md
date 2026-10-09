# Prompt: progettazione modalità di gioco — Blackout (CATASTROPHE INC.)

Sei nella repo `~/workspace/workspace-indiependentset/blackout`. Leggi prima `CLAUDE.md` (architettura, layer, vincoli di determinismo e unicità della soluzione), poi esplora `app/src/` quanto serve. Non implementare codice: produci un documento di progettazione.

## Input 1 — Backlog (task già creati, tutti "Not started", tipo Feature request)
1. Creare una dashboard di ingresso per accedere alle tre modalità di gioco
2. Modalità "campagna"
3. Modalità "1vs1 multiplayer"
4. Modalità "sfida del giorno"

## Input 2 — Riunione (trascrizione audio, riassunta fedelmente)
- **Daily puzzle**: motiva ad aprire l'app ogni giorno.
- **Story mode / campagna**: dà voglia di portare avanti l'app anche da soli.
- **Multiplayer**: interazione con altre persone. Citata anche una **survival mode** (fare più livelli possibili entro un tempo limite) — non ha un task in backlog: valuta se è variante del multiplayer, modalità a sé, o da rimandare.
- **Contorno gamification**: guadagni punti, vinci premi/badge.
- **Monetizzazione**:
  - microtransazioni **solo estetiche** (es. cappello o cravatta ai gatti) — hanno senso solo grazie al contesto dei gatti;
  - in alternativa/aggiunta subscription o ads; con subscription bisogna decidere quali feature stanno dietro paywall.
  - Nient'altro è stato deciso.
- **Motore livelli (Ferdinando)**: generatore di grafi + **validatore** che scarta i grafi troppo semplici o troppo complicati e tiene quelli con soluzione ottima raggiungibile. È il cuore del gioco e serve a dare livelli sensati sia alla **campagna** sia alla **giornaliera**.

## Cosa voglio dal documento
1. **Stato attuale**: cosa esiste già nel codice che copre questi punti (daily, siti, scoring, leaderboard, generatore/solver in `domain/engine.ts`, eventuale misura di difficoltà). Cita file e righe.
2. **Motore generatore + validatore**: come estendere `engine.ts` con un validatore di difficoltà esplicito (metriche candidate, soglie, dove vive), riusabile da daily e campagna, **senza cambiare i puzzle già generati per i giorni esistenti** (snapshot in `determinism.test.ts`) salvo decisione esplicita.
3. **Dashboard di ingresso**: dove si inserisce nel routing attuale (`src/app/App.tsx`, `WorkOrder`, `StaffOffice`…).
4. **Campagna**: struttura (capitoli/livelli, curva di difficoltà, seed), progressione e persistenza (giocatore anonimo vs autenticato — CLAUDE.md vieta nuova persistenza tipo localStorage senza chiedere), rapporto con i 7 SITES attuali.
5. **1vs1 multiplayer**: matchmaking, stesso puzzle per entrambi, condizione di vittoria, sync via Supabase, equità (tempi server-side), abbandoni. Posizione su survival mode.
6. **Sfida del giorno**: cosa cambia (probabilmente poco) rispetto a oggi.
7. **Gamification e monetizzazione**: punti/badge, modello di dati per cosmetici sui gatti (compatibile con lo sprite system in `src/assets/cats/` e `src/sprites/`), opzioni subscription/ads come **decisioni aperte**, non scelte già fatte.
8. **Modello dati**: tabelle Supabase nuove o estese, RLS, in coerenza con le migrazioni in `app/sql/`.
9. **Rischi** e **ordine di implementazione** mappato sui 4 task di backlog (più eventuali task nuovi da creare).
10. **Domande aperte** per il team: elenca tutto ciò che la riunione non ha deciso. Non inventare risposte; proponi una raccomandazione motivata per ciascuna.

Rispetta i layer e gli standard di `CLAUDE.md`. Rispondi in italiano.

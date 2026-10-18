# Prompt: piano di implementazione modalità di gioco — Blackout

Sei nella repo `~/workspace/workspace-indiependentset/blackout`. Leggi `CLAUDE.md` e il documento di design `design-game-modes.md` (prodotto a partire da `prompt-opus-design.md`). Se nel design ci sono domande aperte senza risposta, fermati e chiedile prima di pianificare le parti che ne dipendono.

**Decisione già presa**: il motore generatore + validatore NON si implementa (è in un altro branch, arriverà dal backend). Campagna e 1vs1 leggono i livelli da un mock dietro una porta `LevelSource` che restituisce una mappa base fissa di tipo `Level`. Vedi la sezione "Decisioni prese" in `design-game-modes.md`. Il daily resta su `makeDay` invariato.

Non scrivere codice. Produci un piano di implementazione:

1. **Task** ordinati, mappati sui 4 task di backlog (dashboard, campagna, 1vs1 multiplayer, sfida del giorno) più i task trasversali (porta `LevelSource` + mock, gamification, cosmetici, schema DB). Per ciascuno: file toccati/creati (rispettando i layer `domain` ← `game`/`services` ← `screens`/`app`), dipendenze da altri task, test richiesti, criterio di "done" (`npm run check` verde).
2. **Percorso minimo invasivo**: riusa `domain/engine.ts`, `game/state/gameReducer.ts`, `Board`, `domain/scoring.ts`; segnala ogni punto dove serve modificarli e perché.
3. **Determinismo**: indica esplicitamente quali task rischiano di cambiare gli snapshot di `src/domain/determinism.test.ts` e come evitarlo.
4. **Migrazioni SQL**: elenco file da aggiungere in `app/sql/`, nel formato di quelli esistenti.
5. **Primo incremento rilasciabile**: la fetta più piccola che porta valore (probabilmente dashboard + daily invariata + scheletro campagna).

Rispondi in italiano.

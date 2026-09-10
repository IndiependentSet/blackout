import { useCallback, useEffect, useState } from 'react';
import {
  getProfile, displayName, searchPlayers, getFriendships, requestFriend, acceptFriend,
  removeFriendship, getMySquads, createSquad, joinSquadByCode, leaveSquad, getSquadMembers,
  getPlayerScore, getBoardFor,
} from './supabase.js';

const luckiest = "'Luckiest Guy', cursive";

const tabHeader = (bg, color) => ({
  alignSelf: 'flex-start', background: bg, border: '3px solid #2A1524', borderRadius: '9px 9px 0 0',
  boxShadow: '0 4px 0 #2A1524', padding: '5px 20px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.06em', color,
});
const card = { background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 16px 16px 16px', boxShadow: '0 6px 0 #2A1524, inset 0 0 36px rgba(150,110,60,.24)', padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 14 };
const row = active => ({ display: 'flex', alignItems: 'center', gap: 10, background: active ? '#FFE9B0' : '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 10, padding: '8px 10px 8px 12px' });
const primaryBtn = (bg, disabled) => ({ minHeight: 50, background: bg, border: '3px solid #2A1524', borderRadius: 12, boxShadow: '0 4px 0 #2A1524', color: '#3E2718', fontFamily: luckiest, fontSize: 14, letterSpacing: '.04em', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 });
const smallBtn = (bg, color) => ({ minHeight: 38, padding: '0 13px', background: bg, border: '2.5px solid #2A1524', borderRadius: 10, color: color || '#3E2718', fontSize: 11.5, fontWeight: 900, letterSpacing: '.05em', cursor: 'pointer' });
const fieldInput = { minHeight: 48, border: '3px solid #2A1524', borderRadius: 12, padding: '0 14px', fontSize: 14.5, fontWeight: 700, color: '#3E2718', background: '#FFF7E6', boxSizing: 'border-box' };

function initial(p) {
  const n = displayName(p).replace('@', '');
  return (n[0] || 'S').toUpperCase();
}

/* Crew Roster & Squads — the social layer opened from the account screen's
   STAFF ID CARD. Own view-stack (crew/squads at top level; profile,
   head-to-head and squad detail as drill-downs) exactly like Crew.dc.html's
   design reference, ported to this app's function-component + hooks style
   instead of that tool's template/logic-class format. */
export default function CrewScreen({ userId, onClose }) {
  const [view, setView] = useState('crew');
  const [tab, setTab] = useState('week');
  const [me, setMe] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friendBoard, setFriendBoard] = useState([]);
  const [squads, setSquads] = useState([]);
  const [squad, setSquad] = useState(null);
  const [squadBoard, setSquadBoard] = useState([]);
  const [squadMembers, setSquadMembers] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [viewScore, setViewScore] = useState(null);
  const [meScore, setMeScore] = useState(null);
  const [newSquadName, setNewSquadName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [squadErrorMsg, setSquadErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const loadCrew = useCallback((t) => {
    getFriendships(userId).then(r => {
      setFriends(r.friends); setIncoming(r.incoming); setOutgoing(r.outgoing);
      const ids = r.friends.map(f => f.person.id).concat([userId]);
      getBoardFor(ids, t || tab).then(setFriendBoard);
    });
  }, [userId, tab]);

  const loadSquads = useCallback(() => {
    getMySquads(userId).then(r => setSquads(r.rows));
  }, [userId]);

  const loadSquadBoard = useCallback((sq, t) => {
    if (!sq) return;
    getSquadMembers(sq.id).then(r => {
      setSquadMembers(r.rows);
      getBoardFor(r.rows.map(m => m.user_id), t || tab).then(setSquadBoard);
    });
  }, [tab]);

  useEffect(() => {
    getProfile(userId).then(setMe);
    loadCrew();
    loadSquads();
    getPlayerScore(userId).then(setMeScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function changeTab(t) {
    setTab(t);
    if (view === 'squad') loadSquadBoard(squad, t);
    else loadCrew(t);
  }

  function runSearch() {
    setSearching(true);
    searchPlayers(query, userId).then(r => { setResults(r.rows); setSearching(false); });
  }

  function relationTo(id) {
    if (friends.some(f => f.person.id === id)) return 'friend';
    if (outgoing.some(f => f.person.id === id)) return 'outgoing';
    if (incoming.some(f => f.person.id === id)) return 'incoming';
    return 'none';
  }

  function addFriend(id) { requestFriend(userId, id).then(() => loadCrew()); }
  function respond(rowId, accept) {
    (accept ? acceptFriend(rowId) : removeFriendship(rowId)).then(() => loadCrew());
  }
  function removeFriendOf(id) {
    const f = friends.find(x => x.person.id === id);
    if (f) removeFriendship(f.row.id).then(() => { loadCrew(); setView('crew'); });
  }
  function openProfile(person) {
    setView('profile'); setViewing(person); setViewScore(null);
    getPlayerScore(person.id).then(setViewScore);
  }

  function doCreateSquad() {
    createSquad(userId, newSquadName).then(r => {
      if (r.error) return setSquadErrorMsg(r.error);
      setNewSquadName(''); setSquadErrorMsg('');
      const sq = { ...r.squad, role: 'foreman', members: 1 };
      setView('squad'); setSquad(sq);
      loadSquads(); loadSquadBoard(sq);
    });
  }
  function doJoinSquad() {
    joinSquadByCode(userId, joinCode).then(r => {
      if (r.error) return setSquadErrorMsg(r.error);
      setJoinCode(''); setSquadErrorMsg('');
      setView('squad'); setSquad(r.squad);
      loadSquads(); loadSquadBoard(r.squad);
    });
  }
  function doLeaveSquad() {
    if (!squad) return;
    leaveSquad(userId, squad.id).then(() => {
      setView('squads'); setSquad(null); setSquadBoard([]);
      loadSquads();
    });
  }
  function copyCode() {
    if (!squad) return;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(squad.invite_code).then(done, done); else done();
  }

  function boardRows(rows) {
    const people = {};
    friends.forEach(f => { people[f.person.id] = f.person; });
    return rows.map((r, i) => ({
      rank: i + 1,
      name: (r.name || 'STAFF') + (r.user_id === userId ? ' (YOU)' : ''),
      score: r.score,
      isSelf: r.user_id === userId,
      person: people[r.user_id] || { id: r.user_id, username: r.name },
    }));
  }

  function back() {
    if (view === 'h2h') setView('profile');
    else if (view === 'profile') { setView('crew'); setViewing(null); }
    else if (view === 'squad') { setView('squads'); setSquad(null); }
    else onClose();
  }

  const drill = view === 'profile' || view === 'h2h' || view === 'squad';
  const atCrew = view === 'crew';
  const atSquads = view === 'squads';
  const rel = viewing ? relationTo(viewing.id) : 'none';
  const vs = viewScore || { score: 0, week_score: 0 };
  const ms = meScore || { score: 0, week_score: 0 };
  const bar = (a, b) => { const m = Math.max(a, b, 1); return [Math.round((a / m) * 46), Math.round((b / m) * 46)]; };
  const [wl, wr] = bar(ms.week_score, vs.week_score);
  const [al, ar] = bar(ms.score, vs.score);

  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', padding: '22px 16px 40px', color: '#F4E4C4', background: 'radial-gradient(120% 90% at 50% 0%, #2A1B3D 0%, #170F22 55%, #100A18 100%)', fontFamily: "'Nunito', ui-rounded, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={back} style={{ minHeight: 44, padding: '0 16px', background: 'rgba(255,255,255,.08)', border: '3px solid #2A1524', borderRadius: 12, color: '#F4E4C4', fontSize: 12.5, fontWeight: 900, letterSpacing: '.08em', cursor: 'pointer' }}>{drill ? '‹ BACK' : '‹ BACK TO SITE'}</button>
          <div style={{ fontFamily: luckiest, fontSize: 20, letterSpacing: '.03em', color: '#F7B32B', WebkitTextStroke: '4px #2A1524', paintOrder: 'stroke fill' }}>CREW ROSTER</div>
        </div>

        {!drill && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setView('crew')}
              style={{ flex: 1, minHeight: 48, background: view === 'crew' ? '#FFD469' : '#E4D7BC', border: '3px solid #2A1524', borderRadius: 12, boxShadow: '0 4px 0 #2A1524', color: '#3E2718', fontFamily: luckiest, fontSize: 15, letterSpacing: '.04em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span>WORKMATES</span>
              {incoming.length > 0 && (
                <span style={{ minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', background: '#F06BFF', border: '2px solid #2A1524', borderRadius: 10, fontSize: 11, fontWeight: 900, color: '#2A1524', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{incoming.length}</span>
              )}
            </button>
            <button type="button" onClick={() => setView('squads')}
              style={{ flex: 1, minHeight: 48, background: view === 'squads' ? '#FFD469' : '#E4D7BC', border: '3px solid #2A1524', borderRadius: 12, boxShadow: '0 4px 0 #2A1524', color: '#3E2718', fontFamily: luckiest, fontSize: 15, letterSpacing: '.04em', cursor: 'pointer' }}>SQUADS</button>
          </div>
        )}

        {atCrew && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={tabHeader('#6E3FA3', '#FFD469')}>FIND A WORKMATE</div>
              <div style={{ ...card, padding: 16, boxShadow: '0 6px 0 #2A1524' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="handle or code, e.g. CAT-7K2P"
                    style={{ ...fieldInput, flex: '1 1 200px' }} />
                  <button type="button" onClick={runSearch}
                    style={{ minHeight: 48, padding: '0 20px', background: '#FFD469', border: '3px solid #2A1524', borderRadius: 12, boxShadow: '0 4px 0 #2A1524', color: '#3E2718', fontFamily: luckiest, fontSize: 14, letterSpacing: '.04em', cursor: 'pointer' }}>{searching ? '…' : 'SEARCH'}</button>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.04em', color: '#7A5638', lineHeight: 1.5 }}>SEARCH BY HANDLE OR PERSONAL CODE ONLY &mdash; NEVER BY EMAIL. YOUR OWN CODE: <span style={{ color: '#8A3FC0' }}>{(me && me.invite_code) || '—'}</span></div>
                {!!(results && results.length) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '2.5px dashed rgba(62,39,24,.3)', paddingTop: 12 }}>
                    {results.map(p => {
                      const r = relationTo(p.id);
                      const label = r === 'friend' ? 'WORKMATE' : r === 'outgoing' ? 'SENT' : r === 'incoming' ? 'ANSWER' : 'ADD';
                      return (
                        <div key={p.id} style={row(false)}>
                          <span style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', background: '#6E3FA3', border: '2.5px solid #2A1524', color: '#FFD469', fontFamily: luckiest, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initial(p)}</span>
                          <button type="button" onClick={() => openProfile(p)} style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14, fontWeight: 900, color: '#3E2718' }}>{displayName(p)}</button>
                          <button type="button" disabled={r !== 'none'} onClick={() => { if (r === 'none') addFriend(p.id); }}
                            style={{ ...smallBtn(r === 'none' ? '#FFD469' : '#F4E4C4'), opacity: r === 'none' ? 1 : 0.6, cursor: r === 'none' ? 'pointer' : 'default' }}>{label}</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!!(results && !results.length) && (
                  <div style={{ borderTop: '2.5px dashed rgba(62,39,24,.3)', paddingTop: 14, textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: '#7A5638' }}>NOBODY ON FILE UNDER THAT NAME.</div>
                )}
              </div>
            </div>

            {incoming.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={tabHeader('#C877D8', '#3E1B4A')}>TRANSFER REQUESTS</div>
                <div style={{ ...card, padding: 10, boxShadow: '0 6px 0 #2A1524' }}>
                  {incoming.map(f => (
                    <div key={f.row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#FFE9B0', border: '2.5px solid #2A1524', borderRadius: 10, padding: '8px 10px 8px 12px' }}>
                      <span style={{ flex: '1 1 120px', fontSize: 14, fontWeight: 900, color: '#3E2718' }}>{displayName(f.person)}</span>
                      <button type="button" onClick={() => respond(f.row.id, true)} style={smallBtn('#FFD469')}>ACCEPT</button>
                      <button type="button" onClick={() => respond(f.row.id, false)} style={smallBtn('#FFF7E6', '#7A5638')}>DECLINE</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={tabHeader('#6E3FA3', '#FFD469')}>WORKMATE BOARD</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <button type="button" onClick={() => changeTab('week')} style={{ minHeight: 30, padding: '0 12px', background: tab === 'week' ? '#FFD469' : '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 9, color: '#3E2718', fontSize: 11, fontWeight: 900, letterSpacing: '.04em', cursor: 'pointer' }}>THIS WEEK</button>
                  <button type="button" onClick={() => changeTab('allTime')} style={{ minHeight: 30, padding: '0 12px', background: tab === 'allTime' ? '#FFD469' : '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 9, color: '#3E2718', fontSize: 11, fontWeight: 900, letterSpacing: '.04em', cursor: 'pointer' }}>ALL-TIME</button>
                </div>
              </div>
              <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 16px 16px 16px', boxShadow: '0 6px 0 #2A1524', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {friends.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '18px 10px', fontSize: 12.5, fontWeight: 800, color: '#7A5638', lineHeight: 1.5 }}>NO WORKMATES YET. SEARCH A HANDLE ABOVE, OR PASS YOUR CODE <span style={{ color: '#8A3FC0' }}>{(me && me.invite_code) || '—'}</span> TO A FRIEND.</div>
                )}
                {boardRows(friendBoard).map(r => (
                  <div key={r.rank} style={row(r.isSelf)}>
                    <span style={{ flex: 'none', width: 24, fontFamily: luckiest, fontSize: 14, color: r.rank === 1 ? '#B8860B' : '#8A3FC0' }}>{r.rank}</span>
                    <button type="button" disabled={r.isSelf} onClick={() => { if (!r.isSelf) openProfile(r.person); }}
                      style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: r.isSelf ? 'default' : 'pointer', fontSize: 13.5, fontWeight: 800, color: '#3E2718' }}>{r.name}</button>
                    <span style={{ fontFamily: luckiest, fontSize: 15, color: '#8A3FC0' }}>{r.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {outgoing.length > 0 && (
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.05em', color: '#8E7AAE', lineHeight: 1.6 }}>AWAITING SIGN-OFF: {outgoing.map(f => displayName(f.person)).join(', ')}</div>
            )}
          </div>
        )}

        {view === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={tabHeader('#C877D8', '#3E1B4A')}>PERSONNEL FILE</div>
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 'none', width: 54, height: 54, borderRadius: '50%', background: '#6E3FA3', border: '3px solid #2A1524', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: luckiest, fontSize: 22, color: '#FFD469' }}>{initial(viewing)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontFamily: luckiest, fontSize: 22, color: '#3E2718' }}>{displayName(viewing)}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.05em', color: '#6A4A30' }}>
                      {rel === 'friend' ? 'ON YOUR CREW' : rel === 'outgoing' ? 'REQUEST SENT' : rel === 'incoming' ? 'WANTS TO JOIN YOUR CREW' : 'NOT ON YOUR CREW'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 130px', background: '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ fontFamily: luckiest, fontSize: 18, color: '#3E2718' }}>{vs.week_score}/7</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#7A5638' }}>THIS WEEK ON BUDGET</div>
                  </div>
                  <div style={{ flex: '1 1 130px', background: '#EBD4F5', border: '2.5px solid #2A1524', borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ fontFamily: luckiest, fontSize: 18, color: '#3E1B4A' }}>{vs.score}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#6E3FA3' }}>ALL-TIME SITES CLEARED</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" disabled={rel === 'outgoing'}
                    onClick={() => {
                      if (rel === 'none') addFriend(viewing.id);
                      else if (rel === 'friend') removeFriendOf(viewing.id);
                      else if (rel === 'incoming') {
                        const f = incoming.find(x => x.person.id === viewing.id);
                        if (f) respond(f.row.id, true);
                      }
                    }}
                    style={{ ...primaryBtn(rel === 'outgoing' ? '#E4D7BC' : rel === 'friend' ? '#F4E4C4' : '#FFD469', rel === 'outgoing'), flex: '1 1 150px' }}>
                    {rel === 'friend' ? 'REMOVE FROM CREW' : rel === 'outgoing' ? 'REQUEST PENDING' : rel === 'incoming' ? 'ACCEPT REQUEST' : 'SEND CREW REQUEST'}
                  </button>
                  {rel === 'friend' && (
                    <button type="button" onClick={() => setView('h2h')} style={{ ...primaryBtn('#FFD469'), flex: '1 1 150px' }}>HEAD TO HEAD</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'h2h' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={tabHeader('#6E3FA3', '#FFD469')}>SITE-BY-SITE COMPARISON</div>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontFamily: luckiest, fontSize: 17, color: '#3E2718' }}>{displayName(me)}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#7A5638' }}>YOU</div>
                </div>
                <div style={{ fontFamily: luckiest, fontSize: 15, color: '#8A3FC0', paddingBottom: 4 }}>VS</div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontFamily: luckiest, fontSize: 17, color: '#3E2718' }}>{displayName(viewing)}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#7A5638' }}>WORKMATE</div>
                </div>
              </div>
              {[
                { label: 'THIS WEEK', left: ms.week_score, right: vs.week_score, leftPct: wl, rightPct: wr },
                { label: 'ALL-TIME', left: ms.score, right: vs.score, leftPct: al, rightPct: ar },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: luckiest, fontSize: 20, color: r.left >= r.right ? '#8A3FC0' : '#7A5638' }}>{r.left}</span>
                    <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.1em', color: '#7A5638' }}>{r.label}</span>
                    <span style={{ fontFamily: luckiest, fontSize: 20, color: r.right >= r.left ? '#8A3FC0' : '#7A5638' }}>{r.right}</span>
                  </div>
                  <div style={{ height: 14, background: '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: r.leftPct + '%', background: '#8A3FC0' }} />
                    <div style={{ flex: 1, background: '#FFE9B0' }} />
                    <div style={{ width: r.rightPct + '%', background: '#C877D8' }} />
                  </div>
                </div>
              ))}
              <div style={{ fontFamily: luckiest, fontSize: 16, color: '#8A3FC0', textAlign: 'center' }}>
                {ms.score === vs.score ? 'DEAD HEAT — SOMEBODY HIRE MORE CATS'
                  : ms.score > vs.score ? "YOU’RE AHEAD BY " + (ms.score - vs.score) + ' SITES'
                    : 'BEHIND BY ' + (vs.score - ms.score) + ' SITES'}
              </div>
            </div>
          </div>
        )}

        {atSquads && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={tabHeader('#6E3FA3', '#FFD469')}>YOUR SQUADS</div>
              <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 16px 16px 16px', boxShadow: '0 6px 0 #2A1524', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {squads.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '18px 10px', fontSize: 12.5, fontWeight: 800, color: '#7A5638' }}>NO SQUADS YET. START ONE BELOW, OR JOIN WITH A CODE.</div>
                )}
                {squads.map(s => (
                  <button key={s.id} type="button" onClick={() => { setView('squad'); setSquad(s); loadSquadBoard(s); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                    <span style={{ flex: 1, fontFamily: luckiest, fontSize: 16, color: '#3E2718' }}>{s.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.05em', color: '#7A5638' }}>{s.members + (s.members === 1 ? ' MEMBER' : ' MEMBERS') + (s.role === 'foreman' ? ' · FOREMAN' : '')}</span>
                    <span style={{ fontFamily: luckiest, fontSize: 16, color: '#8A3FC0' }}>&rsaquo;</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...tabHeader('#C877D8', '#3E1B4A'), fontSize: 14, padding: '5px 18px' }}>START A SQUAD</div>
                <div style={{ ...card, padding: 15, boxShadow: '0 6px 0 #2A1524' }}>
                  <input type="text" value={newSquadName} onChange={e => { setNewSquadName(e.target.value); setSquadErrorMsg(''); }} placeholder="Night Shift Wreckers" style={fieldInput} />
                  <button type="button" onClick={doCreateSquad} style={primaryBtn('#FFD469')}>CREATE &amp; GET CODE</button>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#7A5638', lineHeight: 1.5 }}>You become foreman. Share the code and anyone who has it can join.</div>
                </div>
              </div>

              <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ ...tabHeader('#C877D8', '#3E1B4A'), fontSize: 14, padding: '5px 18px' }}>JOIN WITH A CODE</div>
                <div style={{ ...card, padding: 15, boxShadow: '0 6px 0 #2A1524' }}>
                  <input type="text" value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setSquadErrorMsg(''); }} placeholder="SITE-4M9X"
                    style={{ ...fieldInput, fontSize: 15, fontWeight: 800, letterSpacing: '.08em' }} />
                  <button type="button" onClick={doJoinSquad} style={primaryBtn('#F4E4C4')}>CLOCK ON TO SQUAD</button>
                  {!!squadErrorMsg && <div style={{ fontSize: 12, fontWeight: 800, color: '#C0405A' }}>{squadErrorMsg}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'squad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={tabHeader('#6E3FA3', '#FFD469')}>{(squad && squad.name) || 'SQUAD'}</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <button type="button" onClick={() => changeTab('week')} style={{ minHeight: 30, padding: '0 12px', background: tab === 'week' ? '#FFD469' : '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 9, color: '#3E2718', fontSize: 11, fontWeight: 900, letterSpacing: '.04em', cursor: 'pointer' }}>THIS WEEK</button>
                  <button type="button" onClick={() => changeTab('allTime')} style={{ minHeight: 30, padding: '0 12px', background: tab === 'allTime' ? '#FFD469' : '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 9, color: '#3E2718', fontSize: 11, fontWeight: 900, letterSpacing: '.04em', cursor: 'pointer' }}>ALL-TIME</button>
                </div>
              </div>
              <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 16px 16px 16px', boxShadow: '0 6px 0 #2A1524', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {boardRows(squadBoard).map(r => (
                  <div key={r.rank} style={row(r.isSelf)}>
                    <span style={{ flex: 'none', width: 24, fontFamily: luckiest, fontSize: 14, color: r.rank === 1 ? '#B8860B' : '#8A3FC0' }}>{r.rank}</span>
                    <button type="button" disabled={r.isSelf} onClick={() => { if (!r.isSelf) openProfile(r.person); }}
                      style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: r.isSelf ? 'default' : 'pointer', fontSize: 13.5, fontWeight: 800, color: '#3E2718' }}>{r.name}</button>
                    <span style={{ fontFamily: luckiest, fontSize: 15, color: '#8A3FC0' }}>{r.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...tabHeader('#C877D8', '#3E1B4A'), fontSize: 14, padding: '5px 18px' }}>SITE PASS</div>
              <div style={{ ...card, padding: 16, boxShadow: '0 6px 0 #2A1524' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 150px', background: '#FFF7E6', border: '2.5px dashed #2A1524', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.12em', color: '#7A5638' }}>INVITE CODE</div>
                    <div style={{ fontFamily: luckiest, fontSize: 22, letterSpacing: '.08em', color: '#8A3FC0' }}>{(squad && squad.invite_code) || '—'}</div>
                  </div>
                  <button type="button" onClick={copyCode} style={{ minHeight: 46, padding: '0 18px', background: '#FFD469', border: '3px solid #2A1524', borderRadius: 12, boxShadow: '0 4px 0 #2A1524', color: '#3E2718', fontFamily: luckiest, fontSize: 13, letterSpacing: '.04em', cursor: 'pointer' }}>{copied ? 'COPIED!' : 'COPY CODE'}</button>
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#7A5638', lineHeight: 1.5 }}>{squadMembers.length + (squadMembers.length === 1 ? ' member on site' : ' members on site') + '. Anyone with the code can clock on.'}</div>
                <button type="button" onClick={doLeaveSquad} style={{ alignSelf: 'flex-start', minHeight: 42, padding: '0 16px', background: '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 10, color: '#C0405A', fontSize: 11.5, fontWeight: 900, letterSpacing: '.06em', cursor: 'pointer' }}>
                  {squad && squad.role === 'foreman' ? "LEAVE SQUAD (YOU’RE FOREMAN)" : 'LEAVE SQUAD'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

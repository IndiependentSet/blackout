import { useCallback, useEffect, useState } from 'react';
import { supabase, nickFromEmail, ensureProfile, getProfile, updateNickname, getAllTimeCount, getLeaderboard } from './supabase.js';

const EMAIL_RE = /\S+@\S+\.\S+/;
const luckiest = "'Luckiest Guy', cursive";

/* STAFF OFFICE: optional passwordless account + leaderboard, layered over
   the game as its own full-page screen. Sign-in state is derived purely
   from Supabase's own session (getSession + onAuthStateChange), never from
   app-owned storage, so this and the badge in CatCoverGame always agree. */
export default function AccountScreen({ onClose, weeklyResults, onNicknameChange }) {
  const [step, setStep] = useState('loading');
  const [typedEmail, setTypedEmail] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState('');
  const [savingNick, setSavingNick] = useState(false);
  const [nickErr, setNickErr] = useState('');
  const [tab, setTab] = useState('week');
  const [board, setBoard] = useState([]);
  const [boardErr, setBoardErr] = useState('');
  const [allTime, setAllTime] = useState(0);
  const [allTimeErr, setAllTimeErr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const applySession = useCallback(session => {
    const user = session && session.user;
    if (user) {
      setStep('in');
      setEmail(user.email);
      setUserId(user.id);
      ensureProfile(user).then(() => {
        getAllTimeCount(user.id).then(({ count, error }) => { setAllTime(count); setAllTimeErr(error || ''); });
        getProfile(user.id).then(p => setNickname((p && p.nickname) || nickFromEmail(user.email)));
      });
    } else {
      setStep(s => (s === 'sent' ? 'sent' : 'signin'));
      setEmail('');
      setUserId(null);
      setAllTime(0);
      setAllTimeErr('');
      setNickname('');
      setEditingNick(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => applySession(session));
    return () => sub.subscription.unsubscribe();
  }, [applySession]);

  useEffect(() => {
    getLeaderboard(tab).then(({ rows, error }) => { setBoard(rows); setBoardErr(error || ''); });
  }, [tab]);

  function onEmailChange(e) {
    setTypedEmail(e.target.value);
    setErrorMsg('');
  }
  function sendLink() {
    const v = (typedEmail || '').trim();
    if (!EMAIL_RE.test(v)) return;
    setStep('sending');
    supabase.auth.signInWithOtp({ email: v, options: { emailRedirectTo: window.location.href } }).then(({ error }) => {
      if (error) { setStep('signin'); setErrorMsg(error.message); }
      else setStep('sent');
    });
  }
  function backToSignin(e) {
    e.preventDefault();
    setStep('signin');
    setErrorMsg('');
  }
  function signOut() { supabase.auth.signOut(); }

  function startEditNick() { setNickDraft(nickname); setNickErr(''); setEditingNick(true); }
  function cancelEditNick() { setEditingNick(false); setNickErr(''); }
  function saveNickname() {
    setSavingNick(true);
    updateNickname(userId, nickDraft).then(({ error, nickname: saved }) => {
      setSavingNick(false);
      if (error) { setNickErr(error); return; }
      setNickname(saved);
      setEditingNick(false);
      if (onNicknameChange) onNicknameChange(saved);
    });
  }

  const weeklyPerfect = (weeklyResults || []).filter(r => r === 'perfect').length;
  const validEmail = EMAIL_RE.test(typedEmail || '');
  const busy = step === 'sending';

  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', padding: '22px 16px 40px', color: '#F4E4C4', background: 'radial-gradient(120% 90% at 50% 0%, #2A1B3D 0%, #170F22 55%, #100A18 100%)', fontFamily: "'Nunito', ui-rounded, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={onClose} style={{ minHeight: 44, padding: '0 16px', background: 'rgba(255,255,255,.08)', border: '3px solid #2A1524', borderRadius: 12, color: '#F4E4C4', fontSize: 12.5, fontWeight: 900, letterSpacing: '.08em', cursor: 'pointer' }}>&#8249; BACK TO SITE</button>
          <div style={{ fontFamily: luckiest, fontSize: 20, letterSpacing: '.03em', color: '#F7B32B', WebkitTextStroke: '4px #2A1524', paintOrder: 'stroke fill' }}>STAFF OFFICE</div>
        </div>

        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, fontWeight: 800, letterSpacing: '.1em', color: '#8E7AAE' }}>CHECKING BADGE&hellip;</div>
        )}

        {(step === 'signin' || step === 'sending') && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ alignSelf: 'flex-start', background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: '9px 9px 0 0', boxShadow: '0 4px 0 #2A1524', padding: '5px 20px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.06em', color: '#FFD469' }}>STAFF SIGN-IN</div>
            <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 16px 16px 16px', boxShadow: '0 6px 0 #2A1524, inset 0 0 36px rgba(150,110,60,.24)', padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: luckiest, fontSize: 22, lineHeight: 1.22, color: '#3E2718', textWrap: 'pretty' }}>PUNCH IN WITH YOUR WORK EMAIL. <span style={{ color: '#8A3FC0' }}>NO PASSWORD.</span></div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: '#5A3E27' }}>We'll send a one-tap punch-in link. Use it to keep your invoice history and see how you rank against the rest of the crew.</div>
              <input type="email" value={typedEmail} onChange={onEmailChange} placeholder="you@yourcompany.com"
                style={{ minHeight: 50, border: '3px solid #2A1524', borderRadius: 12, padding: '0 16px', fontSize: 15, fontWeight: 700, color: '#3E2718', background: '#FFF7E6', boxSizing: 'border-box' }} />
              {!!errorMsg && <div style={{ fontSize: 12.5, fontWeight: 800, color: '#C0405A' }}>{errorMsg}</div>}
              <button type="button" onClick={sendLink} disabled={busy || !validEmail}
                style={{ minHeight: 56, background: validEmail ? '#FFD469' : '#E4D7BC', border: '3px solid #2A1524', borderRadius: 14, boxShadow: '0 4px 0 #2A1524', color: '#3E2718', fontFamily: luckiest, fontSize: 16, letterSpacing: '.04em', cursor: 'pointer', opacity: busy ? 0.7 : validEmail ? 1 : 0.6 }}>{busy ? 'SENDING…' : 'SEND PUNCH-IN LINK'}</button>
            </div>
          </div>
        )}

        {step === 'sent' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ alignSelf: 'flex-start', background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: '9px 9px 0 0', boxShadow: '0 4px 0 #2A1524', padding: '5px 20px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.06em', color: '#FFD469' }}>CHECK YOUR INBOX</div>
            <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 16px 16px 16px', boxShadow: '0 6px 0 #2A1524, inset 0 0 36px rgba(150,110,60,.24)', padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: luckiest, fontSize: 20, lineHeight: 1.22, color: '#3E2718', textWrap: 'pretty' }}>A PUNCH-IN LINK IS ON ITS WAY TO <span style={{ color: '#8A3FC0' }}>{typedEmail}</span></div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: '#5A3E27' }}>Tap the link in that email on this device and you're clocked in. Didn't get it? Check spam, or the mailroom cat probably sat on it.</div>
              <a href="#" onClick={backToSignin} style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.05em', color: '#8A3FC0' }}>&#8249; use a different email</a>
            </div>
          </div>
        )}

        {step === 'in' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ alignSelf: 'flex-start', background: '#C877D8', border: '3px solid #2A1524', borderRadius: '9px 9px 0 0', boxShadow: '0 4px 0 #2A1524', padding: '5px 20px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.06em', color: '#3E1B4A' }}>STAFF ID CARD</div>
              <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 16px 16px 16px', boxShadow: '0 6px 0 #2A1524, inset 0 0 36px rgba(150,110,60,.24)', padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 'none', width: 54, height: 54, borderRadius: '50%', background: '#6E3FA3', border: '3px solid #2A1524', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: luckiest, fontSize: 22, color: '#FFD469' }}>{nickname.slice(0, 1) || 'S'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    {!editingNick ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontFamily: luckiest, fontSize: 20, color: '#3E2718' }}>{nickname}</div>
                        <button type="button" onClick={startEditNick} style={{ minHeight: 24, padding: '0 9px', background: '#FFF7E6', border: '2px solid #2A1524', borderRadius: 7, color: '#3E2718', fontSize: 10, fontWeight: 900, letterSpacing: '.05em', cursor: 'pointer' }}>EDIT</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <input value={nickDraft} onChange={e => setNickDraft(e.target.value)} maxLength={24} autoFocus
                          style={{ minHeight: 34, width: 160, border: '2.5px solid #2A1524', borderRadius: 8, padding: '0 10px', fontSize: 14, fontWeight: 800, color: '#3E2718', background: '#FFF7E6', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" disabled={savingNick} onClick={saveNickname} style={{ minHeight: 26, padding: '0 11px', background: '#FFD469', border: '2px solid #2A1524', borderRadius: 7, color: '#3E2718', fontSize: 10, fontWeight: 900, letterSpacing: '.05em', cursor: 'pointer', opacity: savingNick ? 0.7 : 1 }}>{savingNick ? 'SAVING…' : 'SAVE'}</button>
                          <button type="button" disabled={savingNick} onClick={cancelEditNick} style={{ minHeight: 26, padding: '0 11px', background: '#FFF7E6', border: '2px solid #2A1524', borderRadius: 7, color: '#3E2718', fontSize: 10, fontWeight: 900, letterSpacing: '.05em', cursor: 'pointer' }}>CANCEL</button>
                        </div>
                      </div>
                    )}
                    {!!nickErr && <div style={{ fontSize: 11, fontWeight: 800, color: '#C0405A' }}>{nickErr}</div>}
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#6A4A30' }}>{email}</div>
                  </div>
                  <button type="button" onClick={signOut} style={{ marginLeft: 'auto', minHeight: 40, padding: '0 14px', background: '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 10, color: '#3E2718', fontSize: 11.5, fontWeight: 900, letterSpacing: '.06em', cursor: 'pointer' }}>CLOCK OUT</button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px', background: '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ fontFamily: luckiest, fontSize: 18, color: '#3E2718' }}>{weeklyPerfect}/7</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#7A5638' }}>THIS WEEK PURR-FECT</div>
                  </div>
                  <div style={{ flex: '1 1 140px', background: '#EBD4F5', border: '2.5px solid #2A1524', borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ fontFamily: luckiest, fontSize: 18, color: '#3E1B4A' }}>{allTime}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#6E3FA3' }}>ALL-TIME SITES CLEARED</div>
                  </div>
                </div>
                {!!allTimeErr && <div style={{ fontSize: 11, fontWeight: 800, color: '#C0405A' }}>COULDN'T LOAD STATS — {allTimeErr}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                <div style={{ background: '#6E3FA3', border: '3px solid #2A1524', borderRadius: '9px 9px 0 0', boxShadow: '0 4px 0 #2A1524', padding: '5px 20px', fontFamily: luckiest, fontSize: 15, letterSpacing: '.06em', color: '#FFD469' }}>CREW LEADERBOARD</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <button type="button" onClick={() => setTab('week')} style={{ minHeight: 30, padding: '0 12px', background: tab === 'week' ? '#FFD469' : '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 9, color: '#3E2718', fontSize: 11, fontWeight: 900, letterSpacing: '.04em', cursor: 'pointer' }}>THIS WEEK</button>
                  <button type="button" onClick={() => setTab('allTime')} style={{ minHeight: 30, padding: '0 12px', background: tab === 'allTime' ? '#FFD469' : '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 9, color: '#3E2718', fontSize: 11, fontWeight: 900, letterSpacing: '.04em', cursor: 'pointer' }}>ALL-TIME</button>
                </div>
              </div>
              <div style={{ background: 'linear-gradient(#F6E8CA, #EBD8AE)', border: '3px solid #2A1524', borderRadius: '4px 16px 16px 16px', boxShadow: '0 6px 0 #2A1524', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {!!boardErr && (
                  <div style={{ textAlign: 'center', padding: '16px 8px', fontSize: 12.5, fontWeight: 800, color: '#C0405A' }}>COULDN'T LOAD THE BOARD &mdash; {boardErr}</div>
                )}
                {!boardErr && board.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 8px', fontSize: 12.5, fontWeight: 800, color: '#7A5638' }}>NO CLEARS ON THE BOARD YET &mdash; BE THE FIRST.</div>
                )}
                {board.map((row, i) => (
                  <div key={row.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: row.user_id === userId ? '#FFE9B0' : '#FFF7E6', border: '2.5px solid #2A1524', borderRadius: 10, padding: '8px 12px' }}>
                    <span style={{ flex: 'none', width: 24, fontFamily: luckiest, fontSize: 14, color: i === 0 ? '#B8860B' : '#8A3FC0' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: '#3E2718' }}>{row.nickname}{row.user_id === userId ? ' (YOU)' : ''}</span>
                    <span style={{ fontFamily: luckiest, fontSize: 15, color: '#8A3FC0' }}>{row.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

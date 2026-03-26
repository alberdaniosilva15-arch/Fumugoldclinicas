// ═══════════════════════════════════════════════════════════
//  FumuGold V4 — LoginScreen
//  Autenticação real via Supabase Auth (email + password)
//  SEM passwords hardcoded, SEM ADMIN_PASS
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { G } from '../theme.js';
import { signIn } from '../auth/supabaseAuth.js';

const SUPA_OK = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [phase,    setPhase]    = useState(0);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const login = async () => {
    if (!email.trim() || !password) { setError('Preenche o email e a password.'); return; }
    if (!SUPA_OK) { setError('Supabase não configurado. Verifica o .env'); return; }
    setLoading(true);
    setError('');
    const { ok, session, error: err } = await signIn(email, password);
    if (ok) { onLogin(session); }
    else { setError(err || 'Erro de autenticação.'); setLoading(false); }
  };

  const inp = {
    width:'100%', padding:'11px 14px',
    fontFamily:'Rajdhani', fontSize:13, color:G.text,
    background:'rgba(212,175,55,0.04)',
    border:`1px solid rgba(212,175,55,0.28)`,
    borderRadius:3, outline:'none', boxSizing:'border-box',
  };

  return (
    <div style={{width:'100vw',height:'100vh',background:G.bg,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');
        @keyframes blinkL{0%,100%{opacity:1;}50%{opacity:0.3;}}
        @keyframes spinL{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes pFloat{0%{transform:translateY(0);opacity:0.4;}50%{opacity:0.7;}100%{transform:translateY(-80px);opacity:0;}}
        @keyframes fUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0.2);}50%{box-shadow:0 0 0 8px rgba(212,175,55,0);}}
        .fg-inp:focus{border-color:rgba(212,175,55,0.7)!important;box-shadow:0 0 12px rgba(212,175,55,0.1);}
        .fg-btn2{transition:all 0.2s;}
        .fg-btn2:hover:not(:disabled){background:rgba(212,175,55,0.18)!important;box-shadow:0 0 20px rgba(212,175,55,0.15);}
      `}</style>

      {/* Partículas fundo */}
      {[...Array(18)].map((_,i)=>(
        <div key={i} style={{position:'absolute',left:`${5+(i*5.5)%90}%`,top:`${10+(i*7.3)%80}%`,
          width:i%3===0?3:1.5,height:i%3===0?3:1.5,borderRadius:'50%',
          background:i%4===0?G.gold:i%4===1?G.teal:G.goldD,opacity:0.12+(i%5)*0.04,
          animation:`pFloat ${4+(i%4)}s ${i*0.3}s ease-in-out infinite`,pointerEvents:'none'}}/>
      ))}

      {/* Grid */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',
        backgroundImage:`linear-gradient(rgba(212,175,55,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.03) 1px,transparent 1px)`,
        backgroundSize:'44px 44px'}}/>

      {/* Card */}
      <div style={{width:420,position:'relative',zIndex:10,
        opacity:phase>=1?1:0,animation:phase>=1?'fUp 0.6s ease forwards':'none'}}>
        {/* Cantos */}
        {[{top:-1,left:-1,borderTop:`2px solid ${G.gold}`,borderLeft:`2px solid ${G.gold}`},
          {top:-1,right:-1,borderTop:`2px solid ${G.gold}`,borderRight:`2px solid ${G.gold}`},
          {bottom:-1,left:-1,borderBottom:`2px solid ${G.gold}`,borderLeft:`2px solid ${G.gold}`},
          {bottom:-1,right:-1,borderBottom:`2px solid ${G.gold}`,borderRight:`2px solid ${G.gold}`}
        ].map((s,i)=><div key={i} style={{position:'absolute',width:14,height:14,...s}}/>)}

        <div style={{background:'rgba(8,5,1,0.97)',border:`1px solid rgba(212,175,55,0.18)`,
          borderRadius:4,padding:'36px 36px 28px',
          boxShadow:'0 0 60px rgba(0,0,0,0.8),0 0 100px rgba(212,175,55,0.04)'}}>

          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:32}}>
            <div style={{fontFamily:'Cinzel',fontSize:28,fontWeight:900,letterSpacing:6,color:G.gold,
              textShadow:`0 0 30px rgba(212,175,55,0.5),0 0 60px rgba(212,175,55,0.2)`,
              animation:phase>=2?'glow 3s ease-in-out infinite':'none'}}>FUMUGOLD</div>
            <div style={{fontFamily:'Orbitron',fontSize:7.5,color:G.dimL,letterSpacing:4,marginTop:6,
              opacity:phase>=2?1:0,transition:'opacity 0.8s ease 0.4s'}}>
              SISTEMA CLÍNICO AVANÇADO · v4.0
            </div>
            <div style={{width:80,height:1,margin:'14px auto 0',
              background:`linear-gradient(90deg,transparent,${G.gold},transparent)`,
              opacity:phase>=2?1:0,transition:'opacity 0.8s ease 0.6s'}}/>
          </div>

          {/* Aviso sem config */}
          {!SUPA_OK && (
            <div style={{padding:'10px 14px',marginBottom:18,borderRadius:3,
              background:'rgba(255,153,0,0.08)',border:'1px solid rgba(255,153,0,0.35)',
              fontFamily:'Rajdhani',fontSize:11,color:G.amber,lineHeight:1.6}}>
              ⚠ <strong>Supabase não configurado.</strong><br/>
              Preenche <code style={{color:G.gold}}>VITE_SUPABASE_URL</code> e <code style={{color:G.gold}}>VITE_SUPABASE_ANON_KEY</code> no <code>.env</code>.
              Depois cria o utilizador admin via SQL Editor (ver SETUP_GUIDE.md).
            </div>
          )}

          {/* Email */}
          <div style={{marginBottom:14,opacity:phase>=3?1:0,transition:'opacity 0.5s ease'}}>
            <div style={{fontFamily:'Orbitron',fontSize:7.5,color:G.dimL,letterSpacing:2,marginBottom:6}}>EMAIL</div>
            <input className="fg-inp" type="email" value={email}
              onChange={e=>{setEmail(e.target.value);setError('');}}
              onKeyDown={e=>e.key==='Enter'&&login()}
              placeholder="medico@fumugold.ao" autoComplete="email" disabled={loading}
              style={inp}/>
          </div>

          {/* Password */}
          <div style={{marginBottom:20,opacity:phase>=3?1:0,transition:'opacity 0.5s ease 0.1s',position:'relative'}}>
            <div style={{fontFamily:'Orbitron',fontSize:7.5,color:G.dimL,letterSpacing:2,marginBottom:6}}>PASSWORD</div>
            <div style={{position:'relative'}}>
              <input className="fg-inp" type={showPass?'text':'password'} value={password}
                onChange={e=>{setPassword(e.target.value);setError('');}}
                onKeyDown={e=>e.key==='Enter'&&login()}
                placeholder="••••••••" autoComplete="current-password" disabled={loading}
                style={{...inp,paddingRight:40}}/>
              <button onClick={()=>setShowPass(v=>!v)}
                style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                  background:'none',border:'none',color:G.dimL,cursor:'pointer',fontSize:13,padding:4}}>
                {showPass?'🙈':'👁'}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error&&(
            <div style={{fontFamily:'Rajdhani',fontSize:12,color:'#FF4444',marginBottom:14,
              padding:'8px 12px',borderRadius:2,background:'rgba(255,37,37,0.05)',
              border:'1px solid rgba(255,37,37,0.22)',animation:'fUp 0.2s ease',
              display:'flex',alignItems:'flex-start',gap:7}}>
              <span style={{fontSize:13,flexShrink:0}}>⚠</span><span>{error}</span>
            </div>
          )}

          {/* Botão */}
          <button onClick={login} disabled={loading||!SUPA_OK} className="fg-btn2"
            style={{width:'100%',padding:'13px',fontFamily:'Orbitron',fontSize:9,letterSpacing:3,
              background:'linear-gradient(135deg,rgba(212,175,55,0.13),rgba(212,175,55,0.04))',
              border:`1px solid ${loading||!SUPA_OK?'rgba(212,175,55,0.28)':'rgba(212,175,55,0.72)'}`,
              color:loading||!SUPA_OK?'rgba(106,90,50,0.55)':G.gold,borderRadius:3,boxSizing:'border-box',
              boxShadow:'0 0 16px rgba(212,175,55,0.08),inset 0 0 16px rgba(212,175,55,0.03)'}}>
            {loading
              ?<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <span style={{display:'inline-block',animation:'spinL 0.7s linear infinite',fontSize:13}}>◈</span>
                  A VERIFICAR...
                </span>
              :<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <span style={{fontSize:11}}>◈</span> ENTRAR NO SISTEMA
                </span>}
          </button>

          <div style={{marginTop:18,height:1,background:'linear-gradient(90deg,transparent,rgba(212,175,55,0.14),transparent)',marginBottom:14}}/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontFamily:'Orbitron',fontSize:5.5,color:'rgba(106,90,50,0.32)',letterSpacing:0.8}}>FUMUGOLD v4.0 · LUANDA 2025</div>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:5,height:5,borderRadius:'50%',
                background:SUPA_OK?G.green:G.amber,
                boxShadow:`0 0 6px ${SUPA_OK?G.green:G.amber}`,
                animation:'blinkL 2s ease-in-out infinite'}}/>
              <span style={{fontFamily:'Orbitron',fontSize:5.5,color:'rgba(106,90,50,0.38)',letterSpacing:0.8}}>
                {SUPA_OK?'SUPABASE OK':'SEM CONFIG'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

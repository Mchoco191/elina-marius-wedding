import { useState, useEffect, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import {
  doc, setDoc, getDoc, onSnapshot, collection,
  query, orderBy, updateDoc, serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";

// ─── DÉFIS DU MARIAGE ────────────────────────────────────────────────────────
const CHALLENGES = [
  { id: "c1", emoji: "💃", points: 10, title: "Danse avec les mariés", desc: "Fais une danse avec Elina & Marius et prends une photo !" },
  { id: "c2", emoji: "🥂", points: 10, title: "Toast romantique", desc: "Porte un toast et dis quelque chose de touchant !" },
  { id: "c3", emoji: "🌸", points: 5,  title: "Selfie avec les fleurs", desc: "Prends un selfie avec la déco florale" },
  { id: "c4", emoji: "👴", points: 15, title: "Photo avec le doyen", desc: "Retrouve l'invité le plus âgé et prenez une photo !" },
  { id: "c5", emoji: "🎂", points: 10, title: "Photo avec le gâteau", desc: "Immortalise le gâteau avant qu'il soit mangé !" },
  { id: "c6", emoji: "🤣", points: 10, title: "Grimace en famille", desc: "Fais une grimace avec 3 membres de la famille" },
  { id: "c7", emoji: "🌅", points: 20, title: "La plus belle photo", desc: "Prends la photo la plus artistique de la soirée" },
  { id: "c8", emoji: "💌", points: 15, title: "Message aux mariés", desc: "Écris un message sur le livre d'or et prends-le en photo" },
  { id: "c9", emoji: "🎤", points: 20, title: "Karaoké surprise", desc: "Chante une chanson au micro et documente l'instant !" },
  { id: "c10", emoji: "👠", points: 5, title: "Les chaussures les plus folles", desc: "Trouve les chaussures les plus originales de la soirée" },
];

// ─── STYLES DE BASE ───────────────────────────────────────────────────────────
const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Playfair+Display:wght@700;800&display=swap');`;

const C = {
  gold: "#C9A84C",
  goldLight: "#F0D080",
  goldDark: "#9A7228",
  cream: "#FDF8F0",
  dark: "#2C1A0E",
  muted: "#8B6F52",
  green: "#5A9E72",
  red: "#C0392B",
  cardBg: "rgba(255,255,255,0.82)",
};

const s = {
  page: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    minHeight: "100vh",
    background: `radial-gradient(ellipse at top, #FDF1DC 0%, #F5E6CE 40%, #EDD9BA 100%)`,
    color: C.dark,
  },
  card: {
    background: C.cardBg,
    backdropFilter: "blur(16px)",
    borderRadius: 20,
    border: `1px solid rgba(201,168,76,0.25)`,
    boxShadow: "0 8px 48px rgba(44,26,14,0.10)",
    padding: 24,
  },
  goldBtn: (disabled) => ({
    background: disabled ? "#ddd" : `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
    color: disabled ? "#aaa" : "#fff",
    border: "none", borderRadius: 50,
    padding: "13px 28px", fontSize: 16,
    fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
    letterSpacing: 0.8, cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : `0 4px 20px rgba(201,168,76,0.4)`,
    transition: "all 0.2s", width: "100%", marginBottom: 10,
  }),
  input: {
    width: "100%", padding: "13px 18px", borderRadius: 12,
    border: `1.5px solid rgba(201,168,76,0.35)`,
    background: "rgba(255,255,255,0.9)", fontSize: 16,
    fontFamily: "'Cormorant Garamond', serif", color: C.dark,
    outline: "none", boxSizing: "border-box", marginBottom: 12,
  },
};

// ─── COMPOSANTS UTILITAIRES ───────────────────────────────────────────────────
function Avatar({ name = "?", size = 42 }) {
  const cols = ["#E8A598","#A8C5B5","#C5A8C5","#C5C5A8","#A8B5C5","#C5B5A8"];
  const bg = cols[name.charCodeAt(0) % cols.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
      fontFamily: "'Playfair Display', serif", boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
    }}>{name[0].toUpperCase()}</div>
  );
}

function Confetti({ active }) {
  if (!active) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute", left: `${Math.random() * 100}%`, top: "-12px",
          width: 8 + Math.random() * 6, height: 8 + Math.random() * 6,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          background: [C.gold, C.goldLight, "#fff", "#E8A598", "#A8C5B5", "#C5A8C5"][i % 6],
          animation: `cfFall ${1.8 + Math.random() * 1.5}s linear ${Math.random() * 0.6}s forwards`,
          transform: `rotate(${Math.random() * 360}deg)`
        }} />
      ))}
      <style>{`@keyframes cfFall { to { top: 108vh; transform: rotate(900deg); opacity:0; } }`}</style>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.cream }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, animation: "spin 1.5s linear infinite", display: "inline-block" }}>💍</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ─── APP PRINCIPALE ───────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [screen, setScreen] = useState("login");
  const [userData, setUserData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [confetti, setConfetti] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setScreen("game");
        // Crée le doc user si première connexion
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            displayName: u.displayName || u.email,
            points: 0,
            completedChallenges: {},
            createdAt: serverTimestamp(),
          });
        }
      } else {
        setScreen("login");
        setUserData(null);
      }
    });
    return unsub;
  }, []);

  // Écoute les données de l'user connecté en temps réel
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });
    return unsub;
  }, [user]);

  // Écoute le classement en temps réel
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("points", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const triggerConfetti = () => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 3500);
  };

  if (user === undefined) return <Loader />;

  return (
    <div style={s.page}>
      <style>{fonts}</style>
      <Confetti active={confetti} />
      {screen === "login" && <LoginScreen onSuccess={() => setScreen("game")} leaderboard={leaderboard} />}
      {screen === "game" && user && userData && (
        <GameScreen
          user={user} userData={userData} leaderboard={leaderboard}
          onChallenge={(ch) => { setSelectedChallenge(ch); setScreen("challenge"); }}
          onLeaderboard={() => setScreen("leaderboard")}
          onLogout={() => signOut(auth)}
        />
      )}
      {screen === "leaderboard" && (
        <LeaderboardScreen leaderboard={leaderboard} currentUserId={user?.uid}
          onBack={() => setScreen(user ? "game" : "login")} />
      )}
      {screen === "challenge" && user && userData && selectedChallenge && (
        <ChallengeScreen
          user={user} userData={userData} challenge={selectedChallenge}
          onBack={() => setScreen("game")}
          onSuccess={triggerConfetti}
        />
      )}
    </div>
  );
}

// ─── ÉCRAN LOGIN ──────────────────────────────────────────────────────────────
function LoginScreen({ onSuccess, leaderboard }) {
  const [isNew, setIsNew] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      if (isNew) {
        if (name.trim().length < 2) throw new Error("Prénom trop court !");
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "Cet email est déjà utilisé !",
        "auth/invalid-email": "Email invalide !",
        "auth/weak-password": "Mot de passe trop court (6 caractères min) !",
        "auth/user-not-found": "Compte introuvable !",
        "auth/wrong-password": "Mot de passe incorrect !",
        "auth/invalid-credential": "Email ou mot de passe incorrect !",
      };
      setError(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
      <div style={{ ...s.card, maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>💍</div>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 30, color: C.dark }}>
            Elina & Marius
          </h1>
          <p style={{ margin: "6px 0 0", color: C.muted, fontSize: 16, fontStyle: "italic" }}>Le grand jeu du mariage</p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["Créer un compte", "Se connecter"].map((label, i) => (
            <button key={i} onClick={() => setIsNew(i === 0)} style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: isNew === (i === 0) ? `linear-gradient(135deg,${C.gold},${C.goldDark})` : "rgba(201,168,76,0.1)",
              color: isNew === (i === 0) ? "#fff" : C.muted,
              fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 600,
              transition: "all 0.2s"
            }}>{label}</button>
          ))}
        </div>

        {isNew && <input style={s.input} placeholder="Ton prénom 👤" value={name} onChange={e => setName(e.target.value)} />}
        <input style={s.input} type="email" placeholder="Ton email 📧" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />
        <input style={s.input} type="password" placeholder="Mot de passe 🔒" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} />

        {error && <div style={{ color: C.red, fontSize: 14, marginBottom: 10, textAlign: "center" }}>{error}</div>}
        <button style={s.goldBtn(loading)} onClick={handle} disabled={loading}>
          {loading ? "⏳ Chargement..." : isNew ? "🎉 Rejoindre la fête !" : "→ C'est parti !"}
        </button>

        <button onClick={() => {}} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 14, fontFamily: "'Cormorant Garamond', serif", width: "100%", textAlign: "center", marginTop: 4 }}>
          Voir le classement 🏆
        </button>
      </div>

      {leaderboard.length > 0 && (
        <div style={{ ...s.card, maxWidth: 420, width: "100%", marginTop: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontFamily: "'Playfair Display', serif", fontSize: 18, textAlign: "center" }}>🏆 Top 3</h3>
          {leaderboard.slice(0, 3).map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{["🥇","🥈","🥉"][i]}</span>
              <Avatar name={p.displayName || "?"} size={34} />
              <span style={{ flex: 1, fontWeight: 600, fontSize: 16 }}>{p.displayName}</span>
              <span style={{ color: C.gold, fontWeight: 700, fontSize: 17 }}>{p.points} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ÉCRAN JEU ────────────────────────────────────────────────────────────────
function GameScreen({ user, userData, leaderboard, onChallenge, onLeaderboard, onLogout }) {
  const completed = userData.completedChallenges || {};
  const totalPoints = userData.points || 0;
  const rank = leaderboard.findIndex(p => p.id === user.uid) + 1;
  const totalPossible = CHALLENGES.reduce((a, c) => a + c.points, 0);

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <Avatar name={userData.displayName || "?"} size={50} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20 }}>{userData.displayName}</div>
          <div style={{ color: C.muted, fontSize: 14 }}>
            #{rank || "?"} du classement · {Object.keys(completed).length}/{CHALLENGES.length} défis
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onLeaderboard} style={{ ...s.goldBtn(false), width: "auto", padding: "10px 14px", fontSize: 18, marginBottom: 0 }}>🏆</button>
          <button onClick={onLogout} style={{ background: "rgba(201,168,76,0.15)", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 16 }}>↩</button>
        </div>
      </div>

      {/* Score card */}
      <div style={{ ...s.card, marginBottom: 20, background: `linear-gradient(135deg, rgba(201,168,76,0.18), rgba(255,255,255,0.85))` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Mes points</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: C.gold, fontWeight: 800 }}>{totalPoints} <span style={{ fontSize: 14, color: C.muted }}>/ {totalPossible}</span></span>
        </div>
        <div style={{ height: 10, background: "rgba(201,168,76,0.18)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99, transition: "width 0.6s ease",
            width: `${(totalPoints / totalPossible) * 100}%`,
            background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`
          }} />
        </div>
        {Object.keys(completed).length === CHALLENGES.length && (
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 17, color: C.gold, fontWeight: 700 }}>
            🎊 Tu as relevé TOUS les défis ! Incroyable !
          </div>
        )}
      </div>

      {/* Live leaderboard mini */}
      {leaderboard.length > 1 && (
        <div style={{ ...s.card, marginBottom: 20, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Playfair Display', serif" }}>🔴 Classement en direct</span>
            <button onClick={onLeaderboard} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 13, fontFamily: "'Cormorant Garamond', serif" }}>Voir tout →</button>
          </div>
          {leaderboard.slice(0, 3).map((p, i) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
              borderBottom: i < 2 ? "1px solid rgba(201,168,76,0.12)" : "none",
              background: p.id === user.uid ? "rgba(201,168,76,0.08)" : "none",
              borderRadius: 8, paddingLeft: p.id === user.uid ? 6 : 0,
            }}>
              <span style={{ width: 24, textAlign: "center", fontSize: 16 }}>{["🥇","🥈","🥉"][i]}</span>
              <Avatar name={p.displayName || "?"} size={30} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: p.id === user.uid ? 700 : 500 }}>{p.displayName}{p.id === user.uid ? " (toi)" : ""}</span>
              <span style={{ color: C.gold, fontWeight: 700, fontSize: 16 }}>{p.points} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Challenges */}
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 14 }}>Les défis 💌</h3>
      {CHALLENGES.map(ch => {
        const done = !!completed[ch.id];
        return (
          <div key={ch.id} onClick={() => onChallenge(ch)} style={{
            ...s.card, marginBottom: 12, display: "flex", alignItems: "center", gap: 14,
            cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
            border: done ? `1.5px solid rgba(90,158,114,0.45)` : `1px solid rgba(201,168,76,0.2)`,
            background: done ? "rgba(90,158,114,0.07)" : C.cardBg,
          }}>
            <div style={{ fontSize: 34, width: 42, textAlign: "center" }}>{ch.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16 }}>{ch.title}</div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{ch.desc}</div>
            </div>
            <div style={{ textAlign: "center", minWidth: 44 }}>
              <div style={{ fontSize: done ? 24 : 14, color: done ? C.green : C.gold, fontWeight: 700 }}>
                {done ? "✅" : `+${ch.points}`}
              </div>
              {!done && <div style={{ fontSize: 11, color: C.muted }}>pts</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ÉCRAN CLASSEMENT ─────────────────────────────────────────────────────────
function LeaderboardScreen({ leaderboard, currentUserId, onBack }) {
  const totalPossible = CHALLENGES.reduce((a, c) => a + c.points, 0);
  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{ ...s.goldBtn(false), width: "auto", padding: "10px 20px", fontSize: 14, marginBottom: 0 }}>← Retour</button>
        <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26 }}>🏆 Classement</h2>
      </div>

      <div style={{ ...s.card, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E74C3C", animation: "pulse 1s infinite" }} />
        <span style={{ fontSize: 14, color: C.muted }}>Mise à jour en temps réel</span>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>

      {leaderboard.length === 0 ? (
        <div style={{ ...s.card, textAlign: "center", color: C.muted }}>Personne n'a encore commencé… Sois le premier !</div>
      ) : leaderboard.map((p, i) => (
        <div key={p.id} style={{
          ...s.card, marginBottom: 12, display: "flex", alignItems: "center", gap: 14,
          border: p.id === currentUserId ? `2px solid ${C.gold}` : `1px solid rgba(201,168,76,0.2)`,
          background: i === 0 ? `linear-gradient(135deg, rgba(201,168,76,0.18), rgba(255,255,255,0.85))` : C.cardBg,
          transition: "all 0.3s",
        }}>
          <div style={{ fontSize: 28, width: 36, textAlign: "center" }}>
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span style={{ fontSize: 16, color: C.muted }}>#{i+1}</span>}
          </div>
          <Avatar name={p.displayName || "?"} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17 }}>
              {p.displayName}{p.id === currentUserId ? " 👈" : ""}
            </div>
            <div style={{ color: C.muted, fontSize: 13 }}>
              {Object.keys(p.completedChallenges || {}).length} défi(s) terminé(s)
              {Object.keys(p.completedChallenges || {}).length === CHALLENGES.length ? " 🎊" : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: C.gold }}>{p.points}</div>
            <div style={{ fontSize: 11, color: C.muted }}>/ {totalPossible} pts</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ÉCRAN DÉFI ───────────────────────────────────────────────────────────────
function ChallengeScreen({ user, userData, challenge, onBack, onSuccess }) {
  const completed = userData.completedChallenges || {};
  const alreadyDone = !!completed[challenge.id];
  const [photo, setPhoto] = useState(alreadyDone ? completed[challenge.id]?.photoURL : null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setMsg("");
    try {
      // Upload vers Firebase Storage
      const storageRef = ref(storage, `photos/${user.uid}/${challenge.id}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhoto(url);

      // Mise à jour Firestore
      const isFirstTime = !alreadyDone;
      const newPoints = (userData.points || 0) + (isFirstTime ? challenge.points : 0);
      await updateDoc(doc(db, "users", user.uid), {
        points: newPoints,
        [`completedChallenges.${challenge.id}`]: {
          photoURL: url,
          completedAt: serverTimestamp(),
          points: challenge.points,
        }
      });

      setMsg(isFirstTime
        ? `🎉 +${challenge.points} points ! Défi validé !`
        : "📸 Photo mise à jour !");
      if (isFirstTime) onSuccess();
    } catch (err) {
      setMsg("❌ Erreur lors de l'upload. Réessaie !");
      console.error(err);
    }
    setUploading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto" }}>
      <button onClick={onBack} style={{ ...s.goldBtn(false), width: "auto", padding: "10px 20px", fontSize: 14, marginBottom: 20 }}>← Retour</button>

      <div style={s.card}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{challenge.emoji}</div>
          <h2 style={{ margin: "0 0 6px", fontFamily: "'Playfair Display', serif", fontSize: 24 }}>{challenge.title}</h2>
          <p style={{ color: C.muted, margin: "0 0 10px", fontSize: 16 }}>{challenge.desc}</p>
          <div style={{ display: "inline-block", background: `linear-gradient(135deg,${C.gold},${C.goldDark})`, color: "#fff", borderRadius: 20, padding: "5px 16px", fontSize: 15, fontWeight: 700 }}>
            {alreadyDone ? `✅ ${challenge.points} pts gagnés !` : `+${challenge.points} points`}
          </div>
        </div>

        {photo && (
          <div style={{ marginBottom: 20, borderRadius: 16, overflow: "hidden", border: `2px solid rgba(201,168,76,0.3)` }}>
            <img src={photo} alt="preuve" style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover" }} />
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFile} />

        <button style={{ ...s.goldBtn(uploading), background: uploading ? "#ddd" : `linear-gradient(135deg,#A8C5B5,#7EA899)` }}
          onClick={() => fileRef.current.click()} disabled={uploading}>
          {uploading ? "⏳ Upload en cours..." : photo ? "📸 Changer la photo" : "📸 Prendre / Choisir une photo"}
        </button>

        {msg && (
          <div style={{
            textAlign: "center", marginTop: 14, fontSize: 18, fontWeight: 700,
            color: msg.startsWith("❌") ? C.red : C.gold,
            animation: "fadeIn 0.4s ease"
          }}>
            {msg}
          </div>
        )}
        <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </div>
    </div>
  );
}

import { signInAnonymously } from 'firebase/auth';
import {
  doc, getDoc, setDoc, addDoc, collection, query, orderBy, limit,
  getDocs, serverTimestamp, increment,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// Anonymous sign-in: players get a stable uid with no login screen.
export async function ensureUser() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function getPlayer() {
  const user = await ensureUser();
  const snap = await getDoc(doc(db, 'players', user.uid));
  return snap.exists() ? { uid: user.uid, ...snap.data() } : { uid: user.uid, name: '', bestScore: 0, runs: 0 };
}

export async function saveName(name) {
  const user = await ensureUser();
  await setDoc(doc(db, 'players', user.uid), { name: name.trim().slice(0, 16) }, { merge: true });
}

// Saves the run, and updates best score + run count on the player profile.
export async function saveRun(score) {
  const user = await ensureUser();
  const ref = doc(db, 'players', user.uid);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data() : {};
  const best = Math.max(prev.bestScore || 0, score);
  await addDoc(collection(db, 'runs'), { uid: user.uid, score, createdAt: serverTimestamp() });
  await setDoc(ref, { name: prev.name || 'Runner', bestScore: best, runs: increment(1), updatedAt: serverTimestamp() }, { merge: true });
  return { best, isNewBest: score > (prev.bestScore || 0) };
}

export async function getLeaderboard(n = 10) {
  await ensureUser(); // rules require a signed-in user
  const q = query(collection(db, 'players'), orderBy('bestScore', 'desc'), limit(n));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Optional: tweak difficulty remotely from a Firestore doc `config/game`
// e.g. { gravity: 2200, jumpVelocity: 820, baseSpeed: 320 }
export async function getRemoteConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'game'));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

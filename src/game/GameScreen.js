import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { colors, radius } from '../theme';
import { saveRun, getRemoteConfig } from '../services/gameService';

const { width: W, height: H } = Dimensions.get('window');
const GROUND_H = Math.max(90, H * 0.16);
const PLAYER = 44;
const PLAYER_X = W * 0.18;

const DEFAULTS = { gravity: 2300, jumpVelocity: 850, baseSpeed: 320, maxSpeed: 720, dayCycleSeconds: 70 };

// Day/night palettes: [night, day]
const PAL = {
  sky: ['#0E2A3B', '#8FD3F0'],
  hill: ['#16465A', '#6DB7A8'],
  ground: ['#0A1C28', '#D9B97A'],
  groundLine: ['#2E7D8C', '#A8864A'],
  body: ['#F2E9C9', '#FFD54A'],   // moon -> sun
  hud: ['#F4F7F8', '#12303F'],
};
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (pair, t) => {
  const a = hex(pair[0]), b = hex(pair[1]);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
};
const STARS = Array.from({ length: 24 }, (_, i) => ({
  x: (i * 97) % W, y: 40 + ((i * 53) % Math.max(120, H * 0.38)), r: i % 3 === 0 ? 3 : 2,
}));

const freshState = () => ({
  y: 0, vy: 0, onGround: true, obstacles: [], score: 0, dist: 0,
  speed: DEFAULTS.baseSpeed, nextSpawn: 0.9, alive: true, t: 0,
});

export default function GameScreen({ onExit }) {
  const s = useRef(freshState());
  const cfg = useRef(DEFAULTS);
  const raf = useRef(null);
  const last = useRef(null);
  const [, force] = useState(0);
  const [over, setOver] = useState(null); // { score, best, isNewBest }

  useEffect(() => {
    getRemoteConfig().then((c) => { cfg.current = { ...DEFAULTS, ...c }; });
    start();
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const start = () => {
    cancelAnimationFrame(raf.current);
    s.current = freshState();
    last.current = null;
    setOver(null);
    raf.current = requestAnimationFrame(loop);
  };

  const jump = () => {
    const g = s.current;
    if (g.alive && g.onGround) { g.vy = cfg.current.jumpVelocity; g.onGround = false; }
  };

  const loop = (now) => {
    const g = s.current;
    if (last.current == null) last.current = now;
    const dt = Math.min((now - last.current) / 1000, 0.033);
    last.current = now;

    // physics
    g.vy -= cfg.current.gravity * dt;
    g.y += g.vy * dt;
    if (g.y <= 0) { g.y = 0; g.vy = 0; g.onGround = true; }

    // difficulty ramps with distance
    g.speed = Math.min(cfg.current.maxSpeed, cfg.current.baseSpeed + g.dist * 0.02);
    g.dist += g.speed * dt;
    g.score = Math.floor(g.dist / 10);
    g.t += dt;

    // obstacles
    g.obstacles.forEach((o) => { o.x -= g.speed * dt; });
    g.obstacles = g.obstacles.filter((o) => o.x + o.w > -20);
    g.nextSpawn -= dt;
    if (g.nextSpawn <= 0) {
      const tall = Math.random() < 0.35;
      g.obstacles.push({ x: W + 20, w: tall ? 30 : 36, h: tall ? 74 : 44 });
      const gap = 0.75 + Math.random() * 0.9;
      g.nextSpawn = gap * (360 / g.speed) + 0.35;
    }

    // collision (slightly forgiving hitbox)
    const pad = 6;
    const px1 = PLAYER_X + pad, px2 = PLAYER_X + PLAYER - pad;
    const hit = g.obstacles.some((o) =>
      px2 > o.x + 4 && px1 < o.x + o.w - 4 && g.y < o.h - pad);

    if (hit) { g.alive = false; finish(g.score); }
    force((n) => n + 1);
    if (g.alive) raf.current = requestAnimationFrame(loop);
  };

  const finish = async (score) => {
    setOver({ score, best: null, isNewBest: false });
    try {
      const r = await saveRun(score);
      setOver({ score, best: r.best, isNewBest: r.isNewBest });
    } catch (e) {
      setOver({ score, best: null, isNewBest: false, error: true });
    }
  };

  const g = s.current;
  const stride = Math.floor(g.t * 10) % 2; // 2-frame run cycle

  // phase 0 = night, 0.5 = full day, 1 = night again (smooth cosine)
  const phase = (g.t % cfg.current.dayCycleSeconds) / cfg.current.dayCycleSeconds;
  const day = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const skyC = mix(PAL.sky, day), hillC = mix(PAL.hill, day);
  const groundC = mix(PAL.ground, day), lineC = mix(PAL.groundLine, day);
  const bodyC = mix(PAL.body, day), hudC = mix(PAL.hud, day);
  const bodyX = W * 0.08 + W * 0.7 * phase;
  const bodyY = 150 - 90 * Math.sin(phase * Math.PI);

  return (
    <Pressable style={[styles.root, { backgroundColor: skyC }]} onPressIn={jump}>
      {STARS.map((st, i) => (
        <View key={i} style={{ position: 'absolute', left: st.x, top: st.y, width: st.r, height: st.r,
          borderRadius: st.r, backgroundColor: '#fff', opacity: Math.max(0, 0.9 - day * 1.6) }} />
      ))}
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ position: 'absolute', top: 110 + i * 70, height: 22, width: 90 + i * 20,
          borderRadius: 11, backgroundColor: '#fff', opacity: day * 0.75,
          left: ((i * 190 - g.dist * 0.05) % (W + 140) + (W + 140)) % (W + 140) - 100 }} />
      ))}
      <View style={[styles.moon, { left: bodyX, top: bodyY, backgroundColor: bodyC }]} />
      {[0, 1, 2].map((i) => {
        const offset = -((g.dist * 0.15 + i * 260) % (W + 260));
        return <View key={i} style={[styles.hill, { left: W + offset, height: 60 + i * 24, backgroundColor: hillC }]} />;
      })}

      <View style={[styles.ground, { backgroundColor: groundC }]}>
        <View style={[styles.groundLine, { backgroundColor: lineC }]} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.dash, { backgroundColor: lineC, left: ((i * 90 - g.dist) % (W + 90) + (W + 90)) % (W + 90) - 40 }]} />
        ))}
      </View>

      {g.obstacles.map((o, i) => (
        <View key={i} style={[styles.obstacle, { left: o.x, width: o.w, height: o.h, bottom: GROUND_H }]} />
      ))}

      <View style={[styles.player, {
        left: PLAYER_X, bottom: GROUND_H + g.y,
        transform: [{ rotate: g.onGround ? (stride ? '-4deg' : '4deg') : `${Math.max(-25, Math.min(25, -g.vy / 40))}deg` }],
      }]}>
        <View style={styles.eye} />
      </View>

      <View style={styles.hud}>
        <Text style={[styles.score, { color: hudC }]}>{g.score}</Text>
        <Pressable onPress={onExit} hitSlop={12} style={styles.pause}>
          <Text style={styles.pauseText}>Quit</Text>
        </Pressable>
      </View>

      {over && (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{over.isNewBest ? 'New best' : 'Run over'}</Text>
            <Text style={styles.cardScore}>{over.score}</Text>
            <Text style={styles.cardSub}>
              {over.error ? "Couldn't save this run. Check your connection."
                : over.best != null ? `Best: ${over.best}` : 'Saving…'}
            </Text>
            <Pressable style={styles.btn} onPress={start}><Text style={styles.btnText}>Run again</Text></Pressable>
            <Pressable style={styles.btnGhost} onPress={onExit}><Text style={styles.btnGhostText}>Menu</Text></Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky, overflow: 'hidden' },
  moon: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: colors.moon, opacity: 0.9 },
  hill: { position: 'absolute', bottom: GROUND_H, width: 320, backgroundColor: colors.skyLow, borderTopLeftRadius: 160, borderTopRightRadius: 160 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: GROUND_H, backgroundColor: colors.ground },
  groundLine: { height: 3, backgroundColor: colors.groundLine },
  dash: { position: 'absolute', top: 28, width: 40, height: 3, borderRadius: 2, backgroundColor: colors.groundLine, opacity: 0.5 },
  obstacle: { position: 'absolute', backgroundColor: colors.hazard, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  player: { position: 'absolute', width: PLAYER, height: PLAYER, backgroundColor: colors.runner, borderRadius: 12 },
  eye: { position: 'absolute', top: 12, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ground },
  hud: { position: 'absolute', top: 54, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  score: { color: colors.text, fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pause: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.panel },
  pauseText: { color: colors.muted, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,16,24,0.6)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '80%', maxWidth: 340, backgroundColor: colors.ground, borderRadius: radius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.groundLine },
  cardTitle: { color: colors.muted, fontSize: 16, fontWeight: '600' },
  cardScore: { color: colors.runner, fontSize: 64, fontWeight: '800', marginVertical: 4 },
  cardSub: { color: colors.text, marginBottom: 20, textAlign: 'center' },
  btn: { alignSelf: 'stretch', backgroundColor: colors.runner, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: colors.ground, fontWeight: '800', fontSize: 16 },
  btnGhost: { paddingVertical: 14 },
  btnGhostText: { color: colors.muted, fontWeight: '600' },
});
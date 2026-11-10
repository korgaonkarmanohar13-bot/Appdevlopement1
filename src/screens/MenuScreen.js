import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius } from '../theme';
import { getPlayer, saveName, getLeaderboard } from '../services/gameService';

export default function MenuScreen({ onPlay }) {
  const [player, setPlayer] = useState(null);
  const [name, setName] = useState('');
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = await getPlayer();            // signs in first
      const b = await getLeaderboard(10);
      setPlayer(p); setName(p.name || ''); setBoard(b);
    } catch (e) {
      console.warn('Leaderboard load failed:', e.code, e.message);
      setError(e.code || 'unknown');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const play = async () => {
    if (name.trim() && name.trim() !== player?.name) { try { await saveName(name); } catch {} }
    onPlay();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Dash</Text>
      <Text style={styles.tag}>Tap to jump. Don't stop.</Text>

      <TextInput
        value={name} onChangeText={setName} maxLength={16}
        placeholder="Your name" placeholderTextColor={colors.muted} style={styles.input}
      />
      <Pressable style={styles.btn} onPress={play}><Text style={styles.btnText}>Play</Text></Pressable>
      {player ? <Text style={styles.best}>Your best: {player.bestScore || 0}</Text> : null}

      <Text style={styles.section}>Top runners</Text>
      {loading ? <ActivityIndicator color={colors.runner} style={{ marginTop: 20 }} /> :
        error ? (
          <Pressable onPress={load}><Text style={styles.err}>Couldn't load scores ({error}). Tap to retry.</Text></Pressable>
        ) : (
          <FlatList
            data={board} keyExtractor={(i) => i.id} style={{ alignSelf: 'stretch', flex: 1 }}
            ListEmptyComponent={<Text style={styles.empty}>No scores yet. Set the first one.</Text>}
            renderItem={({ item, index }) => (
              <View style={[styles.row, item.id === player?.uid && styles.me]}>
                <Text style={styles.rank}>{index + 1}</Text>
                <Text style={styles.rowName} numberOfLines={1}>{item.name || 'Runner'}</Text>
                <Text style={styles.rowScore}>{item.bestScore}</Text>
              </View>
            )}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sky, paddingTop: 80, paddingHorizontal: 24, alignItems: 'center' },
  title: { color: colors.runner, fontSize: 72, fontWeight: '900', letterSpacing: -2 },
  tag: { color: colors.muted, fontSize: 16, marginBottom: 28 },
  input: { alignSelf: 'stretch', backgroundColor: colors.ground, color: colors.text, borderRadius: radius.md, padding: 14, fontSize: 16, marginBottom: 12 },
  btn: { alignSelf: 'stretch', backgroundColor: colors.runner, paddingVertical: 16, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: colors.ground, fontWeight: '800', fontSize: 18 },
  best: { color: colors.text, marginTop: 12 },
  section: { alignSelf: 'flex-start', color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 32, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: radius.sm },
  me: { backgroundColor: colors.panel },
  rank: { width: 28, color: colors.muted, fontWeight: '700' },
  rowName: { flex: 1, color: colors.text, fontSize: 16 },
  rowScore: { color: colors.runner, fontWeight: '800', fontSize: 16 },
  empty: { color: colors.muted, marginTop: 16 },
  err: { color: colors.hazard, marginTop: 16 },
});

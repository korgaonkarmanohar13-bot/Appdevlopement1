import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import MenuScreen from './src/screens/MenuScreen';
import GameScreen from './src/game/GameScreen';

export default function App() {
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <StatusBar style="light" />
      {playing
        ? <GameScreen onExit={() => setPlaying(false)} />
        : <MenuScreen key="menu" onPlay={() => setPlaying(true)} />}
    </>
  );
}

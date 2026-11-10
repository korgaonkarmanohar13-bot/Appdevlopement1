# Dash – 2D Runner (React Native + Expo + Firebase)

## Setup
1. `npm install`
2. Firebase Console: create project → add Web app → paste config into `src/firebase.js`
3. Enable **Authentication → Anonymous**
4. Create **Firestore** database, then paste `firestore.rules` into Rules
6. `npx expo start` and open in Expo Go

## Firestore data
- `players/{uid}`: name, bestScore, runs, updatedAt
- `runs/{auto}`: uid, score, createdAt
- `config/game` (optional): gravity, jumpVelocity, baseSpeed, maxSpeed — tune difficulty without an app update

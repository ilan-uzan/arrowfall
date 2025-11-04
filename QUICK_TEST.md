# Quick Testing Guide

## 🚀 Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Create `.env` file** (if it doesn't exist):
   ```bash
   SUPABASE_URL=https://bnkkcumuvzzkxofxdatz.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJua2tjdW11dnp6a3hvZnhkYXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNjQ0NDUsImV4cCI6MjA3Nzg0MDQ0NX0.pWVKbxVcog3p1tqNZk_3ZIzLxbbLBQk1Ny-W6q28dQo
   PORT=3000
   ```

3. **Start the server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   ```
   http://localhost:3000
   ```

## 🎮 Test Gameplay

### Single Player (Keyboard Only)
- **A/D** - Move left/right
- **W** or **Space** - Jump
- **F** - Shoot arrow
- **E** - Pickup arrow (walk near embedded arrow)

### Two Players (Keyboard + Gamepad)
1. Connect gamepad (PS5/Xbox via USB or Bluetooth)
2. Click "Add Controller" button
3. Press **START/OPTIONS** on gamepad
4. Player 2 joins!

## ✅ Quick Test Checklist

- [ ] Landing page loads
- [ ] Click "Play" → game canvas appears
- [ ] Player 1 can move with A/D keys
- [ ] Player 1 can jump with W/Space
- [ ] Player 1 can shoot with F key
- [ ] Arrows embed in walls/floors
- [ ] Gamepad joins (if available)
- [ ] Match end modal appears after 5 wins
- [ ] Can save match to database
- [ ] Leaderboard shows saved matches

## 🧪 Test API Endpoints

### Test Save Match:
```bash
curl -X POST http://localhost:3000/api/match \
  -H "Content-Type: application/json" \
  -d '{"winner":"Alice","loser":"Bob","winner_kos":5,"loser_kos":3,"roundsToWin":5}'
```

### Test Leaderboard:
```bash
curl http://localhost:3000/api/leaderboard?limit=5
```

## 🐛 Troubleshooting

- **Server won't start**: Check if port 3000 is available
- **Database errors**: Verify `.env` file has correct Supabase credentials
- **Gamepad not working**: Use Chrome browser, connect controller first
- **Game not loading**: Check browser console (F12) for errors

## 📝 Notes

- Database table is already created via MCP ✅
- Server runs on port 3000
- Chrome recommended for best gamepad support
- Game runs at 60 FPS with fixed timestep physics


# Testing Guide for Arrowfall

## Quick Start Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Test the Landing Page
- Open your browser and go to `http://localhost:3000`
- You should see the landing page with:
  - Title "Arrowfall"
  - Controls explanation
  - "Play" and "Leaderboard" buttons

### 4. Test the Game (Single Player - Keyboard Only)
1. Click "Play" button
2. You should see the game canvas
3. Player 1 (keyboard) should be able to move:
   - **A/D** - Move left/right
   - **W** or **Space** - Jump
   - **F** - Shoot arrow
   - **E** - Pickup arrow (if one is embedded)

### 5. Test with Gamepad (Two Players)
1. Connect a PS5/Xbox controller via USB or Bluetooth
2. Click "Play" button
3. Click "Add Controller" button in the join overlay
4. Press **START/OPTIONS** button on your gamepad
5. Player 2 should join and you can control them with:
   - **Left Stick** - Move
   - **A/Cross** - Jump
   - **X/Square** or **R2** - Shoot

### 6. Test Game Mechanics
- **Movement**: Jump around, wall slide by holding into a wall while falling
- **Arrows**: Shoot arrows (F key), they should embed in walls/floors
- **Pickup**: Walk near embedded arrows and press E to pick them up
- **Stomp**: Jump and fall fast onto an opponent's head for instant KO
- **Rounds**: Play until one player wins 5 rounds

### 7. Test Match End
1. Play until one player reaches 5 wins
2. Match end modal should appear
3. Enter player names
4. Click "Save Result"
5. Should see success message with link to leaderboard

### 8. Test Leaderboard
1. Click "View Leaderboard" link or go to `http://localhost:3000/leaderboard`
2. Should see your saved match in the table
3. Click "Back to Home" to return to landing page

## API Testing

### Test Save Match Endpoint
```bash
curl -X POST http://localhost:3000/api/match \
  -H "Content-Type: application/json" \
  -d '{
    "winner": "Test Winner",
    "loser": "Test Loser",
    "winner_kos": 5,
    "loser_kos": 3,
    "roundsToWin": 5
  }'
```

Expected response:
```json
{
  "ok": true,
  "match": { ... }
}
```

### Test Leaderboard Endpoint
```bash
curl http://localhost:3000/api/leaderboard?limit=10
```

Expected response:
```json
{
  "rows": [ ... ]
}
```

## Database Testing

### Verify Database Connection
```bash
npm run init:db
```

This should print "Database initialized successfully" if the table exists.

### Check Database via Supabase MCP
The table should already be created. You can verify by checking the Supabase dashboard or using MCP tools.

## Common Issues

### Gamepad Not Detected
- Make sure controller is connected via USB or paired via Bluetooth
- Try Chrome browser (best gamepad support)
- Check browser console for errors

### Database Errors
- Make sure `.env` file exists with correct Supabase credentials
- Verify the `matches` table exists in Supabase dashboard
- Check server console for connection errors

### Game Not Loading
- Check browser console for JavaScript errors
- Verify all files are in `public/game/` directory
- Check that server is running on port 3000

## Manual Testing Checklist

- [ ] Landing page loads correctly
- [ ] Play button navigates to game
- [ ] Keyboard controls work (Player 1)
- [ ] Gamepad can join (Player 2)
- [ ] Players can move and jump
- [ ] Arrows fire and embed in walls
- [ ] Arrows can be picked up
- [ ] Stomp KO works
- [ ] Round transitions work
- [ ] Match end modal appears
- [ ] Match can be saved to database
- [ ] Leaderboard displays saved matches
- [ ] Leaderboard page navigation works

## Performance Testing

- Game should run at 60 FPS
- No lag during movement
- Smooth arrow physics
- Responsive input (no input lag)

## Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Should work, but gamepad rumble may vary
- **Safari**: Limited gamepad support


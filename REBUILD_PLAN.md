# Arrowfall Rebuild Plan

## Current State
- Express server with EJS views ✅ (keeping)
- Supabase database setup ✅ (keeping)
- Basic game structure in public/game/ (rebuilding)

## New Architecture

### Core Systems
1. ✅ Constants.js - Visual Bible constants
2. ✅ Audio.js - Web Audio API
3. InputRouter - Keyboard + Gamepad unified
4. Scene System - Title, Character Select, Arena, Results
5. Game Engine - Canvas renderer with proper scaling
6. Physics - AABB collisions, gravity
7. Entities - Player, Arrow, Powerup, AI Bot
8. Single-Player Mode - Survival with AI
9. Supabase MCP - Schema, RLS, policies

### Tech Stack (Strict)
- Node.js ✅
- Express ✅
- JavaScript ✅
- HTML ✅
- CSS ✅
- EJS ✅
- Supabase ✅

### Removed
- ❌ React/TypeScript/Vite
- ❌ All TS/TSX files
- ❌ Unnecessary dependencies

## Next Steps
1. Input system (InputRouter)
2. Scene manager
3. Rebuild game engine
4. Single-player mode
5. Supabase MCP setup


# 🪓 Rake Survival - Chrome Extension

A survival game built as a Chrome extension featuring a Three.js environment where you must evade or combat a hunting rake creature during nighttime, retreating to safety during the day.

## Features

- **Dynamic Day/Night Cycle**: The rake hunts aggressively at night (18:00-06:00) and retreats to its spawn during the day
- **Real-time Combat System**:
  - **Attack** (E or Enter): Use the rake's embedded attack animation to deal damage
  - **Parry** (Space): Block incoming attacks with the parry animation
  - **Movement** (WASD): Navigate the arena to avoid or engage the rake
  
- **Smart AI**:
  - Rake switches targets after landing 2 damaging hits on the same player
  - Hunts the player at night with pursuit logic
  - Retreats to spawn during daylight
  - Uses embedded GLB model animations (attack, walk, parry)

- **Player Mechanics**:
  - 100 HP health system
  - Take damage from rake attacks during night encounters
  - Heal by surviving to daylight and keeping distance
  - Real-time HUD displaying:
    - Current time and game state
    - Player health
    - Rake hit count

- **Visual Environment**:
  - Dynamic lighting that changes with day/night cycle
  - Atmospheric fog and shadows
  - 3D ground with proper collision awareness
  - Smooth camera positioning

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nezoko45-dev/rake-game-extension.git
   cd rake-game-extension
   ```

2. **Ensure the model file exists**:
   - Place your `rake.glb` model in the `models/` folder
   - The GLB file must contain animations named (or containing):
     - `attack` / `strike` / `slash` / `hit` / `bite` / `claw`
     - `walk` / `running` / `move` / `locomotion`
     - `parry` / `guard` / `block` / `dodge`
     - `idle` / `stand` / `stance` (optional)

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `rake-game-extension` folder

4. **Play**:
   - Click the extension icon in the toolbar to open the game popup
   - The game loads in fullscreen mode within the popup

## Controls

| Action | Key |
|--------|-----|
| Move Forward | `W` |
| Move Left | `A` |
| Move Backward | `S` |
| Move Right | `D` |
| Attack | `E` or `Enter` |
| Parry | `Space` |

## Gameplay Tips

- **During Night (18:00-06:00)**:
  - The rake hunts aggressively
  - Stay mobile and attack when possible
  - Use parry to block incoming attacks
  - Deal 2 hits to force the rake to switch targets (giving you breathing room)
  - Each attack deals 15 damage to the rake

- **During Day (06:00-18:00)**:
  - The rake retreats to its spawn point
  - Use this time to recover and reposition
  - The rake won't attack during daytime
  - Prepare for the next night hunt

- **Survival Strategy**:
  - Circle-strafe around the rake to maintain distance
  - Attack in groups of 2 to force target switching
  - Position yourself near safe zones during transitions
  - Watch the HUD timer for approaching nightfall

## File Structure

```
rake-game-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Game container and HUD
├── popup.js              # Main game logic and Three.js setup
├── style.css             # UI styling
├── README.md             # This file
└── models/
    └── rake.glb          # 3D rake model with animations
```

## Technical Details

### Animation System

The game automatically resolves animation names from your GLB file using fuzzy matching:

- **Attack animations**: `attack`, `strike`, `slash`, `hit`, `bite`, `claw`
- **Walk animations**: `walk`, `walking`, `run`, `running`, `move`, `locomotion`
- **Parry animations**: `parry`, `guard`, `block`, `dodge`, `evade`
- **Idle animations**: `idle`, `stand`, `stance`, `rest` (optional)

If your GLB uses different naming conventions, the resolver will find the closest match.

### Performance

- Uses WebGL with shadow mapping for atmospheric lighting
- Fog culling reduces draw calls at distance
- Optimized with pixelRatio capping for lower-end devices
- Efficient animation mixer updates

### Browser Compatibility

- Chrome 90+
- Requires Web Assembly and WebGL 2.0 support
- Runs in extension popup context with CSP restrictions

## Troubleshooting

### Model not loading
- Check browser console (F12) for error messages
- Verify `models/rake.glb` exists in the extension folder
- Ensure the file path is correct in `popup.js`

### Animations not playing
- Check console logs for animation resolution messages
- Verify your GLB has animation clips embedded
- Animation names should contain patterns from the resolver list

### Performance issues
- Reduce window/popup size
- Check GPU capabilities in browser settings
- Disable shadows by modifying `renderer.shadowMap.enabled = false` in `popup.js`

### Game not starting
- Check extension permissions in `manifest.json`
- Clear Chrome extension cache: `chrome://extensions/` → Reload
- Look for errors in Chrome DevTools (F12 on popup)

## API Reference

The game state is exposed globally for debugging:

```javascript
// Access from browser console
window.gameState.player          // Player object
window.gameState.rake            // Rake AI object
window.gameState.clock           // Clock state
window.gameState.isNight()       // Check current time
```

## Future Enhancements

- [ ] Multiple rake spawns
- [ ] Power-up system
- [ ] Score/Wave tracking
- [ ] Audio effects and music
- [ ] Advanced pathfinding for rake AI
- [ ] Player ability system
- [ ] Difficulty scaling

## License

MIT - Feel free to fork and modify!

## Credits

- Built with [Three.js](https://threejs.org/)
- GLB model loading via [GLTFLoader](https://threejs.org/docs/index.html?q=gltf#examples/en/loaders/GLTFLoader)
- Chrome Extensions API

---

**Survive the night. Defeat the rake.** 🪓

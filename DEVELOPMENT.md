# Development Guide

## Quick Start

1. Ensure `models/rake.glb` is in the project root
2. Load the extension in Chrome via `chrome://extensions/`
3. Open browser DevTools (F12) on the extension popup to debug

## Architecture

### Game Loop

The game runs on a 60 FPS animation loop:

```
boot() → loadModel() → animate()
                         ├─ updateClock()
                         ├─ updatePlayer()
                         ├─ updateRake()
                         ├─ updateHUD()
                         └─ renderer.render()
```

### State Management

**Player State**:
- `position`: World coordinates
- `health`: 0-100 HP
- `state`: 'idle' | 'walk'
- `attackTimer`: Cooldown tracking
- `parryTimer`: Cooldown tracking
- `targetHitCount`: Hits landed on current target

**Rake State**:
- `position`: World coordinates
- `health`: 0-100 HP
- `target`: 'player' | 'decoy'
- `state`: 'hunt' | 'retreat'
- `targetHitCount`: Hits received from current target
- `mixer`: Three.js AnimationMixer
- `actions`: Animation action map

**Clock State**:
- `time`: 0-24 (decimal)
- `night`: Boolean derived from time

### Animation Resolution

The system attempts to match embedded GLB animations to game actions:

```javascript
// Pattern matching (case-insensitive, substring search)
const patterns = {
  attack: ['attack', 'strike', 'slash', 'hit', 'bite', 'claw'],
  walk: ['walk', 'walking', 'run', 'running', 'move', 'locomotion'],
  parry: ['parry', 'guard', 'block', 'dodge', 'evade'],
  idle: ['idle', 'stand', 'stance', 'rest']
};
```

If your model uses different names, update `resolveAnimationNames()` in `popup.js`.

## Debugging

### Console Logging

The game logs significant events:

```javascript
✓ Model loaded successfully
✓ Game ready!
🎯 Player hit rake! (85 HP remaining)
🛓 Rake attacked player! (88 HP remaining)
🛡️ Parry successful!
✓ Rake defeated!
☠️ Player defeated!
```

### Accessing Game State

From browser console on the popup:

```javascript
// Player info
window.gameState.player.health
window.gameState.player.position

// Rake info
window.gameState.rake.target
window.gameState.rake.health
window.gameState.rake.state

// Clock
window.gameState.clock.time
window.gameState.isNight()
```

## Customization

### Adjusting Gameplay

**Damage values** (in `popup.js`):
```javascript
player.health -= 12;  // Rake attack damage (line ~320)
rake.health -= 15;    // Player attack damage (line ~271)
```

**Speed values**:
```javascript
dt * 4.5    // Player movement speed
dt * 2.8    // Rake hunt speed
dt * 2.2    // Rake retreat speed
```

**Cooldowns**:
```javascript
player.attackTimer = 0.45;  // Attack cooldown
player.parryTimer = 0.7;    // Parry cooldown
rake.hitCooldown = 0.6;     // Rake attack cooldown
```

**Health**:
```javascript
player.maxHealth = 100;
rake.maxHealth = 100;
```

### Changing Time Scale

The clock advances based on `dt * 0.15` in `updateClock()`:

```javascript
clock.time += dt * 0.15;  // Increase multiplier for faster day/night cycle
```

**Current**: 1 real second ≈ 0.15 in-game hours
**For faster cycles**: Use `dt * 0.3` (double speed)
**For slower cycles**: Use `dt * 0.075` (half speed)

### Lighting Adjustments

**Daytime colors**:
```javascript
const dayRatio = (clock.time >= 6 && clock.time < 18) ? 1 : 0;
sun.intensity = dayRatio ? 1.8 : 0.3;  // Adjust brightness
hemi.intensity = dayRatio ? 1.2 : 0.7;
```

**Fog distance**:
```javascript
scene.fog = new THREE.Fog(0x081017, 12, 38);  // (color, near, far)
```

### Camera Position

```javascript
camera.position.set(0, 5.8, 11);  // (x, y, z)
```

Adjust `y` to raise/lower view, `z` to move forward/back.

## Model Requirements

Your GLB file should meet these specifications:

- **Format**: GLB (binary glTF)
- **Animations**: Must be baked into the model
- **Meshes**: Single or multiple (auto-handled)
- **Bones**: Skeleton rig required if using skeletal animations
- **Scale**: Typically 0.9-1.2 scale factor applied

### Export from Blender

1. Select armature and mesh
2. File → Export → glTF 2.0 (.glb)
3. Ensure all animations are NLA Editor actions
4. Use action export method
5. Test in [Three.js Editor](https://threejs.org/editor/) first

## Performance Optimization

### If experiencing lag:

1. **Disable shadows**:
   ```javascript
   renderer.shadowMap.enabled = false;
   sun.castShadow = false;
   ```

2. **Reduce geometry detail**:
   ```javascript
   // Lower segment counts
   new THREE.CapsuleGeometry(0.7, 1.4, 2, 4)  // From 4, 10
   new THREE.PlaneGeometry(40, 40)  // From 60, 60
   ```

3. **Increase fog culling**:
   ```javascript
   scene.fog = new THREE.Fog(0x081017, 8, 20);  // From 12, 38
   ```

4. **Disable antialiasing**:
   ```javascript
   const renderer = new THREE.WebGLRenderer({ antialias: false });
   ```

## Testing Checklist

- [ ] Model loads without errors
- [ ] All animations play (attack, walk, parry)
- [ ] Player movement responds to WASD
- [ ] Attack (E) triggers rake damage
- [ ] Parry (Space) blocks rake attacks
- [ ] Rake retreats during day (06:00-18:00)
- [ ] Rake hunts during night (18:00-06:00)
- [ ] Rake switches targets after 2 hits
- [ ] HUD updates correctly
- [ ] No console errors on startup

## Common Issues & Solutions

### Issue: "Model loading error"
**Solution**: Verify path is correct and file exists at `models/rake.glb`

### Issue: Animations don't play
**Solution**: Check animation names in console and update pattern list in `resolveAnimationNames()`

### Issue: Game runs at 20 FPS
**Solution**: Disable shadows or reduce geometry detail (see optimization section)

### Issue: Rake doesn't hunt
**Solution**: Check `isNight()` logic and clock time values

### Issue: Player takes no damage
**Solution**: Verify `player.health -= 12` line is reached (check proximity check)

## Contributing

To submit improvements:

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Test thoroughly before committing
3. Update documentation
4. Submit pull request with description

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [GLTFLoader Docs](https://threejs.org/docs/?q=gltf#examples/en/loaders/GLTFLoader)
- [Chrome Extension Guide](https://developer.chrome.com/docs/extensions/)
- [Blender to Three.js](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)

---

**Happy developing!** 🚀

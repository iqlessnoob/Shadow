# Shadowbound — 2D Dark Fantasy Action Game

A playable mobile-first 2D side-scrolling action game made with HTML5 Canvas and wrapped in a small Android WebView app. The project is intentionally dependency-light: no remote game assets or third-party game libraries are required.

## Included gameplay

- 100 numbered levels, with an Endless mode unlocked after clearing level 100
- A boss on every 5th level
- A background/realm change every 10 levels
- Enemies with different patterns: melee Hollow, ranged Hex Archer, heavy Grave Brute, floating Wisp, and multi-pattern bosses
- Weapons: Rustbound Sword, Hunter Bow, Gloam Wand, Repeater, Aegis Blade, Night Crossbow, and Flame Flower
- Armor upgrades with capped damage reduction, so equipment helps without making the player invincible
- Coin and diamond drops, level-clear rewards, shop prices, weapon/armor ownership and equipment
- Healing tonics, jump, dash cooldown, crouch, platform drop-through, ranged aiming, and mobile touch controls
- Save data stored locally on the device/browser through `localStorage`
- Keyboard support for browser testing

## Play it in a browser

Open `index.html` in a modern browser. The game is landscape-first; a phone works best in landscape orientation. Keyboard controls:

- `A / D` or left/right arrows: move
- `Space`: jump
- `J` or `K`: attack
- `Shift` or `L`: dash
- `C`: crouch
- `W` / up arrow: aim ranged weapons upward
- `S` / down arrow: crouch or drop through a platform
- `E`: use a healing tonic
- `Esc`: pause / return

The native Android build uses `app/src/main/assets/game/` as its local game folder. Keep that copy updated if editing the game code.

## Build an APK with GitHub Actions

1. Create a GitHub repository and upload the **contents of this folder** (so `settings.gradle`, `app/`, and `.github/` are at the repository root).
2. Open the repository's **Actions** tab and enable Actions if GitHub asks.
3. Push a commit to `main` or `master`, or open **Actions → Build Shadowbound APK → Run workflow**.
4. Open the completed workflow run, find **Artifacts**, and download `shadowbound-debug-apk`.
5. Unzip the artifact to get `app-debug.apk`, then install it on an Android device. You may need to allow installation from your browser or file manager.

This workflow builds a **debug APK** for personal testing; it is not a Play Store release-signed build.

## Editing notes

- Main gameplay code: `app/src/main/assets/game/game.js`
- Game markup/styles: `app/src/main/assets/game/index.html`
- Android WebView wrapper: `app/src/main/java/com/shadowbound/game/MainActivity.java`
- APK workflow: `.github/workflows/build.yml`

For browser-only edits, update the root `game.js` and `index.html` as well, or copy the updated Android asset files to the root. The native app loads the files from `app/src/main/assets/game/`.

## Balance approach

Difficulty grows in stages: early levels are forgiving and rewards come quickly; enemy health/damage scaling becomes more gradual later. Bosses use different attack patterns. Armor mitigation is capped, and higher-damage weapons trade off attack speed or range. Endless mode reuses the ten realm themes while continuing level and enemy scaling beyond 100.

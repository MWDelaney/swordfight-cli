# SwordFight CLI

A command-line interface for the SwordFight game engine. Play sword-fighting duels against AI opponents directly in your terminal!

## Features

- **Interactive Character Selection**: Choose from multiple characters with different stats and equipment
- **Dramatic Combat**: Cinematic flavor text with typewriter effects
- **Strategic Gameplay**: Make tactical decisions each round based on combat state and restrictions
- **Visual Feedback**: Health bars, equipment status, and move bonuses displayed beautifully
- **Cursor Navigation**: Use arrow keys to select moves and characters
- **Multiplayer Ready**: Built on the new multiplayer-capable engine with transport system

## Installation

```bash
npm install -g swordfight-cli
```

## Usage

Simply run:

```bash
swordfight
```

Or if installed locally:

```bash
npx swordfight-cli
```

### Game Flow

1. **Enter Your Name**: Choose your warrior's name
2. **Select Game Mode**:
   - 🤖 **Fight the Computer**: Battle against an AI opponent
   - ⚔️ **Create Multiplayer Game**: Generate a shareable game code
   - 🎮 **Join Multiplayer Game**: Enter a friend's game code
3. **Choose Your Character**: Pick from 7 unique warriors
4. **Battle**: Select moves strategically each round

### Multiplayer Mode

When you create a multiplayer game, you'll receive a 5-character code (e.g., `XYZ42`). Share this code with a friend who can then join your game by selecting "Join Multiplayer Game" and entering the code. Both players select their own characters, then battle in real-time over the internet!

## Game Mechanics

- Choose your character and face your opponent
- Select moves each round using arrow keys
- Combat range changes based on your moves
- Certain moves grant bonuses for the next round
- Restrictions may apply based on previous actions
- Defeat your opponent to win!

## Characters

The game includes several pre-configured characters:
- **Human Fighter**: Balanced fighter with broadsword and shield
- **Evil Human Fighter**: Skilled warrior with long sword and buckler
- **Goblin**: Tough fighter with mace and wooden shield
- **Human Monk**: Agile fighter with quarterstaff
- **Lizard Man**: Reptilian warrior with scimitar and buckler
- **Mummy**: Undead fighter with heavy mace
- **Skeleton**: Animated bones with sword and shield

## Engine Updates (v1.5.0)

This CLI now uses the updated SwordFight Engine v1.5.0 which features:
- **Unified Transport System**: Computer player now uses the same transport system as multiplayer
- **Async Initialization**: New lifecycle pattern (create → initialize → connect)
- **Automatic Character Exchange**: Opponent characters are exchanged automatically during connection
- **Multiplayer Ready**: The same codebase can support both local and networked play

## Requirements

- Node.js 18.0.0 or higher
- Terminal with emoji support for best experience

## Credits

Built on the [SwordFight Game Engine](https://github.com/MWDelaney/swordfight.engine) v1.5.0

# SwordFight CLI

A command-line interface for the SwordFight game engine. Play sword-fighting duels against AI opponents directly in your terminal!

## Features

- **Interactive Character Selection**: Choose from multiple characters with different stats and equipment
- **Dramatic Combat**: Cinematic flavor text with typewriter effects
- **Strategic Gameplay**: Make tactical decisions each round based on combat state and restrictions
- **Visual Feedback**: Health bars, equipment status, and move bonuses displayed beautifully
- **Cursor Navigation**: Use arrow keys to select moves and characters

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

## Game Mechanics

- Choose your character and face a random opponent
- Select moves each round using arrow keys
- Combat range changes based on your moves
- Certain moves grant bonuses for the next round
- Restrictions may apply based on previous actions
- Defeat your opponent to win!

## Characters

The game includes several pre-configured characters:
- **Human Fighter**: Balanced fighter with broadsword and shield
- **Evil Human Fighter**: Skilled warrior with long sword and buckler
- **Goblin Fighter**: Tough fighter with mace and wooden shield

## Requirements

- Node.js 18.0.0 or higher
- Terminal with emoji support for best experience

## Credits

Built on the [SwordFight Game Engine](https://github.com/MWDelaney/swordfight.engine)

# SwordFight CLI

A command-line interface for the SwordFight multiplayer sword fighting game.

## Installation

Install globally to use the `swordfight` command:

```bash
npm install -g swordfight-cli
```

Or run directly with npx (recommended):

```bash
npx --yes swordfight-cli
```

Or use the shorter form:

```bash
npx -y swordfight-cli
```

## Usage

Simply run the command to start playing:

```bash
swordfight
```

The CLI will guide you through:

1. Setting your warrior name
2. Choosing your fighter character
3. Engaging in turn-based combat against a computer opponent

## Features

- ⚔️ Multiple character types with unique abilities
- 🎯 Interactive move selection with arrow keys
- 🤖 Intelligent computer opponent
- 📊 Real-time health and status tracking
- 🎨 Colorful terminal interface with box drawing

## Requirements

- Node.js 18.0.0 or higher

## Characters

Choose from three unique fighters:

- **Human Fighter**: Balanced warrior with sword and shield
- **Evil Human Fighter**: Dark variant with similar capabilities  
- **Goblin Fighter**: Agile fighter with mace and unique abilities

## Gameplay

The game features:

- Turn-based combat system
- Move restrictions based on previous actions
- Weapon and shield mechanics
- Health management
- Victory/defeat conditions

## Development

### Building

```bash
npm run build
```

### Testing

Run the comprehensive test suite:

```bash
# Run all tests (CLI tests + complete game playthrough)
npm run test:all

# Run only the main test suite
npm test

# Run only the complete game test
npm run test:complete-game
```

**Test Coverage:**

- ✅ File integrity and build verification
- ✅ CLI startup and interface tests
- ✅ Character selection automation
- ✅ Complete game playthrough with random moves
- ✅ Multiple game consistency verification

### Release Process

This project uses automated GitHub workflows for publishing to npm and creating releases.

#### For Maintainers

**Simple release process:**

```bash
# For patch release (1.2.0 -> 1.2.1)
npm run release

# For minor release (1.2.0 -> 1.3.0)
npm run release:minor

# For major release (1.2.0 -> 2.0.0)
npm run release:major
```

**What happens automatically:**

- Version number is incremented and committed
- Git tag is created and pushed
- GitHub workflow builds the package
- Package is published to npm (if version is new)
- GitHub release is created with assets

#### Required Secrets

To set up the workflows, add these secrets to your GitHub repository:

- `NPM_TOKEN`: Your npm automation token (create at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens))

**Note:** The `GITHUB_TOKEN` is automatically provided by GitHub Actions.

## Repository

Visit [swordfight.me](https://swordfight.me) to play the web version or learn more about the game.

## License

MIT

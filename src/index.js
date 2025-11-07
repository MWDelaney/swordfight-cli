#!/usr/bin/env node

/**
 * SwordFight CLI
 *
 * A command-line interface for the SwordFight game engine.
 * Play against the computer in your terminal with a D&D-inspired aesthetic.
 * Features interactive character selection, turn-based combat, and dramatic
 * narrative flavor text.
 *
 * @module swordfight-cli
 * @requires readline - For interactive terminal input
 * @requires chalk - For terminal text styling and colors
 * @requires swordfight-engine - Core game logic and character data
 *
 * @example
 * // Run the CLI
 * npx swordfight-cli
 *
 * // Or run directly
 * node index.js
 */

import readline from 'readline';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Game, CharacterLoader } from 'swordfight-engine';

// ES module path utilities
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
/** @constant {number} TYPING_DELAY - Milliseconds between each line for dramatic effect */
const TYPING_DELAY = 150;

// Load narrative flavor text for atmospheric descriptions
const flavorText = JSON.parse(
  readFileSync(join(__dirname, 'flavor-text.json'), 'utf-8')
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Selects a random element from an array
 * @param {Array} array - The array to choose from
 * @returns {*} A random element from the array
 */
const randomChoice = (array) => array[Math.floor(Math.random() * array.length)];

/**
 * Creates a promise that resolves after a specified delay
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after the delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));/**
 * Prints lines character by character with delays for dramatic effect
 * @param {string[]} lines - Array of text lines to print
 */
async function printLineByLine(lines) {
  for (const line of lines) {
    console.log(line);
    await delay(TYPING_DELAY);
  }
}

/**
 * Prints text character by character for maximum dramatic effect
 * @param {string} text - Text to print character by character
 * @param {number} charDelay - Delay in ms between each character (default: 30ms)
 */
async function printCharByChar(text, charDelay = 30) {
  for (const char of text) {
    process.stdout.write(char);
    await delay(charDelay);
  }
  process.stdout.write('\n');
}

// ============================================================================

// ============================================================================
// DISPLAY HELPER FUNCTIONS
// ============================================================================

/**
 * Formats a character's equipment status for display
 * Shows weapon and shield names with appropriate styling and icons
 * @param {Object} character - Character object with weapon and shield properties
 * @param {string|boolean} character.weapon - Weapon name or false if disarmed
 * @param {string|boolean} character.shield - Shield name or false if unshielded
 * @returns {string} Formatted equipment display string with colors and icons
 * @example
 * formatEquipment({ weapon: "Broadsword", shield: "Shield" })
 * // Returns: "⚔️  Broadsword │ 🛡️  Shield" (with colors)
 */
function formatEquipment(character) {
  const equipment = [];

  if (character.weapon) {
    const weaponName = typeof character.weapon === 'string' ? character.weapon : 'Armed';
    equipment.push(chalk.yellow(`⚔️  ${weaponName}`));
  } else {
    equipment.push(chalk.dim('⚔️  Disarmed'));
  }

  if (character.shield) {
    const shieldName = typeof character.shield === 'string' ? character.shield : 'Shielded';
    equipment.push(chalk.magenta(`🛡️  ${shieldName}`));
  } else {
    equipment.push(chalk.dim('🛡️  Unshielded'));
  }

  return equipment.join(' │ ');
}

/**
 * Formats bonus descriptions from a bonus array into human-readable text
 * Converts bonus objects like {strong: "2"} into "+2 to strong"
 * @param {Object[]} bonusArray - Array of bonus objects with type-value pairs
 * @returns {string} Comma-separated list of bonus descriptions
 * @example
 * formatBonusDescriptions([{strong: "2"}, {high: "1"}])
 * // Returns: "+2 to strong, +1 to high"
 */
function formatBonusDescriptions(bonusArray) {
  return bonusArray
    .map(bonusObj => {
      const entries = Object.entries(bonusObj);
      if (entries.length > 0) {
        const [type, value] = entries[0];
        return `+${value} to ${type}`;
      }
      return null;
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Formats damage breakdown for display in round results
 * Shows total damage with optional breakdown of components (base, modifier, bonus)
 * @param {Object} roundData - Round data containing score information
 * @param {number} roundData.totalScore - Total damage dealt
 * @param {number} roundData.score - Base damage from attack
 * @param {number} roundData.moveModifier - Damage modifier from move type
 * @param {number} roundData.bonus - Bonus damage from previous round effects
 * @returns {string} Formatted damage string with optional breakdown in dim text
 * @example
 * formatDamageBreakdown({totalScore: 5, score: 3, moveModifier: 1, bonus: 1})
 * // Returns: "5 damage (3 base, +1 move, +1 bonus)"
 */
function formatDamageBreakdown(roundData) {
  let result = `${roundData.totalScore} damage`;

  if (roundData.bonus > 0 || roundData.moveModifier !== 0) {
    const parts = [];
    if (roundData.score) {
      parts.push(`${roundData.score} base`);
    }
    if (roundData.moveModifier) {
      parts.push(`${roundData.moveModifier > 0 ? '+' : ''}${roundData.moveModifier} move`);
    }
    if (roundData.bonus > 0) {
      parts.push(`+${roundData.bonus} bonus`);
    }
    result += chalk.dim(` (${parts.join(', ')})`);
  }

  return result;
}

/**
 * Calculates the total bonus applicable to a specific move
 * Checks if move type or tag matches any bonus conditions
 * @param {Object} item - Move object to check for bonuses
 * @param {string} item.type - Move type (e.g., "strong", "high", "low")
 * @param {string} item.tag - Move tag (e.g., "Down Swing", "Thrust")
 * @param {Object[]|null} bonusInfo - Array of bonus objects to check against
 * @returns {number} Total bonus value for this move
 * @example
 * calculateMoveBonus({type: "strong", tag: "Down Swing"}, [{strong: "2"}])
 * // Returns: 2
 */
function calculateMoveBonus(item, bonusInfo) {
  if (!bonusInfo || bonusInfo.length === 0) {
    return 0;
  }

  let totalBonus = 0;
  bonusInfo.forEach(bonusObj => {
    for (const key in bonusObj) {
      if (item.type === key || item.tag === key) {
        totalBonus += +bonusObj[key];
      }
    }
  });
  return totalBonus;
}

// ============================================================================
// INTERACTIVE MENU SYSTEM
// ============================================================================

/**
 * Displays an interactive menu with cursor navigation
 * Users can navigate with arrow keys and select with Enter
 * Selected items show additional details (description, equipment)
 *
 * @param {Object[]} items - Array of menu items to display
 * @param {string} items[].name - Display name of the item
 * @param {string} [items[].tag] - Optional tag/label shown after name
 * @param {string} [items[].description] - Optional description shown when selected
 * @param {string|boolean} [items[].weapon] - Optional weapon info for characters
 * @param {string|boolean} [items[].shield] - Optional shield info for characters
 * @param {Object[]|null} bonusInfo - Optional bonus information for highlighting moves
 * @param {string} headerText - Header text displayed at top of menu
 * @returns {Promise<Object>} Promise that resolves with the selected item
 *
 * @example
 * const character = await selectFromMenu(
 *   [{name: "Warrior", tag: "❤️ 12 HP", weapon: "Sword"}],
 *   null,
 *   "Choose Your Champion"
 * );
 */
function selectFromMenu(items, bonusInfo = null, headerText = 'Choose Your Action') {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    let isFirstRender = true;

    // Setup readline for raw input to capture arrow keys
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    /**
     * Calculates total lines needed for menu display
     * Used to determine cursor movement for re-rendering
     * @returns {number} Total number of lines the menu will occupy
     */
    const calculateTotalLines = () => {
      let lines = 6; // header box (3) + blank (1) + items container + help text (1)
      let lastTag = null;

      items.forEach((item) => {
        // Add line for tag header when it changes
        const tag = item.tag || '';
        if (tag && tag !== lastTag) {
          lines += 1;
          lastTag = tag;
        }

        lines += 1; // Item name line
        // Always show description and equipment for all items (card-style)
        if (item.description) {
          lines += 1;
        }
        if (item.weapon !== undefined || item.shield !== undefined) {
          lines += 1;
        }
      });

      return lines;
    };

    /**
     * Renders the menu to the terminal
     * Clears previous output and redraws with current selection
     */
    const render = () => {
      const totalLines = calculateTotalLines();

      if (!isFirstRender) {
        process.stdout.write('\x1b[' + totalLines + 'A'); // Move cursor up
        process.stdout.write('\x1b[0J'); // Clear from cursor down
      }
      isFirstRender = false;

      console.log(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
      console.log(chalk.bold.white(`  ${headerText}`));
      console.log(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
      console.log();

      // Group items by tag for better organization
      let lastTag = null;
      items.forEach((item, index) => {
        const tag = item.tag || '';
        const bonus = calculateMoveBonus(item, bonusInfo);
        const bonusText = bonus > 0 ? chalk.yellow(` ⭐+${bonus}`) : '';

        // Show tag header when it changes
        if (tag && tag !== lastTag) {
          console.log(chalk.cyan(`  ${tag}:`));
          lastTag = tag;
        }

        if (index === selectedIndex) {
          console.log(chalk.bold.yellow(`    ▶ ${item.name}${bonusText}`));
        } else {
          console.log(chalk.dim(`      ${item.name}${bonusText}`));
        }

        // Always show description and equipment for all items (card-style)
        if (item.description) {
          const indent = index === selectedIndex ? '        ' : '        ';
          console.log(chalk.dim(`${indent}${item.description}`));
        }

        if (item.weapon !== undefined || item.shield !== undefined) {
          const equipment = [];
          if (item.weapon) {
            const weaponName = typeof item.weapon === 'string' ? item.weapon : 'Weapon';
            equipment.push(chalk.yellowBright(`⚔️  ${weaponName}`));
          }
          if (item.shield) {
            const shieldName = typeof item.shield === 'string' ? item.shield : 'Shield';
            equipment.push(chalk.magenta(`🛡️  ${shieldName}`));
          }
          if (equipment.length > 0) {
            const indent = index === selectedIndex ? '        ' : '        ';
            console.log(chalk.dim(`${indent}${equipment.join(' │ ')}`));
          }
        }
      });

      console.log();
      console.log(chalk.dim('  ↑/↓: Navigate | Enter: Select'));
    };

    render();

    /**
     * Handles keypress events for menu navigation
     * @param {string} str - The key string
     * @param {Object} key - Key object with name and ctrl properties
     */
    const onKeypress = (str, key) => {
      if (key.name === 'up') {
        selectedIndex = Math.max(0, selectedIndex - 1);
        render();
      } else if (key.name === 'down') {
        selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
        render();
      } else if (key.name === 'return') {
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        console.log();
        resolve(items[selectedIndex]);
      } else if (key.ctrl && key.name === 'c') {
        process.exit();
      }
    };

    process.stdin.on('keypress', onKeypress);
  });
}

// ============================================================================
// POLYFILLS FOR BROWSER APIS
// ============================================================================

/**
 * Create readline interface for user input
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Adapter class to polyfill browser's document.addEventListener
 * The game engine expects browser APIs, so we simulate them in Node.js
 */
class CLIAdapter {
  constructor() {
    this.eventHandlers = new Map();
  }

  /**
   * Adds an event listener (mimics DOM addEventListener)
   * @param {string} event - Event name to listen for
   * @param {Function} handler - Handler function to call when event fires
   */
  addEventListener(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Dispatches an event to all registered listeners (mimics DOM dispatchEvent)
   * @param {Object} event - Event object with type property
   * @param {string} event.type - Type of event to dispatch
   */
  dispatchEvent(event) {
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => handler(event));
  }
}

// Setup global polyfills for the game engine
const adapter = new CLIAdapter();

/** @global document - Polyfilled document object for game events */
global.document = adapter;

/** @global localStorage - Polyfilled localStorage for game state persistence */
global.localStorage = {
  storage: new Map(),
  getItem(key) { return this.storage.get(key) || null; },
  setItem(key, value) { this.storage.set(key, value); }
};

/** @global window - Minimal window object for game compatibility */
global.window = { logging: false };

/** @global CustomEvent - Polyfilled CustomEvent constructor */
global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};

// ============================================================================
// GAME STATE
// ============================================================================

/** @type {Game|null} Current game instance */
let game = null;

/** @type {Object[]} Array of available moves for current turn */
let currentMoves = [];

/** @type {Object[]} Bonus modifiers active for current turn */
let currentBonus = [];

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

/**
 * Displays health bars and current status for both combatants
 * Shows names, health bars, HP values, and equipment status
 * @returns {Promise<void>} Promise that resolves when display is complete
 */
async function displayHealthBars() {
  const lines = [];
  const { myCharacter, opponentsCharacter } = game;

  /**
   * Creates a visual health bar with colored blocks
   * @param {number} current - Current health points
   * @param {number} max - Maximum health points
   * @returns {string} Colored health bar string
   */
  const createHealthBar = (current, max) => {
    const filled = Math.max(0, Math.floor((current / max) * 20));
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    return current > max * 0.3 ? chalk.green(bar) : chalk.red(bar);
  };

  lines.push(chalk.bold.cyan('┌─────────────────────────────────────────────────────────┐'));
  lines.push(chalk.bold.white('  Combatants'));
  lines.push(chalk.bold.cyan('└─────────────────────────────────────────────────────────┘'));
  lines.push('');

  // Player
  lines.push(chalk.bold.green(`⚔️  ${myCharacter.name} (You)`));
  lines.push('    ' + createHealthBar(myCharacter.health, myCharacter.startingHealth) +
    chalk.white(` ${myCharacter.health}/${myCharacter.startingHealth} HP`));
  lines.push(chalk.dim(`    You: ${formatEquipment(myCharacter)}`));
  lines.push('');

  // Opponent
  lines.push(chalk.bold.red(`🗡️  ${opponentsCharacter.name}`));
  lines.push('    ' + createHealthBar(opponentsCharacter.health, opponentsCharacter.startingHealth) +
    chalk.white(` ${opponentsCharacter.health}/${opponentsCharacter.startingHealth} HP`));
  lines.push(chalk.dim(`    Foe: ${formatEquipment(opponentsCharacter)}`));
  lines.push('');

  await printLineByLine(lines);
}

/**
 * Displays the results of a combat round
 * Shows moves, damage, bonuses, restrictions, and special effects
 * with dramatic flavor text based on the outcome
 *
 * @param {Object} myRoundData - Player's round results
 * @param {Object} opponentsRoundData - Opponent's round results
 * @returns {Promise<void>} Promise that resolves when display is complete
 */
async function displayRoundResult(myRoundData, opponentsRoundData) {
  let lines = [];

  lines.push(chalk.bold.magenta(`\n═══ Round ${game.roundNumber} Results ═══\n`));

  // Flavor text based on round outcome
  const playerHit = myRoundData.totalScore > 0;
  const opponentHit = opponentsRoundData.totalScore > 0;
  const playerRestricted = opponentsRoundData.result.restrict?.length > 0;
  const opponentRestricted = myRoundData.result.restrict?.length > 0;
  const anyRestricted = playerRestricted || opponentRestricted;

  let flavorCategory;
  if (!playerHit && !opponentHit) {
    flavorCategory = anyRestricted ? 'bothMissRestricted' : 'bothMiss';
  } else if (!playerHit && opponentHit) {
    flavorCategory = anyRestricted ? 'playerMissOpponentHitsRestricted' : 'playerMissOpponentHits';
  } else if (playerHit && !opponentHit) {
    flavorCategory = anyRestricted ? 'playerHitsOpponentMissRestricted' : 'playerHitsOpponentMiss';
  } else {
    flavorCategory = anyRestricted ? 'bothHitRestricted' : 'bothHit';
  }

  lines.push(chalk.italic.dim(randomChoice(flavorText.roundResults[flavorCategory])));
  lines.push('');

  // Print initial lines
  await printLineByLine(lines);

  // Dramatic move and range description (character by character)
  const moveFlavorParts = [];

  // Format player's move with tag if present
  const playerMoveText = myRoundData.myMove.tag
    ? `${chalk.dim(myRoundData.myMove.tag.toLowerCase() + ':')} ${chalk.cyan(myRoundData.myMove.name.toLowerCase())}`
    : chalk.cyan(myRoundData.myMove.name.toLowerCase());
  moveFlavorParts.push(`You ${playerMoveText}`);

  // Format opponent's move with tag if present
  const opponentMoveText = opponentsRoundData.myMove.tag
    ? `${chalk.dim(opponentsRoundData.myMove.tag.toLowerCase() + ':')} ${chalk.red(opponentsRoundData.myMove.name.toLowerCase())}`
    : chalk.red(opponentsRoundData.myMove.name.toLowerCase());
  moveFlavorParts.push(`they ${opponentMoveText}`);

  const moveFlavor = moveFlavorParts.join(', ');

  await printCharByChar(chalk.dim(moveFlavor + '.'));
  await delay(300);

  const rangeFlavor = randomChoice(flavorText.moveDescriptions[myRoundData.result.range] || []);
  if (rangeFlavor) {
    await printCharByChar(chalk.italic.dim(rangeFlavor));
    await delay(300);
  }

  // Results and damage narrative
  const resultParts = [];

  // Your result
  if (opponentsRoundData.result.name) {
    resultParts.push(`You find yourself ${chalk.cyan(opponentsRoundData.result.name.toLowerCase())}`);
  }

  // Opponent's result
  if (myRoundData.result.name) {
    if (resultParts.length > 0) {
      resultParts.push(`your foe ${chalk.red(myRoundData.result.name.toLowerCase())}`);
    } else {
      resultParts.push(`Your opponent ${chalk.red(myRoundData.result.name.toLowerCase())}`);
    }
  }

  if (resultParts.length > 0) {
    await printCharByChar(chalk.dim(resultParts.join(', ') + '.'));
    await delay(300);
  }

  // Damage narrative
  const damageParts = [];

  if (opponentsRoundData.totalScore > 0 && myRoundData.totalScore > 0) {
    // Both hit
    damageParts.push(`${chalk.red(`You take ${opponentsRoundData.totalScore} damage`)}`);
    damageParts.push(`${chalk.green(`deal ${myRoundData.totalScore} in return`)}`);
  } else if (opponentsRoundData.totalScore > 0) {
    // Only opponent hit
    damageParts.push(`${chalk.red(`You take ${opponentsRoundData.totalScore} damage`)}`);
  } else if (myRoundData.totalScore > 0) {
    // Only player hit
    damageParts.push(`${chalk.green(`You deal ${myRoundData.totalScore} damage`)}`);
  }

  if (damageParts.length > 0) {
    await printCharByChar(chalk.dim(damageParts.join(', ') + '.'));
    await delay(300);
  }

  console.log();

  // Reset lines array for combat results
  lines = [];

  // Player outcome
  lines.push(chalk.cyan('➤ You:') + (opponentsRoundData.result.name ? ' ' + chalk.bold(opponentsRoundData.result.name) : ''));

  if (opponentsRoundData.totalScore > 0) {
    lines.push(chalk.red(`  💔 Took ${opponentsRoundData.totalScore} damage from opponent`));
  }

  if (myRoundData.totalScore > 0) {
    lines.push(chalk.green(`  💥 Dealt ${formatDamageBreakdown(myRoundData)} to opponent`));
  }

  // Show bonuses the opponent gave to the player (bonuses player will receive next round)
  if (opponentsRoundData.nextRoundBonus?.length > 0) {
    lines.push(chalk.yellow(`  ⭐ Next round: ${formatBonusDescriptions(opponentsRoundData.nextRoundBonus)}`));
  }

  if (opponentsRoundData.result.restrict?.length > 0) {
    lines.push(chalk.gray(`  ⚠️  Restrictions: ${opponentsRoundData.result.restrict.join(', ')}`));
  }

  lines.push('');

  // Opponent outcome
  lines.push(chalk.red('➤ Opponent:') + (myRoundData.result.name ? ' ' + chalk.bold(myRoundData.result.name) : ''));

  if (myRoundData.totalScore > 0) {
    lines.push(chalk.red(`  💔 Took ${myRoundData.totalScore} damage from you`));
  }

  if (opponentsRoundData.totalScore > 0) {
    lines.push(chalk.green(`  💥 Dealt ${formatDamageBreakdown(opponentsRoundData)} to you`));
  }

  // Show bonuses the player gave to the opponent (bonuses opponent will receive next round)
  if (myRoundData.nextRoundBonus?.length > 0) {
    lines.push(chalk.yellow(`  ⭐ Next round: ${formatBonusDescriptions(myRoundData.nextRoundBonus)}`));
  }

  if (myRoundData.result.restrict?.length > 0) {
    lines.push(chalk.gray(`  ⚠️  Restrictions: ${myRoundData.result.restrict.join(', ')}`));
  }

  // Special effects
  if (myRoundData.result.weaponDislodged) {
    lines.push(chalk.yellow('⚔️  Opponent\'s weapon was dislodged!'));
  }
  if (opponentsRoundData.result.weaponDislodged) {
    lines.push(chalk.yellow('⚔️  Your weapon was dislodged!'));
  }
  if (myRoundData.result.shieldDestroyed) {
    lines.push(chalk.yellow('    🛡️  Their shield splinters apart!'));
  }
  if (opponentsRoundData.result.shieldDestroyed) {
    lines.push(chalk.yellow('    🛡️  Your shield shatters under the blow!'));
  }

  lines.push('');

  await printLineByLine(lines);
}

// ============================================================================
// GAME FLOW FUNCTIONS
// ============================================================================

/**
 * Prompts player to select their character
 * Displays all available characters with their stats and equipment
 * @returns {Promise<string>} Promise that resolves with selected character slug
 */
async function selectCharacter() {
  const menuItems = CharacterLoader.getAvailableCharacters().map(slug => {
    const char = CharacterLoader.getCharacter(slug);
    return {
      name: `${char.name} [❤️ ${char.health} HP]`,
      slug: slug,
      description: char.description || 'A fierce warrior ready for battle',
      weapon: char.weapon,
      shield: char.shield
    };
  });

  const selected = await selectFromMenu(menuItems, null, 'Choose Your Champion');
  console.log();
  return selected.slug;
}

/**
 * Prompts player to select their next move
 * Shows health bars, then displays filtered moves with bonuses
 * @returns {Promise<void>} Promise that resolves when move is selected
 */
async function promptForMove() {
  await displayHealthBars();
  console.log();
  console.log(chalk.dim('Press Enter to choose your move...'));

  await new Promise((resolve) => {
    rl.question('', () => resolve());
  });

  console.log();
  const selectedMove = await selectFromMenu(currentMoves, currentBonus);

  adapter.dispatchEvent(new CustomEvent('inputMove', {
    detail: { move: selectedMove.id }
  }));
}

/**
 * Main game initialization and loop
 * Sets up character selection, opponent, narrative intro, game events,
 * and starts the turn-based combat loop
 * @returns {Promise<void>} Promise that resolves when game ends
 */
async function startGame() {
  try {
    const playerCharacter = await selectCharacter();

    // Random opponent
    const availableCharacterSlugs = CharacterLoader.getAvailableCharacters();
    const opponentSlug = availableCharacterSlugs[Math.floor(Math.random() * availableCharacterSlugs.length)];
    const opponentData = CharacterLoader.getCharacter(opponentSlug);

    // Atmospheric introduction
    console.log(chalk.green('\n✓ Preparing for battle...\n'));
    await delay(800);

    await printCharByChar(chalk.dim(randomChoice(flavorText.locations)));
    await delay(400);
    console.log();
    await printCharByChar(chalk.yellow(randomChoice(flavorText.introductions[opponentSlug] || flavorText.introductions['human-fighter'])));
    await delay(400);
    await printCharByChar(chalk.bold.white(`\n${opponentData.name} challenges you to single combat!\n`));
    await delay(400);
    await printCharByChar(chalk.cyan(randomChoice(flavorText.ready)));
    await delay(600);
    console.log();

    // Initialize game
    global.localStorage.storage.clear();
    game = new Game('computer', playerCharacter, opponentSlug);

    // Event handlers for game state changes
    let isProcessingRound = false;
    let gameEnded = false;

    /**
     * Handler for 'round' event - processes combat round results
     * Updates bonus state and displays round results
     */
    adapter.addEventListener('round', async(e) => {
      const { myRoundData, opponentsRoundData } = e.detail;
      isProcessingRound = true;
      // Store bonuses the opponent gave us for next round (not the ones we gave them!)
      currentBonus = opponentsRoundData.nextRoundBonus || [];
      await displayRoundResult(myRoundData, opponentsRoundData);
      await delay(500);
      isProcessingRound = false;
    });

    /**
     * Handler for 'setup' event - prepares for next turn
     * Waits for round processing to complete, then prompts for move
     */
    adapter.addEventListener('setup', async() => {
      while (isProcessingRound) {
        await delay(100);
      }
      if (gameEnded) {
        return;
      }
      currentMoves = game.Moves.filteredMoves;
      await promptForMove();
    });

    /**
     * Handler for 'victory' event - displays victory screen and exits
     */
    adapter.addEventListener('victory', async() => {
      gameEnded = true;
      while (isProcessingRound) {
        await delay(100);
      }
      console.log();
      await delay(500);
      await printCharByChar(chalk.green(randomChoice(flavorText.victory)));
      await delay(800);
      console.log();
      console.log(chalk.bold.green('╔════════════════════════════════════════════════════════════╗'));
      console.log(chalk.bold.yellow('                    ⚔️  VICTORY! ⚔️                          '));
      console.log(chalk.bold.green('╚════════════════════════════════════════════════════════════╝'));
      console.log();
      console.log(chalk.white(`  The ${game.opponentsCharacter.name} falls before you!`));
      console.log(chalk.dim('  Your legend grows...'));
      console.log();
      rl.close();
      process.exit(0);
    });

    /**
     * Handler for 'defeat' event - displays defeat screen and exits
     */
    adapter.addEventListener('defeat', async() => {
      gameEnded = true;
      while (isProcessingRound) {
        await delay(100);
      }
      console.log();
      await delay(500);
      await printCharByChar(chalk.red(randomChoice(flavorText.defeat)));
      await delay(800);
      console.log();
      console.log(chalk.bold.red('╔════════════════════════════════════════════════════════════╗'));
      console.log(chalk.bold.white('                    💀 DEFEAT 💀                            '));
      console.log(chalk.bold.red('╚════════════════════════════════════════════════════════════╝'));
      console.log();
      console.log(chalk.white(`  ${game.opponentsCharacter.name} has bested you in combat.`));
      console.log(chalk.dim('  You have fallen...'));
      console.log();
      rl.close();
      process.exit(0);
    });

    // Brief delay before starting first turn
    await delay(500);
    game.setUp();

  } catch (error) {
    console.error(chalk.red('Error starting game:'), error);
    rl.close();
    process.exit(1);
  }
}

// ============================================================================
// SIGNAL HANDLERS
// ============================================================================

/**
 * Handle Ctrl+C (SIGINT) gracefully
 * Displays a farewell message and exits cleanly
 */
process.on('SIGINT', () => {
  console.log();
  console.log(chalk.yellow('═══════════════════════════════════════════════════════════'));
  console.log(chalk.dim('  You flee from the battle...'));
  console.log(chalk.yellow('═══════════════════════════════════════════════════════════'));
  console.log();
  rl.close();
  process.exit(0);
});

// ============================================================================
// GAME STARTUP
// ============================================================================

// Display welcome banner
console.log();
console.log(chalk.bold.yellow('╔════════════════════════════════════════════════════════════╗'));
console.log(chalk.bold.red('               ⚔️  SWORD FIGHT ⚔️'));
console.log(chalk.dim('          A Tale of Blades and Bravery'));
console.log(chalk.bold.yellow('╚════════════════════════════════════════════════════════════╝'));
console.log();
console.log(chalk.dim('  Prepare yourself for mortal combat...'));
console.log();

// Start the game
startGame();

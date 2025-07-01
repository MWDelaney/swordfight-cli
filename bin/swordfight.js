#!/usr/bin/env node
/**
 * SwordFight CLI - Command-line sword fighting game
 *
 * This CLI application provides a command-line interface for the sword fighting game,
 * communicating with the game engine using the same event system as the web front-end.
 */

import { fileURLToPath } from 'url';
import path from 'path';

// Import utilities
import { setupDOMEnvironment, CustomEvent } from '../lib/utils/domEnvironment.js';
import { TerminalInput } from '../lib/utils/terminalInput.js';
import { createBox } from '../lib/utils/boxDrawing.js';
import { bold, cyan, dim, green, red } from '../lib/utils/colors.js';

// Import display classes
import { GameDisplay } from '../lib/display/gameDisplay.js';
import { MoveSelector } from '../lib/display/moveSelector.js';
import { CharacterSelector } from '../lib/display/characterSelector.js';

// Import game classes
import { GameEventHandler } from '../lib/game/gameEventHandler.js';

// Import the game engine
import Game from 'swordfight-engine';

// Get current directory for imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup DOM environment
setupDOMEnvironment();

// Create character manager instance using the bundled engine
const characterManager = new Game.CharacterManager();

// Make character manager globally available
global.characterManager = characterManager;

/**
 * Main CLI Frontend class - orchestrates the game flow
 */
class CLIFrontend {
  /**
   * Creates a new CLIFrontend instance
   * Initializes all display components and game state
   */
  constructor() {
    this.terminalInput = new TerminalInput();
    this.gameDisplay = new GameDisplay();
    this.moveSelector = new MoveSelector(this.gameDisplay);
    this.characterSelector = new CharacterSelector(this.gameDisplay);
    this.eventHandler = new GameEventHandler(this);

    // Game state
    this.game = null;
    this.gameStarted = false;
    this.playerName = '';
    this.initialSetupComplete = false;
    this.waitingForMove = false;
    this.lastRoundData = null;
    this.lastOpponentsRoundData = null;

    // Setup event listeners
    this.eventHandler.setupEventListeners();
  }

  /**
   * Main entry point - starts the CLI game application
   * Handles the complete game flow from welcome to character selection to game start
   * @returns {Promise<void>}
   */
  async start() {
    try {
      this.showWelcome();
      await this.loadCharacters();
      await this.setupPlayer();
      this.startGame();
    } catch (error) {
      console.error(red('✗ Failed to start game:'), error.message);
      this.exit();
    }
  }

  /**
   * Displays the welcome screen with game title and description
   */
  showWelcome() {
    console.clear();
    console.log('\n');
    console.log(bold(cyan('🗡️  ⚔️  SWORDFIGHT CLI  ⚔️  🛡️')));
    console.log(bold(cyan('═══════════════════════════════════')));
    console.log(dim('Welcome to the command-line sword fighting arena!'));
    console.log('');
  }

  /**
   * Loads character data from the game assets
   * @returns {Promise<void>}
   */
  async loadCharacters() {
    process.stdout.write(dim('Loading characters... '));
    await characterManager.loadCharacters();
    console.log(green('✓ Done'));
    console.log('');
  }

  /**
   * Handles player setup including name input and character selection
   * @returns {Promise<void>}
   */
  async setupPlayer() {
    console.log(createBox('PLAYER SETUP', ''));
    console.log('');

    // Get player name
    this.playerName = await this.terminalInput.question(cyan('Enter your warrior name: '));
    if (!this.playerName.trim()) {
      this.playerName = 'Player';
    }
    localStorage.setItem('playerName', this.playerName);
    console.log(green(`Welcome, ${bold(this.playerName)}!`));
    console.log('');

    // Character selection
    const characters = characterManager.getAllCharacters();
    const selectedCharacter = await this.characterSelector.selectCharacter(characters);
    localStorage.setItem('myCharacterSlug', selectedCharacter.slug);

    console.log('');
    console.log(green('✓ Character selected:'), bold(selectedCharacter.name));
    console.log(dim(`  ${selectedCharacter.description}`));
    console.log('');
  }

  /**
   * Initializes and starts the game with selected character against computer opponent
   */
  startGame() {
    console.log(createBox('BATTLE BEGINS', 'Preparing for combat against computer opponent...'));
    console.log('');

    // Get all available characters for opponent selection
    const allCharacters = characterManager.getAllCharacters();
    const playerCharacterSlug = localStorage.getItem('myCharacterSlug') || 'human-fighter';

    // Filter out the player's character to avoid self-fighting
    const availableOpponents = allCharacters.filter(char => char.slug !== playerCharacterSlug);

    // Randomly select an opponent character
    const randomOpponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];

    console.log(dim(`Computer opponent: ${randomOpponent.name} (${randomOpponent.description})`));
    console.log('');

    const gameOptions = {
      myCharacterSlug: playerCharacterSlug,
      opponentCharacterSlug: randomOpponent.slug
    };

    // Create game instance with unique ID and computer opponent
    this.game = new Game('cli-game-' + Date.now(), 'computer', gameOptions);
  }

  /**
   * Prompts user to press Enter before showing available moves
   * @returns {Promise<void>}
   */
  async promptForMovesDisplay() {
    console.log(dim('Press Enter to see available moves...'));
    await this.terminalInput.waitForEnter();
    console.log('');
    this.showAvailableMoves();
  }

  /**
   * Displays available moves and handles move selection
   * @returns {Promise<void>}
   */
  async showAvailableMoves() {
    if (!this.game || !this.game.Moves) {
      console.log(red('❌ No moves available!'));
      return;
    }

    const availableMoves = this.game.Moves.filteredMoves || this.game.myCharacter.moves;
    if (!availableMoves || availableMoves.length === 0) {
      console.log(red('❌ No moves available!'));
      return;
    }

    this.waitingForMove = true;

    try {
      const selectedMove = await this.moveSelector.selectMove(
        availableMoves,
        this.game,
        this.lastRoundData,
        this.lastOpponentsRoundData
      );

      const moveEvent = new CustomEvent('inputMove', {
        detail: { move: selectedMove.id }
      });
      document.dispatchEvent(moveEvent);
      this.waitingForMove = false;
    } catch (error) {
      console.error('Error selecting move:', error);
      this.waitingForMove = false;
    }
  }

  /**
   * Displays end game message and closes the application
   */
  endGame() {
    console.log(dim('Thanks for playing SwordFight CLI!'));
    console.log(dim('May your blade stay sharp, warrior.'));
    console.log('');
    this.exit();
  }

  /**
   * Exits the application gracefully by closing input handlers and terminating process
   */
  exit() {
    this.terminalInput.close();
    process.exit(0);
  }
}

// Error handling
process.on('unhandledRejection', (reason, _promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the CLI game
const cli = new CLIFrontend();
cli.start().catch(error => {
  console.error('Failed to start CLI game:', error);
  process.exit(1);
});

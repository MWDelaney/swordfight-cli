/**
 * Game event handler for CLI
 */

import { bold, green, red, yellow, cyan, magenta, blue, dim, colors, colorize } from '../utils/colors.js';
import { createBox } from '../utils/boxDrawing.js';

export class GameEventHandler {
  /**
   * Creates a new GameEventHandler instance
   * @param {CLIFrontend} cliFrontend - Reference to the main CLI frontend instance
   */
  constructor(cliFrontend) {
    this.cli = cliFrontend;
  }

  /**
   * Sets up all game event listeners for the CLI interface
   * Binds handler methods to their respective game events
   */
  setupEventListeners() {
    document.addEventListener('start', this.handleStart.bind(this));
    document.addEventListener('setup', this.handleSetup.bind(this));
    document.addEventListener('round', this.handleRound.bind(this));
    document.addEventListener('move', this.handleMove.bind(this));
    document.addEventListener('myMove', this.handleMyMove.bind(this));
    document.addEventListener('opponentsMove', this.handleOpponentsMove.bind(this));
    document.addEventListener('victory', this.handleVictory.bind(this));
    document.addEventListener('defeat', this.handleDefeat.bind(this));
  }

  /**
   * Handles the game start event - initializes battle and triggers setup
   * @param {Event} event - Game start event
   */
  handleStart(_event) {
    console.log(cyan('🚀 Connection established! Initializing battle...'));
    console.log('');
    this.cli.gameStarted = true;
    this.cli.game.setUp();
  }

  /**
   * Handles the game setup event - manages initial setup and round 1 transition
   * @param {Event} event - Game setup event
   */
  handleSetup(_event) {
    if (this.cli.initialSetupComplete) {
      this.cli.promptForMovesDisplay().catch(error => {
        console.error('Error prompting for moves:', error);
      });
    } else {
      console.log(dim('⚙️  Initial setup complete - ready for player input in round 1...'));
      console.log('');
      this.cli.initialSetupComplete = true;
      this.cli.promptForMovesDisplay().catch(error => {
        console.error('Error prompting for moves:', error);
      });
    }
  }

  /**
   * Handles the move confirmation event - displays move confirmation and waiting status
   * @param {Event} event - Move event with move details
   */
  handleMove(event) {
    const move = event.detail;
    console.log(green('✅ Move confirmed:'), bold(`${move.name} (${move.tag})`));
    console.log(yellow('⏳ Waiting for opponent response...'));
    console.log('');
    this.cli.waitingForMove = false;
  }

  /**
   * Handles the round completion event - displays round results and prepares for next round
   * @param {Event} event - Round event with round data for both players
   */
  async handleRound(event) {
    const { myRoundData, opponentsRoundData } = event.detail;

    this.cli.lastRoundData = myRoundData;
    this.cli.lastOpponentsRoundData = opponentsRoundData;

    await this.displayRoundResults(myRoundData, opponentsRoundData);
    this.checkForNextRound();
  }

  /**
   * Displays round results including game state and combat details
   * @param {Object} myRoundData - Player's round data
   * @param {Object} opponentsRoundData - Opponent's round data
   */
  async displayRoundResults(myRoundData, opponentsRoundData) {
    // Add visual separator
    console.log('');
    console.log(bold(cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
    console.log('');
    const roundNumber = this.cli.game.roundNumber;
    console.log(bold(magenta(`⚔️  ROUND ${roundNumber} RESULTS ⚔️`)));
    console.log(magenta('══════════════════════════'));

    // Show detailed combat results for rounds > 0
    if (this.cli.game.roundNumber > 0) {
      await this.displayCombatDetails(myRoundData, opponentsRoundData);

      // Show round progression messages after combat details (when a round has actually completed)
      const currentRound = this.cli.game.roundNumber;
      console.log(bold(`Round ${currentRound - 1} completed`));
      console.log(bold(blue(`🎯 Round ${currentRound} begins!`)));
      console.log('');
      console.log(dim('Press Enter to select your next move...'));
      console.log('');
    } else {
      // Show battle status for initial setup
      console.log(this.cli.gameDisplay.buildGameStateContent(this.cli.game, this.cli.playerName));
      console.log('');
      console.log(dim('⚙️  Initial setup completed - both fighters have taken their starting positions.'));
      console.log(bold(blue(`🎯 Round ${this.cli.game.roundNumber} begins!`)));
      console.log('');
      console.log(dim('Press Enter to select your next move...'));
      console.log('');
    }
  }

  /**
   * Displays detailed combat information for rounds 1 and beyond with delays between chunks
   * @param {Object} myRoundData - Player's round data
   * @param {Object} opponentsRoundData - Opponent's round data
   */
  async displayCombatDetails(myRoundData, opponentsRoundData) {
    // 1. First show "Combat maneuver completed"
    console.log(dim('⚔️  Combat maneuver completed.'));
    console.log('');
    await this.delay(800);

    // 2. Then show moves
    console.log(cyan('🤺 Your move:'), bold(green(`${myRoundData.myMove.name} (${myRoundData.myMove.tag})`)));
    console.log(yellow('🤖 Opponent:'), bold(red(`${opponentsRoundData.myMove.name} (${opponentsRoundData.myMove.tag})`)));
    console.log('');
    await this.delay(1000);

    // 3. Then show damage
    this.displayDamageResults(myRoundData, opponentsRoundData);
    await this.delay(800);

    // 4. Show restrictions and bonuses
    this.displayRestrictionsAndBonuses(myRoundData, opponentsRoundData);
    await this.delay(600);

    // 5. Show battle status
    console.log(this.cli.gameDisplay.buildGameStateContent(this.cli.game, this.cli.playerName));
    console.log('');

    // Battle status and tactical information removed - they remain in the move selector
  }

  /**
   * Displays enhanced tactical information using the same prominent style as move selection
   * @param {Object} myRoundData - Player's round data
   * @param {Object} opponentsRoundData - Opponent's round data
   */
  displayEnhancedTacticalInfo(myRoundData, opponentsRoundData) {
    // Create a prominent tactical information display
    console.log(bold(cyan('📊 TACTICAL INFORMATION')));
    console.log(cyan('══════════════════════════'));
    console.log('');

    // Show current range prominently
    const rangeColor = myRoundData.result.range === 'close' ? red :
      myRoundData.result.range === 'medium' ? yellow : cyan;
    console.log(bold('🎯 Combat Range: ') + rangeColor(bold(myRoundData.result.range.toUpperCase())));
    console.log('');

    // Show your own status first (how your opponent sees you) - PROMINENT
    console.log(bold(cyan('🤺 Your current status: ')) +
      bold(colorize(opponentsRoundData.result.name, colors.bgCyan + colors.bright)));

    // Show how you see your opponent - PROMINENT
    console.log(bold(yellow('👀 You see your opponent: ')) +
      bold(colorize(myRoundData.result.name, colors.bgYellow + colors.bright)));
    console.log('');

    // Show restrictions and bonuses more prominently
    console.log(bold(red('🚫 RESTRICTIONS & BONUSES')));
    console.log(red('─────────────────────────'));

    // Show player's restrictions for next turn
    const playerRestrictions = this.cli.gameDisplay.formatAllRestrictions(opponentsRoundData.result || {});
    if (playerRestrictions.length > 0) {
      const restrictionText = playerRestrictions.join(', ');
      console.log(red('▶ Your restrictions next turn: ') + bold(red(restrictionText)));
    } else {
      console.log(dim('▶ Your restrictions next turn: None'));
    }

    // Show opponent's restrictions for next turn
    const opponentRestrictions = this.cli.gameDisplay.formatAllRestrictions(myRoundData.result || {});
    if (opponentRestrictions.length > 0) {
      const restrictionText = opponentRestrictions.join(', ');
      console.log(magenta('▶ Opponent restrictions next turn: ') + bold(magenta(restrictionText)));
    } else {
      console.log(dim('▶ Opponent restrictions next turn: None'));
    }

    // Show bonuses for next turn
    const myBonusSummary = this.cli.gameDisplay.getBonusSummary(myRoundData.nextRoundBonus);
    const opponentBonusSummary = this.cli.gameDisplay.getBonusSummary(opponentsRoundData.nextRoundBonus);

    if (myBonusSummary) {
      const bonusText = Object.entries(myBonusSummary)
        .map(([key, value]) => `${key} (+${value})`)
        .join(', ');
      console.log(green('▶ Your bonuses next turn: ') + bold(green(bonusText)));
    } else {
      console.log(dim('▶ Your bonuses next turn: None'));
    }

    if (opponentBonusSummary) {
      const bonusText = Object.entries(opponentBonusSummary)
        .map(([key, value]) => `${key} (+${value})`)
        .join(', ');
      console.log(yellow('▶ Opponent bonuses next turn: ') + bold(yellow(bonusText)));
    } else {
      console.log(dim('▶ Opponent bonuses next turn: None'));
    }
    console.log('');
  }

  /**
   * Displays damage results with detailed breakdown for both players
   * Uses the same sophisticated logic as the original cli-game.js
   * @param {Object} myRoundData - Player's round data
   * @param {Object} opponentsRoundData - Opponent's round data
   */
  displayDamageResults(myRoundData, opponentsRoundData) {
    // Player damage results
    if (myRoundData.result && myRoundData.result.score !== '' && myRoundData.totalScore > 0) {
      console.log(green('💥 You dealt'), bold(green(`${myRoundData.totalScore} damage!`)));
      // Show damage breakdown when there's damage
      const parts = [];
      if (myRoundData.score !== '' && myRoundData.score !== undefined) {
        parts.push(`Base hit: ${myRoundData.score}`);
      }
      if (myRoundData.moveModifier !== undefined) {
        parts.push(`Move modifier: ${myRoundData.moveModifier > 0 ? '+' : ''}${myRoundData.moveModifier}`);
      }
      if (myRoundData.bonus !== undefined && myRoundData.bonus !== 0) {
        parts.push(`Previous round bonus: ${myRoundData.bonus > 0 ? '+' : ''}${myRoundData.bonus}`);
      }
      if (parts.length > 0) {
        console.log(dim(`   (${parts.join(', ')})`));
      }
    } else if (myRoundData.result && myRoundData.result.score !== '' && myRoundData.score !== '' && myRoundData.score > 0) {
      // Hit was made but no damage due to modifiers (only for scoring moves)
      console.log(yellow('⚡ You hit but dealt no damage'));
      const parts = [];
      parts.push(`Base hit: ${myRoundData.score}`);
      if (myRoundData.moveModifier !== undefined) {
        parts.push(`Move modifier: ${myRoundData.moveModifier > 0 ? '+' : ''}${myRoundData.moveModifier}`);
      }
      if (myRoundData.bonus !== 0) {
        parts.push(`Previous round bonus: ${myRoundData.bonus > 0 ? '+' : ''}${myRoundData.bonus}`);
      }
      console.log(dim(`   (${parts.join(', ')} = ${myRoundData.totalScore})`));
    }

    // Opponent damage results
    if (opponentsRoundData.result && opponentsRoundData.result.score !== '' && opponentsRoundData.totalScore > 0) {
      console.log(red('💔 You took'), bold(red(`${opponentsRoundData.totalScore} damage!`)));
      // Show damage breakdown when there's damage
      const parts = [];
      if (opponentsRoundData.score !== '' && opponentsRoundData.score !== undefined) {
        parts.push(`Base hit: ${opponentsRoundData.score}`);
      }
      if (opponentsRoundData.moveModifier !== undefined) {
        parts.push(`Move modifier: ${opponentsRoundData.moveModifier > 0 ? '+' : ''}${opponentsRoundData.moveModifier}`);
      }
      if (opponentsRoundData.bonus !== undefined && opponentsRoundData.bonus !== 0) {
        parts.push(`Previous round bonus: ${opponentsRoundData.bonus > 0 ? '+' : ''}${opponentsRoundData.bonus}`);
      }
      if (parts.length > 0) {
        console.log(dim(`   (${parts.join(', ')})`));
      }
    } else if (opponentsRoundData.result && opponentsRoundData.result.score !== '' && opponentsRoundData.score !== '' && opponentsRoundData.score > 0) {
      // Opponent hit but no damage due to modifiers (only for scoring moves)
      console.log(yellow('⚡ Opponent hit but dealt no damage'));
      const parts = [];
      parts.push(`Base hit: ${opponentsRoundData.score}`);
      if (opponentsRoundData.moveModifier !== undefined) {
        parts.push(`Move modifier: ${opponentsRoundData.moveModifier > 0 ? '+' : ''}${opponentsRoundData.moveModifier}`);
      }
      if (opponentsRoundData.bonus !== 0) {
        parts.push(`Previous round bonus: ${opponentsRoundData.bonus > 0 ? '+' : ''}${opponentsRoundData.bonus}`);
      }
      console.log(dim(`   (${parts.join(', ')} = ${opponentsRoundData.totalScore})`));
    }

    // If neither player attempted damage or hit, show informational message
    const playerAttemptedDamage = myRoundData.result && myRoundData.result.score !== '';
    const opponentAttemptedDamage = opponentsRoundData.result && opponentsRoundData.result.score !== '';

    if (!playerAttemptedDamage && !opponentAttemptedDamage) {
      console.log(dim('⚡ Both fighters used positioning moves - no damage attempts'));
    }

    console.log('');
  }

  /**
   * Displays restrictions and bonuses for the next round in round results
   * @param {Object} myRoundData - Player's round data
   * @param {Object} opponentsRoundData - Opponent's round data
   */
  displayRestrictionsAndBonuses(myRoundData, opponentsRoundData) {
    // Show current status first
    console.log(bold(cyan('📊 CURRENT STATUS')));
    console.log(cyan('─────────────────'));

    // Show your own status (how your opponent sees you)
    console.log(bold(cyan('🤺 Your current status: ')) +
      bold(colorize(opponentsRoundData.result.name, colors.bgCyan + colors.bright)));

    // Show how you see your opponent
    console.log(bold(yellow('👀 You see your opponent: ')) +
      bold(colorize(myRoundData.result.name, colors.bgYellow + colors.bright)));
    console.log('');

    console.log(bold(red('🚫 NEXT ROUND EFFECTS')));
    console.log(red('──────────────────────'));

    // Show player's restrictions for next turn
    const playerRestrictions = this.cli.gameDisplay.formatAllRestrictions(opponentsRoundData.result || {});
    if (playerRestrictions.length > 0) {
      const restrictionText = playerRestrictions.join(', ');
      console.log(red('▶ Your restrictions: ') + bold(red(restrictionText)));
    } else {
      console.log(dim('▶ Your restrictions: None'));
    }

    // Show opponent's restrictions for next turn
    const opponentRestrictions = this.cli.gameDisplay.formatAllRestrictions(myRoundData.result || {});
    if (opponentRestrictions.length > 0) {
      const restrictionText = opponentRestrictions.join(', ');
      console.log(magenta('▶ Opponent restrictions: ') + bold(magenta(restrictionText)));
    } else {
      console.log(dim('▶ Opponent restrictions: None'));
    }

    // Show bonuses for next turn
    const myBonusSummary = this.cli.gameDisplay.getBonusSummary(myRoundData.nextRoundBonus);
    const opponentBonusSummary = this.cli.gameDisplay.getBonusSummary(opponentsRoundData.nextRoundBonus);

    if (myBonusSummary) {
      const bonusText = Object.entries(myBonusSummary)
        .map(([key, value]) => `${key} (+${value})`)
        .join(', ');
      console.log(green('▶ Your bonuses: ') + bold(green(bonusText)));
    } else {
      console.log(dim('▶ Your bonuses: None'));
    }

    if (opponentBonusSummary) {
      const bonusText = Object.entries(opponentBonusSummary)
        .map(([key, value]) => `${key} (+${value})`)
        .join(', ');
      console.log(yellow('▶ Opponent bonuses: ') + bold(yellow(bonusText)));
    } else {
      console.log(dim('▶ Opponent bonuses: None'));
    }
    console.log('');
  }

  /**
   * Checks if the game should continue and displays next round information
   */
  checkForNextRound() {
    if (this.cli.game && this.cli.game.myCharacter.health > 0 && this.cli.game.opponentsCharacter.health > 0) {
      if (this.cli.game.roundNumber === 1) {
        console.log(dim('⚙️  Round 0 was automated setup using initial moves...'));
        console.log(dim('⚙️  Round 1 will be interactive - waiting for setup to complete...'));
        console.log('');
      }
    }
  }

  /**
   * Handles the player's move event - displays move processing information
   * @param {Event} event - My move event with move ID
   */
  handleMyMove(event) {
    const moveId = event.detail.id;
    const move = this.cli.game.myCharacter.moves.find(move => move.id == moveId);
    if (move) {
      console.log(cyan('🎯 Processing:'), bold(`${move.name} (${move.tag})`));
    }
  }

  /**
   * Handles the opponent's move event - no action needed as round results follow
   * @param {Event} event - Opponent's move event
   */
  handleOpponentsMove(_event) {
    // Opponent move received - round results will be shown immediately after
  }

  /**
   * Handles the victory event - displays victory message and ends the game
   * @param {Event} event - Victory event
   */
  async handleVictory(_event) {
    // Show final round results if available
    if (this.cli.lastRoundData && this.cli.lastOpponentsRoundData) {
      await this.displayFinalRoundResults(this.cli.lastRoundData, this.cli.lastOpponentsRoundData, 'victory');
    }

    console.log('');
    console.log('');
    console.log(createBox('🎉 VICTORY! 🎉',
      green('Congratulations, warrior!\n') +
      `You have defeated ${this.cli.game.opponentsCharacter.name}!\n` +
      bold('Your skill with the blade is legendary!')
    ));
    console.log('');
    this.cli.endGame();
  }

  /**
   * Handles the defeat event - displays defeat message and ends the game
   * @param {Event} event - Defeat event
   */
  async handleDefeat(_event) {
    // Show final round results if available
    if (this.cli.lastRoundData && this.cli.lastOpponentsRoundData) {
      await this.displayFinalRoundResults(this.cli.lastRoundData, this.cli.lastOpponentsRoundData, 'defeat');
    }

    console.log('');
    console.log('');
    console.log(createBox('💀 DEFEAT 💀',
      red('The battle is lost...\n') +
      `You have been defeated by ${this.cli.game.opponentsCharacter.name}.\n` +
      dim('Train harder and return stronger!')
    ));
    console.log('');
    this.cli.endGame();
  }

  /**
   * Displays final round results for victory/defeat scenarios
   * @param {Object} myRoundData - Player's round data
   * @param {Object} opponentsRoundData - Opponent's round data
   * @param {string} outcome - 'victory' or 'defeat'
   */
  async displayFinalRoundResults(myRoundData, opponentsRoundData, outcome) {
    // Add visual separator
    console.log('');
    console.log(bold(cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
    console.log('');
    const roundNumber = this.cli.game.roundNumber;
    console.log(bold(magenta(`⚔️  FINAL ROUND ${roundNumber} RESULTS ⚔️`)));
    console.log(magenta('═══════════════════════════════'));

    // Show detailed combat results
    await this.displayCombatDetails(myRoundData, opponentsRoundData);

    // Show final battle status
    console.log(this.cli.gameDisplay.buildGameStateContent(this.cli.game, this.cli.playerName));
    console.log('');

    // Show outcome message
    if (outcome === 'victory') {
      console.log(bold(green('🎯 Battle concluded - Victory achieved!')));
    } else {
      console.log(bold(red('💀 Battle concluded - Defeat...')));
    }
    console.log('');
  }

  /**
   * Creates a delay for pacing information display
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after the delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

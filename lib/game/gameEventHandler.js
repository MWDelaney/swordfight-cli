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
    this.lastProcessedMoveId = null; // Track last processed move to prevent duplicates
  }

  /**
   * Sets up all game event listeners for the CLI interface
   * Binds handler methods to their respective game events
   */
  setupEventListeners() {
    // Add debug logging for all events to see what's being fired
    document.addEventListener('start', (e) => {
      console.log(dim(`🔧 [DEBUG] 'start' event fired`));
      this.handleStart(e);
    });
    document.addEventListener('setup', (e) => {
      console.log(dim(`🔧 [DEBUG] 'setup' event fired`));
      this.handleSetup(e);
    });
    document.addEventListener('round', (e) => {
      console.log(dim(`🔧 [DEBUG] 'round' event fired`));
      this.handleRound(e);
    });
    document.addEventListener('myMove', (e) => {
      console.log(dim(`🔧 [DEBUG] 'myMove' event fired`));
      this.handleMyMove(e);
    });
    document.addEventListener('opponentsMove', (e) => {
      console.log(dim(`🔧 [DEBUG] 'opponentsMove' event fired`));
      this.handleOpponentsMove(e);
    });
    document.addEventListener('victory', (e) => {
      console.log(dim(`🔧 [DEBUG] 'victory' event fired`));
      this.handleVictory(e);
    });
    document.addEventListener('defeat', (e) => {
      console.log(dim(`🔧 [DEBUG] 'defeat' event fired`));
      this.handleDefeat(e);
    });
    
    // Also listen for inputMove to track when moves are submitted
    document.addEventListener('inputMove', (e) => {
      console.log(dim(`🔧 [DEBUG] 'inputMove' event fired with moveId: ${e.detail?.move}`));
    });
    
    // Note: webcomponent.js does NOT listen for 'move', 'name' or 'opponentCharacter' events
  }

  /**
   * Handles the game start event - initializes battle and triggers setup
   * @param {Event} event - Game start event
   */
  handleStart(_event) {
    console.log(cyan('🚀 Connection established! Initializing battle...'));

    // Handle multiplayer connection status if in multiplayer mode
    if (this.cli.multiplayerHandler?.isMultiplayerMode()) {
      const game = _event.detail?.game || this.cli.game;

      if (game && game.opponentsCharacter) {
        if (game.opponentsCharacter.isComputer) {
          console.log('');
          console.log(yellow('🤖 Engine fell back to computer opponent'));
          console.log(dim('WebRTC connection could not be established'));
          console.log(dim('This may be due to network configuration or firewall restrictions'));
          this.cli.multiplayerHandler.peerConnected = false;
        } else {
          console.log('');
          console.log(green('🎉 WebRTC connection established successfully!'));
          console.log(green('✅ Real opponent connected! Starting battle...'));
          console.log(dim('Moves will be exchanged via peer-to-peer WebRTC'));
          this.cli.multiplayerHandler.peerConnected = true;
          this.cli.multiplayerHandler.setupMoveTimeout(); // Only set timeout for real multiplayer
        }
      }
    }
    
    console.log('');
    this.cli.gameStarted = true;
    
    // Call setUp immediately like the web frontend does
    // The game engine will handle opponent info internally
    try {
      console.log(dim(`🔧 [DEBUG] Calling game.setUp() on game instance`));
      this.cli.game.setUp();
      console.log(dim(`🔧 [DEBUG] game.setUp() completed successfully`));
    } catch (error) {
      console.error(red('❌ Error in game.setUp():'), error);
    }
  }

  /**
   * Handles the game setup event - manages initial setup and round 1 transition  
   * @param {Event} event - Game setup event
   */
  handleSetup(_event) {
    // Debug: Track setup calls
    console.log(dim(`🔧 [DEBUG] handleSetup called at round ${this.cli.game?.roundNumber || 'unknown'}`));
    
    // Prevent multiple setup calls after initial setup
    if (this.cli.initialSetupComplete) {
      console.log(dim(`🔧 [DEBUG] Ignoring duplicate setup call - already completed`));
      return;
    }
    
    // Match webcomponent's setup handling with delay
    console.log(dim('⚙️  Game setup completed - ready for battle...'));
    console.log('');
    this.cli.initialSetupComplete = true;
    
    // After a delay, like the webcomponent does, show the view (prompt for moves)
    setTimeout(() => {
      this.cli.promptForMovesDisplay().catch(error => {
        console.error('Error prompting for moves:', error);
      });
    }, 500);
  }

  /**
   * Handles the round completion event - displays round results and prepares for next round
   * @param {Event} event - Round event with round data for both players
   */
  async handleRound(event) {
    const { myRoundData, opponentsRoundData } = event.detail;

    // Debug: Log that round event was received
    console.log(dim(`🔄 [DEBUG] handleRound called for round ${this.cli.game.roundNumber}`));
    
    // Reset move tracking for new round
    this.lastProcessedMoveId = null;
    
    this.cli.lastRoundData = myRoundData;
    this.cli.lastOpponentsRoundData = opponentsRoundData;

    // Display round results
    await this.displayRoundResults(myRoundData, opponentsRoundData);
    
    // After showing round results, check if game continues and prompt for next move
    if (this.cli.game && this.cli.game.myCharacter.health > 0 && this.cli.game.opponentsCharacter.health > 0) {
      // Game continues - prompt for next move
      this.cli.promptForMovesDisplay().catch(error => {
        console.error('Error prompting for moves after round:', error);
      });
    }
    // If game ended (someone died), victory/defeat events will handle it
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
    } else {
      // Show battle status for initial setup
      console.log(this.cli.gameDisplay.buildGameStateContent(this.cli.game, this.cli.playerName));
      console.log('');
      console.log(dim('⚙️  Initial setup completed - both fighters have taken their starting positions.'));
      console.log(bold(blue(`🎯 Round ${this.cli.game.roundNumber} begins!`)));
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
    
    // Debug: Log all myMove events
    console.log(dim(`🔧 [DEBUG] handleMyMove called with moveId: ${moveId}, lastProcessed: ${this.lastProcessedMoveId}`));
    
    // Prevent duplicate processing of the same move
    if (this.lastProcessedMoveId === moveId) {
      console.log(dim(`[DUPLICATE] Ignoring duplicate myMove event for move ${moveId}`));
      return;
    }
    
    this.lastProcessedMoveId = moveId;
    const move = this.cli.game.myCharacter.moves.find(move => move.id == moveId);
    if (move) {
      console.log(cyan('🎯 Processing:'), bold(`${move.name} (${move.tag})`));
      
      // In multiplayer, show waiting message and set up timeout
      const isMultiplayer = this.cli.multiplayerHandler && this.cli.multiplayerHandler.isMultiplayerMode();
      if (isMultiplayer) {
        console.log(dim('⏳ Waiting for opponent\'s move...'));
        
        // Set up move timeout for real peer connections
        if (this.cli.multiplayerHandler.isPeerConnected()) {
          this.cli.multiplayerHandler.setupMoveTimeout();
          
          // Add a longer timeout to detect WebRTC communication failures
          setTimeout(() => {
            // Check if we're still waiting for opponent's move after 30 seconds
            if (this.lastProcessedMoveId === moveId && !this.cli.lastRoundData) {
              console.log('');
              console.log(yellow('⚠️  WebRTC Communication Issue Detected'));
              console.log(red('🚫 No response from opponent after 30 seconds'));
              console.log(dim('This usually indicates WebRTC relay server issues'));
              console.log('');
              console.log(dim('💡 Possible solutions:'));
              console.log(dim('   • Check your internet connection'));
              console.log(dim('   • Try again later (relay servers may be down)'));
              console.log(dim('   • Contact support if the issue persists'));
              console.log('');
            }
          }, 30000);
        }
      }
    }
  }

  /**
   * Handles the opponent's move event - shows opponent move received message
   * @param {Event} event - Opponent's move event
   */
  handleOpponentsMove(_event) {
    // Debug: Log opponent move events
    console.log(dim(`🔧 [DEBUG] handleOpponentsMove called`));
    
    // Clear multiplayer move timeout if it exists
    if (this.cli.multiplayerHandler && this.cli.multiplayerHandler.moveTimeout) {
      clearTimeout(this.cli.multiplayerHandler.moveTimeout);
      this.cli.multiplayerHandler.moveTimeout = null;
    }
    
    // Show that opponent's move was received - like webcomponent does
    console.log(yellow('📨 Opponent move received!'));
    console.log('');
    
    // DO NOT prompt for moves here - let the round event handle that
    // The webcomponent doesn't prompt for moves in handleOpponentsMove either
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

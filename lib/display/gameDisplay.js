/**
 * Game state display utilities
 */

import { createBox } from '../utils/boxDrawing.js';
import { bold, green, red, yellow, dim, cyan, magenta, colors, colorize } from '../utils/colors.js';

export class GameDisplay {
  /**
   * Creates a new GameDisplay instance
   * Initializes terminal dimensions for display calculations
   */
  constructor() {
    this.terminalHeight = process.stdout.rows || 24;
    this.terminalWidth = process.stdout.columns || 80;
  }

  /**
   * Builds the game state content box showing player and opponent status
   * @param {Object} game - Current game instance
   * @param {string} playerName - Name of the player
   * @returns {string} Formatted box content with health bars and equipment status
   */
  buildGameStateContent(game, playerName) {
    if (!game) return '';

    const myHealthBar = this.createHealthBar(
      game.myCharacter.health,
      game.myCharacter.startingHealth
    );
    const opponentHealthBar = this.createHealthBar(
      game.opponentsCharacter.health,
      game.opponentsCharacter.startingHealth
    );

    const statusContent =
      `${bold('👤 ' + playerName)}\n` +
      `   Health: ${myHealthBar} ${game.myCharacter.health}/${game.myCharacter.startingHealth} HP\n` +
      `   Weapon: ${game.myCharacter.weapon ? green('⚔️  Armed') : red('❌ Disarmed')}\n` +
      `   Shield: ${game.myCharacter.shield ? green('🛡️  Ready') : red('❌ Lost')}\n` +
      `\n` +
      `${bold('🤖 ' + game.opponentsCharacter.name)}\n` +
      `   Health: ${opponentHealthBar} ${game.opponentsCharacter.health}/${game.opponentsCharacter.startingHealth} HP\n` +
      `   Weapon: ${game.opponentsCharacter.weapon ? green('⚔️  Armed') : red('❌ Disarmed')}\n` +
      `   Shield: ${game.opponentsCharacter.shield ? green('🛡️  Ready') : red('❌ Lost')}`;

    return createBox('⚔️  BATTLE STATUS', statusContent);
  }

  /**
   * Creates a visual health bar using block characters
   * @param {number} current - Current health value
   * @param {number} max - Maximum health value
   * @param {number} length - Length of the health bar in characters (default: 20)
   * @returns {string} Colored health bar string with filled and empty segments
   */
  createHealthBar(current, max, length = 20) {
    const percentage = Math.max(0, current / max);
    const filled = Math.round(percentage * length);
    const empty = Math.max(0, length - filled);

    let color = green;
    if (percentage <= 0.3) color = red;
    else if (percentage <= 0.6) color = yellow;

    return color('█'.repeat(filled)) + dim('░'.repeat(empty));
  }

  /**
   * Builds tactical information content showing combat status and modifiers
   * @param {Object} lastRoundData - Player's data from the previous round
   * @param {Object} lastOpponentsRoundData - Opponent's data from the previous round
   * @param {number} gameRoundNumber - Current round number
   * @returns {string} Formatted tactical information or empty string if no data available
   */
  buildTacticalInfoContent(lastRoundData, lastOpponentsRoundData, gameRoundNumber) {
    if (!lastRoundData || !lastOpponentsRoundData || gameRoundNumber === 0) {
      return '';
    }

    let tacticalInfo = '';

    // Create a prominent tactical information box
    tacticalInfo += bold(cyan('📊 TACTICAL INFORMATION')) + '\n';
    tacticalInfo += cyan('══════════════════════════') + '\n\n';

    // Show current range prominently
    const rangeColor = lastRoundData.result.range === 'close' ? red :
      lastRoundData.result.range === 'medium' ? yellow : cyan;
    tacticalInfo += bold('🎯 Combat Range: ') + rangeColor(bold(lastRoundData.result.range.toUpperCase())) + '\n\n';

    // Show your own status first (how your opponent sees you) - PROMINENT
    tacticalInfo += bold(cyan('🤺 Your current status: ')) +
      bold(colorize(lastOpponentsRoundData.result.name, colors.bgCyan + colors.bright)) + '\n';

    // Show how you see your opponent - PROMINENT
    tacticalInfo += bold(yellow('👀 You see your opponent: ')) +
      bold(colorize(lastRoundData.result.name, colors.bgYellow + colors.bright)) + '\n\n';

    // Show restrictions more prominently
    tacticalInfo += bold(red('🚫 RESTRICTIONS & BONUSES')) + '\n';
    tacticalInfo += red('─────────────────────────') + '\n';

    // Show player's restrictions for this turn
    const playerRestrictions = this.formatAllRestrictions(lastOpponentsRoundData.result || {});
    if (playerRestrictions.length > 0) {
      const restrictionText = playerRestrictions.join(', ');
      tacticalInfo += red('▶ Your restrictions this turn: ') + bold(red(restrictionText)) + '\n';
    } else {
      tacticalInfo += dim('▶ Your restrictions this turn: None') + '\n';
    }

    // Show opponent's restrictions for this turn
    const opponentRestrictions = this.formatAllRestrictions(lastRoundData.result || {});
    if (opponentRestrictions.length > 0) {
      const restrictionText = opponentRestrictions.join(', ');
      tacticalInfo += magenta('▶ Opponent restrictions this turn: ') + bold(magenta(restrictionText)) + '\n';
    } else {
      tacticalInfo += dim('▶ Opponent restrictions this turn: None') + '\n';
    }

    // Show bonuses for this turn
    const myBonusSummary = this.getBonusSummary(lastRoundData.nextRoundBonus);
    const opponentBonusSummary = this.getBonusSummary(lastOpponentsRoundData.nextRoundBonus);

    if (myBonusSummary) {
      const bonusText = Object.entries(myBonusSummary)
        .map(([key, value]) => `${key} (+${value})`)
        .join(', ');
      tacticalInfo += green('▶ Your bonuses this turn: ') + bold(green(bonusText)) + '\n';
    } else {
      tacticalInfo += dim('▶ Your bonuses this turn: None') + '\n';
    }

    if (opponentBonusSummary) {
      const bonusText = Object.entries(opponentBonusSummary)
        .map(([key, value]) => `${key} (+${value})`)
        .join(', ');
      tacticalInfo += yellow('▶ Opponent bonuses this turn: ') + bold(yellow(bonusText)) + '\n';
    } else {
      tacticalInfo += dim('▶ Opponent bonuses this turn: None') + '\n';
    }

    return tacticalInfo + '\n';
  }

  /**
   * Formats restriction information for display
   * @param {Array} restrictions - Array of restriction strings
   * @param {string} label - Label to display for the restrictions
   * @param {Function} colorFn - Color function to apply (default: red)
   * @returns {string} Formatted restriction line with color and label
   */
  formatRestrictions(restrictions, label, colorFn = red) {
    if (restrictions && restrictions.length > 0) {
      const restrictionText = restrictions.length === 1
        ? restrictions[0]
        : restrictions.join(', ');
      return colorFn(`🚫 ${label}: `) + bold(colorFn(restrictionText)) + '\n';
    } else {
      return dim(`🚫 ${label}: None`) + '\n';
    }
  }

  /**
   * Formats bonus information for display
   * @param {Array} nextRoundBonus - Array of bonus objects
   * @param {string} label - Label to display for the bonuses
   * @param {Function} colorFn - Color function to apply
   * @returns {string} Formatted bonus line with color and label
   */
  formatBonuses(nextRoundBonus, label, colorFn) {
    const bonusSummary = this.getBonusSummary(nextRoundBonus);
    if (bonusSummary) {
      const bonusText = Object.entries(bonusSummary)
        .map(([key, value]) => `${key} (+${value})`)
        .join(', ');
      return colorFn(`⚡ ${label}: `) + bold(colorFn(bonusText)) + '\n';
    } else {
      return dim(`⚡ ${label}: None`) + '\n';
    }
  }

  /**
   * Creates a summary of bonuses from next round bonus data
   * @param {Array} nextRoundBonus - Array of bonus objects from game data
   * @returns {Object|null} Object with bonus types as keys and amounts as values, or null if no bonuses
   */
  getBonusSummary(nextRoundBonus) {
    if (!nextRoundBonus || !Array.isArray(nextRoundBonus) || nextRoundBonus.length === 0) {
      return null;
    }

    const bonuses = {};
    nextRoundBonus.forEach(bonusObj => {
      for (const key in bonusObj) {
        const amount = parseInt(bonusObj[key]) || 0;
        if (amount !== 0) {
          bonuses[key] = (bonuses[key] || 0) + amount;
        }
      }
    });

    return Object.keys(bonuses).length > 0 ? bonuses : null;
  }

  /**
   * Formats restrictions including both restrict and allowOnly types
   * @param {Object} result - Round result object that may contain restrict and/or allowOnly
   * @returns {Array} Array of restriction strings
   */
  formatAllRestrictions(result) {
    const restrictions = [];

    // Add regular restrictions
    if (result.restrict && Array.isArray(result.restrict) && result.restrict.length > 0) {
      restrictions.push(...result.restrict);
    }

    // Add allowOnly restrictions
    if (result.allowOnly && Array.isArray(result.allowOnly) && result.allowOnly.length > 0) {
      result.allowOnly.forEach(allowOnly => {
        restrictions.push(`Only ${allowOnly}`);
      });
    }

    return restrictions;
  }

  // Screen buffer management
  /**
   * Enters alternate screen buffer mode for full-screen interfaces
   * Clears the screen and positions cursor at top-left
   */
  enterAlternateScreen() {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?1049h'); // Enable alternate screen buffer
      process.stdout.write('\x1b[2J\x1b[H'); // Clear screen and move cursor to top-left
    }
  }

  /**
   * Exits alternate screen buffer mode and returns to normal terminal
   */
  exitAlternateScreen() {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?1049l'); // Disable alternate screen buffer
    }
  }

  /**
   * Clears the terminal screen
   * Uses ANSI escape codes if TTY is available, otherwise uses console.clear()
   */
  clearScreen() {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[2J\x1b[H');
    } else {
      console.clear();
    }
  }
}

/**
 * Move selection interface
 */

import { createBox } from '../utils/boxDrawing.js';
import { bold, green, red, yellow, cyan, blue, dim } from '../utils/colors.js';
import { CustomEvent as _CustomEvent } from '../utils/domEnvironment.js';

export class MoveSelector {
  /**
   * Creates a new MoveSelector instance
   * @param {GameDisplay} gameDisplay - The game display instance for rendering utilities
   */
  constructor(gameDisplay) {
    this.gameDisplay = gameDisplay;
  }

  /**
   * Builds the content for the move selection box with categorized moves
   * @param {Array} availableMoves - Array of all available moves
   * @param {Object} categorizedMoves - Moves organized by tag/category
   * @param {Array} tagOrder - Ordered array of category tags
   * @param {number} selectedIndex - Index of currently selected move
   * @param {Object|null} lastRoundData - Data from the previous round for bonus calculations
   * @returns {string} Formatted box content with moves and selection highlighting
   */
  buildMoveBoxContent(availableMoves, categorizedMoves, tagOrder, selectedIndex, lastRoundData) {
    let movesContent = '';
    let currentMoveIndex = 0;

    tagOrder.forEach((tag, tagIndex) => {
      const moves = categorizedMoves[tag];
      const tagColor = tag.includes('Extended') ? cyan :
        tag.includes('Shield') ? blue :
          tag.includes('Jump') ? yellow : green;

      // Add category header
      movesContent += `${bold(tagColor(tag.toUpperCase()))}\n`;
      movesContent += tagColor('─'.repeat(tag.length)) + '\n';

      moves.forEach((move, index) => {
        const isSelected = currentMoveIndex === selectedIndex;
        const rangeColor = move.range === 'close' ? red : move.range === 'medium' ? yellow : cyan;

        // Highlight selected move
        const moveNumber = currentMoveIndex + 1;
        const numberDisplay = isSelected ?
          bold(green(`${moveNumber}.`)) :
          cyan(bold(`${moveNumber}.`));

        const nameDisplay = isSelected ?
          bold(green(`${move.name}`)) :
          bold(move.name);

        const prefix = isSelected ? green('→ ') : '  ';

        movesContent += `${prefix}${numberDisplay} ${nameDisplay}\n`;

        const rangeDisplay = isSelected ?
          `    Range: ${bold(green(move.range))}` :
          `    Range: ${rangeColor(move.range)}`;

        movesContent += `${rangeDisplay}\n`;

        // Format modifier
        if (move.mod !== undefined && move.mod !== null) {
          const modValue = String(move.mod);
          const formattedMod = modValue.startsWith('+') || modValue.startsWith('-') ? modValue :
            modValue === '0' ? '±0' : `+${modValue}`;

          const modColor = modValue.startsWith('-') ? red :
            modValue === '0' ? dim : green;

          const modifierDisplay = isSelected ?
            `    Modifier: ${bold(green(formattedMod))}` :
            `    Modifier: ${modColor(formattedMod)}`;

          movesContent += `${modifierDisplay}\n`;
        }

        // Display bonus information if available
        if (lastRoundData && lastRoundData.nextRoundBonus) {
          const bonusAmount = this.getMoveBonus(move, lastRoundData.nextRoundBonus);
          if (bonusAmount > 0) {
            const bonusDisplay = isSelected ?
              `    Bonus: ${bold(green(`+${bonusAmount}`))}` :
              `    Bonus: ${green(`+${bonusAmount}`)}`;
            movesContent += `${bonusDisplay}\n`;
          }
        }

        if (index < moves.length - 1) {
          movesContent += '\n';
        }

        currentMoveIndex++;
      });

      // Add spacing between categories
      if (tagIndex < tagOrder.length - 1) {
        movesContent += '\n\n';
      }
    });

    return createBox('⚔️  AVAILABLE COMBAT MOVES', movesContent);
  }

  /**
   * Calculates bonus damage for a move based on next round bonuses
   * @param {Object} move - The move object to check for bonuses
   * @param {Array} nextRoundBonus - Array of bonus objects from previous round
   * @returns {number} Total bonus amount for this move
   */
  getMoveBonus(move, nextRoundBonus) {
    let bonusAmount = 0;

    if (!nextRoundBonus || !Array.isArray(nextRoundBonus) || nextRoundBonus.length === 0) {
      return bonusAmount;
    }

    nextRoundBonus.forEach(bonusObj => {
      for (const key in bonusObj) {
        if (move.type === key || move.tag === key) {
          bonusAmount += parseInt(bonusObj[key]) || 0;
        }
      }
    });

    return bonusAmount;
  }

  /**
   * Organizes moves into categories and creates an ordered array for display
   * @param {Array} availableMoves - Array of all available moves
   * @returns {Object} Object containing categorizedMoves, tagOrder, and orderedMoves
   */
  categorizeMoves(availableMoves) {
    const categorizedMoves = {};
    const orderedMoves = [];

    availableMoves.forEach((move) => {
      if (!categorizedMoves[move.tag]) {
        categorizedMoves[move.tag] = [];
      }
      categorizedMoves[move.tag].push(move);
    });

    const tagOrder = Object.keys(categorizedMoves).sort();

    // Build ordered moves array and assign display indices
    tagOrder.forEach(tag => {
      categorizedMoves[tag].forEach(move => {
        move.displayIndex = orderedMoves.length + 1;
        orderedMoves.push(move);
      });
    });

    return { categorizedMoves, tagOrder, orderedMoves };
  }

  /**
   * Main entry point for move selection - handles both interactive and non-interactive modes
   * @param {Array} availableMoves - Array of all available moves
   * @param {Object} game - Current game instance
   * @param {Object|null} lastRoundData - Data from the previous round
   * @param {Object|null} lastOpponentsRoundData - Opponent's data from the previous round
   * @returns {Promise<Object>} Promise that resolves to the selected move object
   */
  async selectMove(availableMoves, game, lastRoundData, lastOpponentsRoundData) {
    const { categorizedMoves, tagOrder, orderedMoves } = this.categorizeMoves(availableMoves);

    // Check if we can use raw mode (TTY environment)
    if (!process.stdin.setRawMode) {
      // Fallback for non-TTY environments
      console.log(this.buildMoveBoxContent(orderedMoves, categorizedMoves, tagOrder, -1, lastRoundData));
      console.log(dim('Non-interactive mode: auto-selecting first move...'));
      const selectedMove = orderedMoves[0];
      console.log(green(`✓ Selected: ${selectedMove.name} (${selectedMove.tag})`));
      return selectedMove;
    }

    return this.interactiveSelection(orderedMoves, categorizedMoves, tagOrder, game, lastRoundData, lastOpponentsRoundData);
  }

  /**
   * Handles interactive move selection with keyboard navigation
   * @param {Array} orderedMoves - Ordered array of moves for selection
   * @param {Object} categorizedMoves - Moves organized by category
   * @param {Array} tagOrder - Ordered array of category tags
   * @param {Object} game - Current game instance
   * @param {Object|null} lastRoundData - Data from the previous round
   * @param {Object|null} lastOpponentsRoundData - Opponent's data from the previous round
   * @returns {Promise<Object>} Promise that resolves to the selected move object
   */
  async interactiveSelection(orderedMoves, categorizedMoves, tagOrder, game, lastRoundData, lastOpponentsRoundData) {
    let selectedIndex = 0;
    let scrollOffset = 0;
    const maxIndex = orderedMoves.length - 1;

    // Display initial interface
    scrollOffset = this.displayMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, true, scrollOffset);

    // Set up input handling
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    return new Promise((resolve) => {
      const onKeyPress = (buffer) => {
        const key = buffer.toString();

        // Handle numeric selection (1-9, 0 for 10) - immediate selection
        if (key >= '1' && key <= '9') {
          const inputIndex = parseInt(key) - 1;
          if (inputIndex < orderedMoves.length) {
            selectedIndex = inputIndex;
            scrollOffset = this.redrawMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, scrollOffset);

            // Immediately select the move when number is pressed
            setTimeout(() => {
              process.stdin.removeListener('data', onKeyPress);
              process.stdin.setRawMode(false);
              process.stdin.pause();

              this.gameDisplay.exitAlternateScreen();

              const selectedMove = orderedMoves[selectedIndex];
              console.log(green(`✓ Selected: ${selectedMove.name} (${selectedMove.tag})`));
              console.log('');

              resolve(selectedMove);
            }, 200); // Small delay to show the selection update
          }
          return;
        } else if (key === '0' && orderedMoves.length >= 10) {
          selectedIndex = 9;
          scrollOffset = this.redrawMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, scrollOffset);

          // Immediately select the move when 0 is pressed
          setTimeout(() => {
            process.stdin.removeListener('data', onKeyPress);
            process.stdin.setRawMode(false);
            process.stdin.pause();

            this.gameDisplay.exitAlternateScreen();

            const selectedMove = orderedMoves[selectedIndex];
            console.log(green(`✓ Selected: ${selectedMove.name} (${selectedMove.tag})`));
            console.log('');

            resolve(selectedMove);
          }, 200); // Small delay to show the selection update
          return;
        }

        // Handle Enter for selection
        if (key === '\r' || key === '\n') {
          process.stdin.removeListener('data', onKeyPress);
          process.stdin.setRawMode(false);
          process.stdin.pause();

          this.gameDisplay.exitAlternateScreen();

          const selectedMove = orderedMoves[selectedIndex];
          console.log(green(`✓ Selected: ${selectedMove.name} (${selectedMove.tag})`));
          console.log('');

          resolve(selectedMove);
          return;
        }

        // Handle navigation keys
        switch (key) {
          case '\u001B[A': // Up arrow
            if (selectedIndex > 0) {
              selectedIndex--;
              scrollOffset = this.redrawMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, scrollOffset);
            }
            break;

          case '\u001B[B': // Down arrow
            if (selectedIndex < maxIndex) {
              selectedIndex++;
              scrollOffset = this.redrawMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, scrollOffset);
            }
            break;

          case '\u001B[5~': // Page Up
            const pageSize = Math.max(1, this.gameDisplay.terminalHeight - 10);
            scrollOffset = Math.max(0, scrollOffset - pageSize);
            scrollOffset = this.redrawMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, scrollOffset);
            break;

          case '\u001B[6~': // Page Down
            const pageSize2 = Math.max(1, this.gameDisplay.terminalHeight - 10);
            scrollOffset = scrollOffset + pageSize2;
            scrollOffset = this.redrawMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, scrollOffset);
            break;

          case '\u0003': // Ctrl+C
            process.stdin.removeListener('data', onKeyPress);
            process.stdin.setRawMode(false);
            this.gameDisplay.exitAlternateScreen();
            process.exit(0);
            break;
        }
      };

      process.stdin.on('data', onKeyPress);
    });
  }

  /**
   * Displays the move selection interface with game state, tactical info, and moves
   * @param {Array} orderedMoves - Ordered array of moves
   * @param {Object} categorizedMoves - Moves organized by category
   * @param {Array} tagOrder - Ordered array of category tags
   * @param {number} selectedIndex - Index of currently selected move
   * @param {Object} game - Current game instance
   * @param {Object|null} lastRoundData - Data from the previous round
   * @param {Object|null} lastOpponentsRoundData - Opponent's data from the previous round
   * @param {boolean} showRoundContext - Whether to show round results context
   * @param {number} scrollOffset - Current scroll position
   * @returns {number} Updated scroll offset
   */
  displayMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, showRoundContext = false, scrollOffset = 0) {
    const terminalHeight = this.gameDisplay.terminalHeight;
    let lines = [];

    // Round context header removed - tactical info is shown directly

    // Add game state and tactical info
    lines = lines.concat(this.gameDisplay.buildGameStateContent(game, game.playerName || 'Player').split('\n'));
    lines.push('');

    const tacticalInfo = this.gameDisplay.buildTacticalInfoContent(lastRoundData, lastOpponentsRoundData, game.roundNumber);
    if (tacticalInfo) {
      lines = lines.concat(tacticalInfo.split('\n'));
    }

    // Add move box
    const moveBoxLines = this.buildMoveBoxContent(orderedMoves, categorizedMoves, tagOrder, selectedIndex, lastRoundData).split('\n');
    lines = lines.concat(moveBoxLines);
    lines.push('');

    // Add instructions
    lines.push(bold(cyan('🎯 Use ↑/↓ arrows to navigate, Enter to select, Page Up/Down to scroll, or type a number to choose')));

    // Handle scrolling
    const viewportHeight = terminalHeight - 2;
    const maxScrollOffset = Math.max(0, lines.length - viewportHeight);
    const currentScrollOffset = Math.max(0, Math.min(scrollOffset, maxScrollOffset));

    // Auto-scroll to keep selected item visible
    if (!showRoundContext) {
      const selectedMoveLineIndex = lines.findIndex(line => line.includes('→') && line.includes(orderedMoves[selectedIndex].name));
      if (selectedMoveLineIndex >= 0) {
        const idealScrollOffset = Math.max(0, selectedMoveLineIndex - Math.floor(viewportHeight / 2));
        const adjustedScrollOffset = Math.max(0, Math.min(idealScrollOffset, maxScrollOffset));
        return this.renderScrollableContent(lines, adjustedScrollOffset, viewportHeight, true);
      }
    }

    return this.renderScrollableContent(lines, currentScrollOffset, viewportHeight, true);
  }

  /**
   * Renders scrollable content to the terminal with alternate screen buffer
   * @param {Array} lines - Array of lines to display
   * @param {number} scrollOffset - Current scroll position
   * @param {number} viewportHeight - Height of the viewport
   * @param {boolean} enterAlternateMode - Whether to enter alternate screen mode (first display only)
   * @returns {number} The scroll offset used for rendering
   */
  renderScrollableContent(lines, scrollOffset, viewportHeight, enterAlternateMode = false) {
    if (enterAlternateMode) {
      this.gameDisplay.enterAlternateScreen();
    } else {
      // Clear screen and move to top for redraw
      if (process.stdout.isTTY) {
        process.stdout.write('\x1b[2J\x1b[H');
      }
    }

    const visibleLines = lines.slice(scrollOffset, scrollOffset + viewportHeight);
    const output = visibleLines.join('\n');

    if (process.stdout.isTTY) {
      process.stdout.write(output);
    } else {
      console.log(output);
    }

    return scrollOffset;
  }

  /**
   * Redraws the move interface without showing round context
   * @param {Array} orderedMoves - Ordered array of moves
   * @param {Object} categorizedMoves - Moves organized by category
   * @param {Array} tagOrder - Ordered array of category tags
   * @param {number} selectedIndex - Index of currently selected move
   * @param {Object} game - Current game instance
   * @param {Object|null} lastRoundData - Data from the previous round
   * @param {Object|null} lastOpponentsRoundData - Opponent's data from the previous round
   * @param {number} scrollOffset - Current scroll position
   * @returns {number} Updated scroll offset
   */
  redrawMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, scrollOffset = 0) {
    return this.displayMoveInterface(orderedMoves, categorizedMoves, tagOrder, selectedIndex, game, lastRoundData, lastOpponentsRoundData, false, scrollOffset);
  }
}

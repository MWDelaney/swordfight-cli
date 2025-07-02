/**
 * Mode Selector - Interactive mode selection for CLI
 *
 * This class provides an interactive interface for selecting game modes
 * with keyboard navigation similar to the character and move selectors.
 */

import { bold, cyan, dim, green } from '../utils/colors.js';
import { createBox } from '../utils/boxDrawing.js';

export class ModeSelector {
  constructor(gameDisplay) {
    this.gameDisplay = gameDisplay;
  }

  /**
   * Displays an interactive mode selection interface
   * @returns {Promise<string>} Promise that resolves to the selected mode ('single', 'multiplayer', 'join')
   */
  async selectMode() {
    const modes = [
      {
        id: 'single',
        name: 'Single Player',
        description: 'Fight against a computer opponent',
        emoji: '🤖'
      },
      {
        id: 'multiplayer',
        name: 'Create Multiplayer Room',
        description: 'Create a room and invite a friend to join',
        emoji: '🌐'
      },
      {
        id: 'join',
        name: 'Join Multiplayer Room',
        description: 'Join an existing multiplayer room',
        emoji: '🚪'
      }
    ];

    // Check if we can use raw mode (TTY environment)
    if (!process.stdin.setRawMode) {
      // Fallback for non-TTY environments
      console.log(this.buildModeContent(modes, -1));
      console.log(dim('Non-interactive mode: auto-selecting single player...'));
      const selectedMode = modes[0];
      console.log(green(`✓ Selected: ${selectedMode.name}`));
      return selectedMode.id;
    }

    return this.interactiveSelection(modes);
  }

  /**
   * Handles interactive mode selection with keyboard navigation
   * @param {Array} modes - Array of available mode objects
   * @returns {Promise<string>} Promise that resolves to the selected mode id
   */
  async interactiveSelection(modes) {
    let selectedIndex = 0;
    const maxIndex = modes.length - 1;

    // Enter alternate screen
    this.gameDisplay.enterAlternateScreen();

    // Display initial interface
    this.displayModeInterface(modes, selectedIndex);

    // Set up input handling
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    return new Promise((resolve) => {
      const onKeyPress = (buffer) => {
        const key = buffer.toString();

        // Handle numeric selection (1-3) - immediate selection
        if (key >= '1' && key <= '3') {
          const inputIndex = parseInt(key) - 1;
          if (inputIndex < modes.length) {
            selectedIndex = inputIndex;

            // Update display to show selection
            this.displayModeInterface(modes, selectedIndex);

            // Immediately select the mode when number is pressed
            setTimeout(() => {
              process.stdin.removeListener('data', onKeyPress);
              process.stdin.setRawMode(false);
              process.stdin.pause();

              this.gameDisplay.exitAlternateScreen();

              const selectedMode = modes[selectedIndex];
              console.log(green(`✓ Selected: ${selectedMode.name}`));
              resolve(selectedMode.id);
            }, 200); // Small delay to show the selection update
          }
          return;
        }

        // Handle Enter for selection
        if (key === '\r' || key === '\n') {
          process.stdin.removeListener('data', onKeyPress);
          process.stdin.setRawMode(false);
          process.stdin.pause();

          this.gameDisplay.exitAlternateScreen();

          const selectedMode = modes[selectedIndex];
          console.log(green(`✓ Selected: ${selectedMode.name}`));
          resolve(selectedMode.id);
          return;
        }

        // Handle arrow keys for navigation
        if (key === '\u001b[A') { // Up arrow
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : maxIndex;
          this.displayModeInterface(modes, selectedIndex);
        } else if (key === '\u001b[B') { // Down arrow
          selectedIndex = selectedIndex < maxIndex ? selectedIndex + 1 : 0;
          this.displayModeInterface(modes, selectedIndex);
        }

        // Handle Escape and Ctrl+C for exit
        if (key === '\u001b' || key === '\u0003') {
          process.stdin.removeListener('data', onKeyPress);
          process.stdin.setRawMode(false);
          process.stdin.pause();

          this.gameDisplay.exitAlternateScreen();
          process.exit(0);
        }
      };

      process.stdin.on('data', onKeyPress);
    });
  }

  /**
   * Displays the mode selection interface
   */
  displayModeInterface(modes, selectedIndex) {
    // Clear screen and move to top
    process.stdout.write('\u001b[2J\u001b[0;0H');

    // Display header
    console.log('');
    console.log(bold(cyan('🗡️  ⚔️  SWORDFIGHT CLI  ⚔️  🛡️')));
    console.log(bold(cyan('═══════════════════════════════════')));
    console.log('');
    console.log(this.buildModeContent(modes, selectedIndex));
    console.log('');
    console.log(dim('Use ↑/↓ arrows or numbers 1-3 to select, Enter to confirm, Esc to quit'));
  }

  /**
   * Builds the mode selection content
   */
  buildModeContent(modes, selectedIndex) {
    const lines = [];

    lines.push(createBox('CHOOSE BATTLE MODE', ''));
    lines.push('');

    modes.forEach((mode, index) => {
      const isSelected = index === selectedIndex;
      const number = (index + 1).toString();

      if (isSelected) {
        lines.push(bold(cyan(`${number}. ${mode.emoji} ${mode.name} ◄ SELECTED`)));
        lines.push(bold(cyan(`   ${mode.description}`)));
      } else {
        lines.push(`${number}. ${mode.emoji} ${mode.name}`);
        lines.push(dim(`   ${mode.description}`));
      }

      if (index < modes.length - 1) {
        lines.push('');
      }
    });

    return lines.join('\n');
  }
}

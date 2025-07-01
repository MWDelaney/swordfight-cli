/**
 * Character selection interface
 */

import { createBox } from '../utils/boxDrawing.js';
import { bold, green, cyan, dim } from '../utils/colors.js';

export class CharacterSelector {
  /**
   * Creates a new CharacterSelector instance
   * @param {GameDisplay} gameDisplay - The game display instance for rendering utilities
   */
  constructor(gameDisplay) {
    this.gameDisplay = gameDisplay;
  }

  /**
   * Builds the content for the character selection box
   * @param {Array} characters - Array of available character objects
   * @param {number} selectedIndex - Index of currently selected character
   * @returns {string} Formatted box content with characters and selection highlighting
   */
  buildCharacterBoxContent(characters, selectedIndex) {
    let charactersContent = '';

    characters.forEach((char, index) => {
      const isSelected = index === selectedIndex;
      const prefix = isSelected ? green('→ ') : '  ';
      const numberDisplay = isSelected ?
        bold(green(`${index + 1}.`)) :
        cyan(bold(`${index + 1}.`));
      const nameDisplay = isSelected ?
        bold(green(char.name)) :
        bold(char.name);

      charactersContent += `${prefix}${numberDisplay} ${nameDisplay}\n`;

      const description = isSelected ?
        `    ${green(char.description)}` :
        `    ${dim(char.description)}`;

      charactersContent += `${description}\n`;

      if (index < characters.length - 1) {
        charactersContent += '\n';
      }
    });

    return createBox('⚔️  CHOOSE YOUR FIGHTER', charactersContent);
  }

  /**
   * Main entry point for character selection - handles both interactive and non-interactive modes
   * @param {Array} characters - Array of available character objects
   * @returns {Promise<Object>} Promise that resolves to the selected character object
   */
  async selectCharacter(characters) {
    // Check if we can use raw mode (TTY environment)
    if (!process.stdin.setRawMode) {
      // Fallback for non-TTY environments
      console.log(this.buildCharacterBoxContent(characters, -1));
      console.log(dim('Non-interactive mode: auto-selecting first character...'));
      const selectedCharacter = characters[0];
      console.log(green(`✓ Selected: ${selectedCharacter.name}`));
      return selectedCharacter;
    }

    return this.interactiveSelection(characters);
  }

  /**
   * Handles interactive character selection with keyboard navigation
   * @param {Array} characters - Array of available character objects
   * @returns {Promise<Object>} Promise that resolves to the selected character object
   */
  async interactiveSelection(characters) {
    let selectedIndex = 0;
    const maxIndex = characters.length - 1;

    // Display initial box
    this.displayCharacterInterface(characters, selectedIndex);

    // Set up input handling
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    return new Promise((resolve) => {
      let _numberInput = '';

      const onKeyPress = (key) => {
        // Handle direct number input - immediate selection
        if (key >= '1' && key <= '9') {
          const inputIndex = parseInt(key) - 1;
          if (inputIndex < characters.length) {
            selectedIndex = inputIndex;
            this.redrawCharacterInterface(characters, selectedIndex);

            // Immediately select the character when number is pressed
            setTimeout(() => {
              process.stdin.removeListener('data', onKeyPress);
              process.stdin.setRawMode(false);
              process.stdin.pause();

              this.gameDisplay.exitAlternateScreen();

              const selectedCharacter = characters[selectedIndex];
              console.log(green(`✓ Selected: ${selectedCharacter.name}`));
              resolve(selectedCharacter);
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

          const selectedCharacter = characters[selectedIndex];
          console.log(green(`✓ Selected: ${selectedCharacter.name}`));
          resolve(selectedCharacter);
          return;
        }

        // Handle navigation keys
        switch (key) {
          case '\u001B[A': // Up arrow
            if (selectedIndex > 0) {
              selectedIndex--;
              this.redrawCharacterInterface(characters, selectedIndex);
            }
            break;

          case '\u001B[B': // Down arrow
            if (selectedIndex < maxIndex) {
              selectedIndex++;
              this.redrawCharacterInterface(characters, selectedIndex);
            }
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
   * Displays the character selection interface using alternate screen buffer
   * @param {Array} characters - Array of available character objects
   * @param {number} selectedIndex - Index of currently selected character
   */
  displayCharacterInterface(characters, selectedIndex) {
    this.gameDisplay.enterAlternateScreen();

    let output = this.buildCharacterBoxContent(characters, selectedIndex) + '\n\n';
    output += bold(cyan('🎯 Use ↑/↓ arrows to navigate, Enter to select, or type a number to choose:'));

    if (process.stdout.isTTY) {
      process.stdout.write(output);
    } else {
      console.log(output);
    }
  }

  /**
   * Redraws the character selection interface with updated selection
   * @param {Array} characters - Array of available character objects
   * @param {number} selectedIndex - Index of currently selected character
   */
  redrawCharacterInterface(characters, selectedIndex) {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[2J\x1b[H'); // Clear and move to top
    }

    let output = this.buildCharacterBoxContent(characters, selectedIndex) + '\n\n';
    output += bold(cyan('🎯 Use ↑/↓ arrows to navigate, Enter to select, or type a number to choose:'));

    if (process.stdout.isTTY) {
      process.stdout.write(output);
    } else {
      console.log(output);
    }
  }
}

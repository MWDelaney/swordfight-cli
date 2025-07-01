/**
 * Terminal input handling utilities
 */

import readline from 'readline';

export class TerminalInput {
  /**
   * Creates a new TerminalInput instance with readline interface
   */
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Prompts the user with a question and waits for input
   * @param {string} prompt - The prompt text to display
   * @returns {Promise<string>} Promise that resolves with the user's input
   */
  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  // Handle raw mode input with arrow keys and special keys
  /**
   * Gets a single raw input character from the terminal
   * Enables raw mode for capturing special keys like arrows
   * @returns {Promise<string|null>} Promise that resolves with the key pressed, or null if not TTY
   */
  async getRawInput() {
    if (!process.stdin.setRawMode) {
      return null; // Non-TTY environment
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    return new Promise((resolve) => {
      const onKeyPress = (buffer) => {
        process.stdin.removeListener('data', onKeyPress);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve(buffer.toString());
      };

      process.stdin.on('data', onKeyPress);
    });
  }

  // Wait for Enter key press
  /**
   * Waits for the user to press Enter key
   * Handles Ctrl+C for graceful exit
   * @returns {Promise<void>} Promise that resolves when Enter is pressed
   */
  async waitForEnter() {
    if (!process.stdin.setRawMode) {
      return; // Non-TTY fallback
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    return new Promise((resolve) => {
      const onKeyPress = (key) => {
        process.stdin.removeListener('data', onKeyPress);
        process.stdin.setRawMode(false);
        process.stdin.pause();

        if (key === '\u0003') { // Ctrl+C
          process.exit(0);
        }

        resolve();
      };

      process.stdin.on('data', onKeyPress);
    });
  }

  /**
   * Closes the readline interface and cleans up resources
   */
  close() {
    this.rl.close();
  }
}

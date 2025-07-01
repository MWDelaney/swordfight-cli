/**
 * Color utilities for terminal output
 */

/**
 * ANSI color codes for terminal styling
 */
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m'
};

// Helper functions for colored output
/**
 * Applies a color to text and resets formatting afterwards
 * @param {string} text - The text to colorize
 * @param {string} color - The ANSI color code to apply
 * @returns {string} Colorized text with reset code appended
 */
export const colorize = (text, color) => `${color}${text}${colors.reset}`;

/**
 * Makes text bold/bright
 * @param {string} text - The text to make bold
 * @returns {string} Bold text with reset code
 */
export const bold = (text) => colorize(text, colors.bright);

/**
 * Colors text green
 * @param {string} text - The text to color
 * @returns {string} Green text with reset code
 */
export const green = (text) => colorize(text, colors.green);

/**
 * Colors text red
 * @param {string} text - The text to color
 * @returns {string} Red text with reset code
 */
export const red = (text) => colorize(text, colors.red);

/**
 * Colors text yellow
 * @param {string} text - The text to color
 * @returns {string} Yellow text with reset code
 */
export const yellow = (text) => colorize(text, colors.yellow);

/**
 * Colors text blue
 * @param {string} text - The text to color
 * @returns {string} Blue text with reset code
 */
export const blue = (text) => colorize(text, colors.blue);

/**
 * Colors text cyan
 * @param {string} text - The text to color
 * @returns {string} Cyan text with reset code
 */
export const cyan = (text) => colorize(text, colors.cyan);

/**
 * Colors text magenta
 * @param {string} text - The text to color
 * @returns {string} Magenta text with reset code
 */
export const magenta = (text) => colorize(text, colors.magenta);

/**
 * Makes text dim/faded
 * @param {string} text - The text to dim
 * @returns {string} Dimmed text with reset code
 */
export const dim = (text) => colorize(text, colors.dim);

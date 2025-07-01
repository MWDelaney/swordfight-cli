/**
 * Box drawing utilities for creating terminal UI elements
 */

import stringWidth from 'string-width';
import { bold } from './colors.js';

// Box drawing characters for better visual separation
export const box = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  cross: '┼',
  teeDown: '┬',
  teeUp: '┴',
  teeRight: '├',
  teeLeft: '┤'
};

// Helper function to calculate display width (accounting for emojis and ANSI codes)
/**
 * Calculates the display width of a string, accounting for emojis and ANSI escape codes
 * @param {string} str - The string to measure
 * @returns {number} The visual width of the string when displayed in a terminal
 */
export const getDisplayWidth = (str) => {
  // Remove ANSI escape codes first
  const withoutAnsi = str.replace(/\x1b\[[0-9;]*m/g, '');
  // Use string-width library for accurate emoji width calculation
  return stringWidth(withoutAnsi);
};

// Helper function to create a box around text
/**
 * Creates a decorative box around text content with a title
 * @param {string} title - The title to display at the top of the box
 * @param {string} content - The content to display inside the box
 * @param {number} width - Minimum width of the box (default: 50)
 * @returns {string} Formatted box with title and content using Unicode box drawing characters
 */
export const createBox = (title, content, width = 50) => {
  const lines = content.trim() ? content.split('\n') : [];
  const maxLineLength = Math.max(...lines.map(line => getDisplayWidth(line)), getDisplayWidth(title));
  const boxWidth = Math.max(width, maxLineLength + 4);

  let result = '';
  result += box.topLeft + box.horizontal.repeat(boxWidth - 2) + box.topRight + '\n';

  // Calculate title padding accounting for display width (including emojis but not ANSI codes)
  const titlePadding = boxWidth - 2 - getDisplayWidth(title);
  result += box.vertical + ' ' + bold(title) + ' '.repeat(Math.max(0, titlePadding - 1)) + box.vertical + '\n';

  // Only add separator and content area if there's actual content
  if (lines.length > 0 && content.trim()) {
    result += box.teeRight + box.horizontal.repeat(boxWidth - 2) + box.teeLeft + '\n';

    lines.forEach(line => {
      const lineDisplayWidth = getDisplayWidth(line);
      const padding = boxWidth - 2 - lineDisplayWidth;
      result += box.vertical + ' ' + line + ' '.repeat(Math.max(0, padding - 1)) + box.vertical + '\n';
    });
  }

  result += box.bottomLeft + box.horizontal.repeat(boxWidth - 2) + box.bottomRight;
  return result;
};

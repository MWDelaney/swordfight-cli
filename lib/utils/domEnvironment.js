/**
 * DOM-like environment setup for Node.js to run the game engine
 */

import { EventEmitter } from 'events';
import { webcrypto } from 'crypto';

// Create CustomEvent class for Node.js compatibility
/**
 * CustomEvent implementation for Node.js environment
 * Provides browser-like CustomEvent functionality for the game engine
 */
export class CustomEvent {
  /**
   * Creates a new CustomEvent
   * @param {string} type - The event type
   * @param {Object} options - Event options
   * @param {*} options.detail - Custom data to attach to the event
   * @param {boolean} options.bubbles - Whether the event bubbles
   * @param {boolean} options.cancelable - Whether the event can be canceled
   */
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
  }
}

// Create EventTarget-like class using EventEmitter for Node.js compatibility
/**
 * EventTarget implementation for Node.js using EventEmitter
 * Provides browser-like event handling for the game engine
 */
export class DocumentEventTarget extends EventEmitter {
  /**
   * Adds an event listener (maps to EventEmitter.on)
   * @param {string} type - The event type to listen for
   * @param {Function} listener - The event handler function
   */
  addEventListener(type, listener) {
    this.on(type, listener);
  }

  /**
   * Removes an event listener (maps to EventEmitter.off)
   * @param {string} type - The event type to remove listener from
   * @param {Function} listener - The event handler function to remove
   */
  removeEventListener(type, listener) {
    this.off(type, listener);
  }

  /**
   * Dispatches an event (maps to EventEmitter.emit)
   * @param {CustomEvent} event - The event object to dispatch
   */
  dispatchEvent(event) {
    this.emit(event.type, event);
  }
}

// Setup DOM-like environment for the game engine
/**
 * Sets up a DOM-like environment in Node.js for the game engine
 * Creates global objects that the game engine expects from a browser environment
 */
export const setupDOMEnvironment = () => {
  global.document = new DocumentEventTarget();
  global.window = { logging: false };
  global.localStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; }
  };
  global.CustomEvent = CustomEvent;
  
  // Setup crypto for Node.js environment
  if (typeof global.crypto === 'undefined') {
    try {
      global.crypto = webcrypto;
    } catch {
      console.warn('Warning: crypto API not available');
    }
  }
};

// Automatically setup the environment when this module is imported
setupDOMEnvironment();

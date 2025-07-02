/**
 * DOM-like environment setup for Node.js to run the game engine
 */

import { EventEmitter } from 'events';
import { webcrypto } from 'crypto';

// Import WebRTC polyfill for trystero multiplayer support
let _webrtcPolyfill = null;
try {
  const nodeDataChannel = await import('node-datachannel/polyfill');
  _webrtcPolyfill = nodeDataChannel;
  console.log('🔧 WebRTC polyfill loaded for multiplayer support');
} catch {
  console.warn('⚠️  WebRTC polyfill not available - multiplayer will fall back to computer opponent');
}

// Import WebSocket polyfill for trystero multiplayer support
let _websocketPolyfill = null;
try {
  const WebSocket = await import('ws');
  _websocketPolyfill = WebSocket.default;
  console.log('🔧 WebSocket polyfill loaded for multiplayer support');
} catch {
  console.warn('⚠️  WebSocket polyfill not available - multiplayer may not work');
}

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

  // Add global addEventListener and removeEventListener for trystero
  global.addEventListener = (type, listener) => {
    global.document.addEventListener(type, listener);
  };
  global.removeEventListener = (type, listener) => {
    global.document.removeEventListener(type, listener);
  };
  global.dispatchEvent = (event) => {
    global.document.dispatchEvent(event);
  };

  // Setup WebRTC polyfill for multiplayer support
  if (_webrtcPolyfill && _webrtcPolyfill.RTCPeerConnection) {
    global.RTCPeerConnection = _webrtcPolyfill.RTCPeerConnection;
    global.RTCDataChannel = _webrtcPolyfill.RTCDataChannel;
    global.RTCIceCandidate = _webrtcPolyfill.RTCIceCandidate;
    global.RTCSessionDescription = _webrtcPolyfill.RTCSessionDescription;

    // Store the polyfill for the engine to use
    global._nodeWebRTCPolyfill = _webrtcPolyfill.RTCPeerConnection;

    // Setup navigator object for WebRTC
    global.navigator = global.navigator || {};
    global.navigator.userAgent = global.navigator.userAgent || 'Node.js SwordFight CLI';

    console.log('✓ WebRTC APIs polyfilled for Node.js environment');
  }

  // Setup WebSocket polyfill for multiplayer support
  if (_websocketPolyfill) {
    global.WebSocket = _websocketPolyfill;
    console.log('✓ WebSocket API polyfilled for Node.js environment');
  }

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

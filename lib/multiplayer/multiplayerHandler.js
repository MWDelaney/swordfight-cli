/**
 * Multiplayer Handler - Event-driven CLI interface for swordfight-engine multiplayer
 *
 * This module provides a CLI-friendly interface that mirrors the web component's
 * event-driven approach. It creates Game instances and listens for custom events
 * emitted by the engine, just like the web component does.
 */

import { bold, cyan, dim, green, red, yellow } from '../utils/colors.js';
import Game from 'swordfight-engine';

export class MultiplayerHandler {
  constructor(cliFrontend) {
    this.cli = cliFrontend;
    this.isMultiplayer = false;
    this.roomId = null;
    this.moveTimeout = null;
    this.peerConnected = false;
    this.relayFailureCount = 0;

    // Set up event listeners for engine events (like the web component does)
    this.setupEngineEventListeners();
    
    // Monitor for WebRTC relay failures
    this.setupRelayFailureMonitoring();
  }

  /**
   * Sets up event listeners for engine events (mirrors web component approach)
   * The engine will fire custom events that we need to handle for CLI display
   * Note: Only listen for events that the main game handler doesn't handle
   */
  setupEngineEventListeners() {
    // Listen for room full events (only multiplayer handler needs this)
    document.addEventListener('roomFull', this.handleRoomFull.bind(this));

    // Listen for opponent name and character events (only multiplayer handler needs this)
    document.addEventListener('name', this.handleOpponentName.bind(this));
    document.addEventListener('opponentCharacter', this.handleOpponentCharacter.bind(this));

    // DON'T listen for 'start', 'move', 'opponentsMove' - let main game handler handle these
    // We'll integrate multiplayer logic into the main handlers instead
  }

  /**
   * Handles the engine 'start' event - determines if real multiplayer or computer fallback
   */
  handleEngineStart(_event) {
    const game = _event.detail?.game || this.cli.game;

    if (game && game.opponentsCharacter) {
      if (game.opponentsCharacter.isComputer) {
        console.log('');
        console.log(yellow('🤖 Engine fell back to computer opponent'));
        console.log(dim('WebRTC connection could not be established'));
        console.log(dim('This may be due to network configuration or firewall restrictions'));
        this.peerConnected = false;
      } else {
        console.log('');
        console.log(green('🎉 WebRTC connection established successfully!'));
        console.log(green('✅ Real opponent connected! Starting battle...'));
        console.log(dim('Moves will be exchanged via peer-to-peer WebRTC'));
        this.peerConnected = true;
        this.setupMoveTimeout(); // Only set timeout for real multiplayer
      }
    }

    console.log('');
  }

  /**
   * Handles room full events from the engine
   */
  handleRoomFull(_event) {
    console.log('');
    console.log(red('❌ Room is full! This game has already started.'));
    console.log(dim('Try creating a new room or joining a different one.'));
    this.cleanup();
  }

  /**
   * Handles opponent name events from the engine
   */
  handleOpponentName(event) {
    if (event.detail?.name && this.peerConnected) {
      console.log(green(`👤 Opponent: ${event.detail.name}`));
    }
  }

  /**
   * Handles opponent character events from the engine
   */
  handleOpponentCharacter(event) {
    if (event.detail?.characterSlug && this.peerConnected) {
      console.log(green(`⚔️ Opponent character: ${event.detail.characterSlug}`));
    }
  }

  /**
   * Handles move confirmation events - start waiting for opponent
   */
  handleMoveConfirmed(_event) {
    if (this.peerConnected) {
      console.log(yellow('⏳ Waiting for opponent\'s move...'));
      this.setupMoveTimeout(); // Reset timeout for each move
    }
  }

  /**
   * Handles opponent move events - clear timeout
   */
  handleOpponentMove(_event) {
    // Debug: Log opponent move in multiplayer handler
    console.log(dim(`🔧 [DEBUG] multiplayerHandler.handleOpponentMove called`));
    
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }

    if (this.peerConnected) {
      console.log(green('📨 Opponent move received!'));
    }
  }

  /**
   * Creates a new multiplayer game room
   * @param {string} _playerName - The host player's name (stored in localStorage)
   * @param {string} _characterSlug - The host's selected character (stored in localStorage)
   * @returns {string} The room ID for others to join
   */
  async createRoom(_playerName, _characterSlug) {
    // Generate a unique room ID (similar to web component)
    this.roomId = Math.random().toString(36).slice(-5).toUpperCase();
    this.isMultiplayer = true;

    console.log(cyan('🌐 Creating multiplayer room...'));
    console.log(dim(`Room ID: ${bold(this.roomId)}`));

    try {
      console.log(green('✓ Room created successfully!'));
      console.log(yellow('📋 Share this room ID with your opponent:'), bold(cyan(this.roomId)));
      console.log('');
      console.log(green('📱 Your opponent can join using:'));
      console.log(dim(`   ${bold('swordfight --join ' + this.roomId)}`));
      console.log('');
      console.log(dim('💡 Both players need to be online for WebRTC to connect'));
      console.log(dim('   Keep this session running while your opponent joins'));

      // Initialize game and start WebRTC connection process
      this.initializeGameForPeerWaiting();

      return this.roomId;
    } catch (error) {
      console.error(red('❌ Failed to create room:'), error.message);
      throw error;
    }
  }

  /**
   * Joins an existing multiplayer game room
   * @param {string} roomId - The room ID to join
   * @param {string} _playerName - The joining player's name (stored in localStorage)
   * @param {string} _characterSlug - The joining player's selected character (stored in localStorage)
   */
  async joinRoom(roomId, _playerName, _characterSlug) {
    this.roomId = roomId.toUpperCase();
    this.isMultiplayer = true;

    console.log(cyan('🌐 Joining multiplayer room...'));
    console.log(dim(`Room ID: ${bold(this.roomId)}`));

    try {
      console.log(green('✓ Room configuration set!'));
      console.log(yellow('🔄 Attempting to connect to host player...'));
      console.log(dim('WebRTC peer discovery may take a moment'));
      console.log('');

      // Initialize game and attempt to join the room via WebRTC
      this.initializeGameForPeerWaiting();

    } catch (error) {
      console.error(red('❌ Failed to set room configuration:'), error.message);
      throw error;
    }
  }

  /**
   * Initializes the game instance and waits for peer connections
   * Trystero should work in Node.js - give it time to establish WebRTC connections
   */
  initializeGameForPeerWaiting() {
    console.log(bold(cyan('🌐 Initializing multiplayer connection...')));

    const gameOptions = {
      myCharacterSlug: localStorage.getItem('myCharacterSlug') || 'human-fighter'
      // Removed rtcPolyfill - let the engine handle WebRTC natively like webcomponent
    };

    console.log(green('✓ Configuring WebRTC connection...'));
    console.log(yellow('⏳ Attempting to establish peer connection...'));
    console.log(dim('This may take up to 30 seconds for initial handshake'));

    // Create game instance with room ID - trystero should handle WebRTC in Node.js
    // Give the engine time to establish connections before falling back
    this.cli.game = new Game(this.roomId, gameOptions);

    console.log(green('✓ Game instance created!'));
    console.log(yellow('🔄 Waiting for peer discovery and connection...'));
    console.log(dim('Keep this window open and share the room ID'));
    console.log('');

    // Set up a reasonable timeout for peer connections (5 minutes)
    this.setupPeerConnectionTimeout();

    // The engine will fire the 'start' event when a peer connects
    // Trust that trystero will work in Node.js environment
  }

  /**
   * Sets up a timeout for peer connections (5 minutes)
   * Give trystero ample time to establish WebRTC connections
   */
  setupPeerConnectionTimeout() {
    const connectionTimeoutMs = 5 * 60 * 1000; // 5 minutes

    setTimeout(() => {
      if (!this.peerConnected && this.cli.game) {
        console.log('');
        console.log(yellow('⏰ No peer connected within 5 minutes'));
        console.log(yellow('🔄 WebRTC connection may still be attempting in background'));
        console.log(dim('Engine will continue trying or eventually fall back to computer'));
        console.log('');
      }
    }, connectionTimeoutMs);
  }

  /**
   * Sets up a timeout for opponent moves (10 minutes)
   * This only applies when waiting for real peer moves, not computer moves
   */
  setupMoveTimeout() {
    const timeoutMs = 10 * 60 * 1000; // 10 minutes

    // Clear any existing timeout
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
    }

    this.moveTimeout = setTimeout(() => {
      if (this.peerConnected && this.cli.game) {
        console.log('');
        console.log(yellow('⏰ Opponent took too long to move (10 minutes)'));
        console.log(red('🚫 Multiplayer game timed out'));
        console.log(dim('You can start a new game or continue against computer'));

        this.cleanup();
      }
    }, timeoutMs);
  }

  /**
   * Checks if multiplayer mode is active
   */
  isMultiplayerMode() {
    return this.isMultiplayer;
  }

  /**
   * Checks if a real peer is connected (not computer)
   */
  isPeerConnected() {
    return this.peerConnected;
  }

  /**
   * Gets connection status info
   */
  getConnectionInfo() {
    return {
      isMultiplayer: this.isMultiplayer,
      roomId: this.roomId,
      peerConnected: this.peerConnected
    };
  }

  /**
   * Cleanup multiplayer resources
   */
  cleanup() {
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }

    this.isMultiplayer = false;
    this.roomId = null;
    this.peerConnected = false;
  }

  /**
   * Graceful disconnect
   */
  disconnect() {
    if (this.isMultiplayer) {
      console.log(yellow('📡 Disconnecting from multiplayer...'));
    }
    this.cleanup();
  }

  /**
   * Sets up monitoring for WebRTC relay failures
   * Intercepts console messages to detect Trystero relay issues
   */
  setupRelayFailureMonitoring() {
    // Override console.log to catch Trystero relay failure messages
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      
      // Check for Trystero relay failure messages
      if (message.includes('Trystero: relay failure')) {
        this.relayFailureCount++;
        
        // After multiple relay failures, warn the user
        if (this.relayFailureCount >= 3 && this.isMultiplayer) {
          setTimeout(() => {
            console.log('');
            console.log(yellow('⚠️  Multiple WebRTC relay failures detected'));
            console.log(red('🌐 Multiplayer connectivity may be compromised'));
            console.log(dim('WebRTC relay servers appear to be experiencing issues'));
            console.log('');
            console.log(dim('💡 This may cause:'));
            console.log(dim('   • Delays in move synchronization'));
            console.log(dim('   • Players getting stuck waiting for moves'));
            console.log(dim('   • Connection timeouts'));
            console.log('');
          }, 100);
        }
      }
      
      // Call original console.log
      originalConsoleLog.apply(console, args);
    };
  }
}

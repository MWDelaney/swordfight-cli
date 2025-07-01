#!/usr/bin/env node

/**
 * Simple test runner for swordfight-cli
 * Tests basic functionality without requiring a full test framework
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    console.log(`🧪 Testing: ${name}`);
    fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ FAIL: ${name} - ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runCLITest(description, inputs = [], timeout = 5000) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/swordfight.js'], { stdio: 'pipe' });
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Send inputs after a delay
    if (inputs.length > 0) {
      setTimeout(() => {
        inputs.forEach((input, index) => {
          setTimeout(() => {
            child.stdin.write(input + '\n');
          }, index * 500);
        });
      }, 1000);
    }

    // Kill after timeout
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ output, errorOutput, timedOut: true });
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ output, errorOutput, code, timedOut: false });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function playCompleteGame() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/swordfight.js'], { stdio: 'pipe' });
    let output = '';
    let errorOutput = '';
    let roundCount = 0;
    let gameComplete = false;

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;

      // Handle player name input
      if (chunk.includes('Enter your warrior name:')) {
        setTimeout(() => {
          child.stdin.write('TestBot\n');
        }, 100);
      }

      // Handle character selection
      if (chunk.includes('CHOOSE YOUR FIGHTER') && !output.includes('Character selected:')) {
        setTimeout(() => {
          // Select random character (1, 2, or 3)
          const randomChar = Math.floor(Math.random() * 3) + 1;
          child.stdin.write(randomChar.toString() + '\n');
        }, 100);
      }

      // Handle move selection
      if (chunk.includes('Press Enter to see available moves') ||
          chunk.includes('Press Enter to select your next move')) {
        setTimeout(() => {
          child.stdin.write('\n'); // Press Enter to see moves

          // After showing moves, select a random one
          setTimeout(() => {
            const randomMove = Math.floor(Math.random() * 7) + 1; // Assuming 1-7 moves typically
            child.stdin.write(randomMove.toString() + '\n');
          }, 200);
        }, 100);
      }

      // Count rounds
      if (chunk.includes('ROUND') && chunk.includes('RESULTS')) {
        roundCount++;
      }

      // Check for game completion
      if (chunk.includes('GAME OVER') ||
          chunk.includes('VICTORY') ||
          chunk.includes('DEFEAT') ||
          chunk.includes('has won') ||
          chunk.includes('You win') ||
          chunk.includes('You lose')) {
        gameComplete = true;
        setTimeout(() => {
          child.kill('SIGTERM');
        }, 500);
      }

      // Safety: Kill if too many rounds (prevent infinite games)
      if (roundCount > 20) {
        child.kill('SIGTERM');
      }
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Overall timeout
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ output, errorOutput, timedOut: true, roundCount, gameComplete });
    }, 30000); // 30 second timeout

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ output, errorOutput, code, timedOut: false, roundCount, gameComplete });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function runTests() {
  console.log('🚀 Running swordfight-cli tests...\n');

  // File existence tests
  test('package.json exists and is valid', () => {
    assert(fs.existsSync('package.json'), 'package.json should exist');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    assert(pkg.name === 'swordfight-cli', 'package name should be swordfight-cli');
    assert(pkg.bin, 'package should have bin field');
  });

  test('source files exist', () => {
    assert(fs.existsSync('bin/swordfight.js'), 'bin/swordfight.js should exist');
    assert(fs.existsSync('lib'), 'lib directory should exist');
    assert(fs.existsSync('README.md'), 'README.md should exist');
  });

  test('built files exist after build', () => {
    assert(fs.existsSync('dist/swordfight.js'), 'dist/swordfight.js should exist after build');
    const builtFile = fs.readFileSync('dist/swordfight.js', 'utf8');
    assert(builtFile.startsWith('#!/usr/bin/env node'), 'built file should have shebang');
  });

  test('built file is executable', () => {
    const stats = fs.statSync('dist/swordfight.js');
    assert(stats.mode & parseInt('100', 8), 'built file should be executable');
  });

  // CLI execution tests
  test('CLI starts successfully', async () => {
    const result = await runCLITest('CLI startup test', [], 3000);
    assert(result.output.includes('SWORDFIGHT CLI'), 'CLI should display title');
    assert(result.output.includes('Welcome to the command-line sword fighting arena'), 'CLI should display welcome message');
  });

  test('CLI handles character selection', async () => {
    const result = await runCLITest('Character selection test', ['Test Player', ''], 4000);
    assert(result.output.includes('Enter your warrior name'), 'CLI should prompt for player name');
    assert(result.output.includes('CHOOSE YOUR FIGHTER'), 'CLI should show character selection');
  });

  test('Complete game can be played to finish', async () => {
    console.log('   ⏳ Playing full game with random inputs (this may take 10-30 seconds)...');
    const result = await playCompleteGame();

    assert(!result.timedOut || result.gameComplete, 'Game should complete or reach end state within timeout');
    assert(result.output.includes('SWORDFIGHT CLI'), 'Game should start properly');
    assert(result.output.includes('Character selected:'), 'Character should be selected');
    assert(result.output.includes('BATTLE BEGINS'), 'Battle should begin');
    assert(result.roundCount > 0, `Game should have at least 1 round (had ${result.roundCount})`);

    // Check for battle progress indicators
    const hasBattleStatus = result.output.includes('BATTLE STATUS') ||
                           result.output.includes('Health:') ||
                           result.output.includes('HP');
    assert(hasBattleStatus, 'Game should show battle status information');

    // Check for move selection
    const hasMoveSelection = result.output.includes('AVAILABLE COMBAT MOVES') ||
                            result.output.includes('available moves') ||
                            result.output.includes('select your next move');
    assert(hasMoveSelection, 'Game should show move selection interface');

    console.log(`   ✅ Game completed ${result.roundCount} rounds successfully`);

    // Log if game ended naturally vs timeout
    if (result.gameComplete) {
      console.log('   🎮 Game reached natural completion');
    } else if (result.timedOut) {
      console.log('   ⏰ Game reached timeout (acceptable for testing)');
    }
  });

  test('Multiple game runs work consistently', async () => {
    console.log('   ⏳ Testing game consistency with multiple runs...');

    for (let i = 1; i <= 3; i++) {
      console.log(`   🎲 Game run ${i}/3...`);
      const result = await runCLITest(`Multi-run test ${i}`, ['TestBot' + i, Math.floor(Math.random() * 3) + 1], 8000);

      assert(result.output.includes('SWORDFIGHT CLI'), `Run ${i}: Game should start properly`);
      assert(result.output.includes('Character selected:'), `Run ${i}: Character should be selected`);
      assert(result.output.includes('BATTLE BEGINS'), `Run ${i}: Battle should begin`);
    }

    console.log('   ✅ All game runs started consistently');
  });

  // Summary
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total: ${testsPassed + testsFailed}`);

  if (testsFailed > 0) {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});

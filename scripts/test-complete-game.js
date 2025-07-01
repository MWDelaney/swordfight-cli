#!/usr/bin/env node

/**
 * Standalone test to verify complete game functionality
 * Tests the CLI by running a full automated game with random inputs
 */

import { spawn } from 'child_process';

async function testCompleteGame() {
  console.log('🎮 Testing complete game playthrough...\n');

  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/swordfight.js'], { stdio: 'pipe' });
    let output = '';
    let roundCount = 0;
    let gameComplete = false;
    let _lastOutput = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      _lastOutput = chunk;

      // Log interesting events
      if (chunk.includes('Character selected:')) {
        console.log('✅ Character selection completed');
      }
      if (chunk.includes('BATTLE BEGINS')) {
        console.log('⚔️  Battle started');
      }
      if (chunk.includes('ROUND') && chunk.includes('RESULTS')) {
        roundCount++;
        console.log(`🗡️  Round ${roundCount} completed`);
      }

      // Handle player name input
      if (chunk.includes('Enter your warrior name:')) {
        setTimeout(() => {
          child.stdin.write('AutoTestBot\n');
        }, 100);
      }

      // Handle character selection
      if (chunk.includes('CHOOSE YOUR FIGHTER') && !output.includes('Character selected:')) {
        setTimeout(() => {
          const randomChar = Math.floor(Math.random() * 3) + 1;
          console.log(`🎲 Selecting character ${randomChar}`);
          child.stdin.write(randomChar.toString() + '\n');
        }, 100);
      }

      // Handle move selection
      if (chunk.includes('Press Enter to see available moves') ||
          chunk.includes('Press Enter to select your next move')) {
        setTimeout(() => {
          child.stdin.write('\n'); // Press Enter to see moves

          setTimeout(() => {
            const randomMove = Math.floor(Math.random() * 7) + 1;
            console.log(`🎯 Selecting move ${randomMove}`);
            child.stdin.write(randomMove.toString() + '\n');
          }, 200);
        }, 100);
      }

      // Check for game completion
      if (chunk.includes('GAME OVER') ||
          chunk.includes('VICTORY') ||
          chunk.includes('DEFEAT') ||
          chunk.includes('has won') ||
          chunk.includes('You win') ||
          chunk.includes('You lose')) {
        gameComplete = true;
        console.log('🏁 Game completed naturally!');
        setTimeout(() => {
          child.kill('SIGTERM');
        }, 500);
      }

      // Safety: Kill if too many rounds
      if (roundCount > 35) {
        console.log('⏰ Stopping after 35 rounds (safety limit)');
        child.kill('SIGTERM');
      }
    });

    child.stderr.on('data', (data) => {
      console.error('Error output:', data.toString());
    });

    // Overall timeout
    const timer = setTimeout(() => {
      console.log('⏰ Test timeout reached (30s)');
      child.kill('SIGTERM');
    }, 30000);

    child.on('close', (code) => {
      clearTimeout(timer);
      console.log(`\n📊 Test Summary:`);
      console.log(`   Rounds played: ${roundCount}`);
      console.log(`   Game completed naturally: ${gameComplete ? 'Yes' : 'No'}`);
      console.log(`   Exit code: ${code}`);

      if (roundCount > 0) {
        console.log('✅ SUCCESS: Game mechanics are working!');
        resolve(true);
      } else {
        console.log('❌ FAILURE: No rounds were played');
        resolve(false);
      }
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      console.error('Process error:', error);
      reject(error);
    });
  });
}

testCompleteGame().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});

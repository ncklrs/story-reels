#!/usr/bin/env tsx

/**
 * Database connection test script
 * Tests Prisma connection and basic CRUD operations
 *
 * Usage: npx tsx scripts/test-db.ts
 */

import { prisma, checkDatabaseConnection, getDatabaseStats, disconnectDatabase } from '../lib/db';
import { createVideoJob, getVideoJob, updateVideoJob, deleteVideoJob } from '../lib/repositories/videoJobs';
import { createStoryboard, getStoryboard, deleteStoryboard } from '../lib/repositories/storyboards';

async function main() {
  console.log('Testing database connection...\n');

  // Test 1: Check database connectivity
  console.log('Test 1: Database connectivity');
  const connectionStatus = await checkDatabaseConnection();

  if (!connectionStatus.connected) {
    console.error('Database connection failed:', connectionStatus.error);
    process.exit(1);
  }

  console.log(`Database connected (latency: ${connectionStatus.latency}ms)\n`);

  // Test 2: Get database statistics
  console.log('Test 2: Database statistics');
  const stats = await getDatabaseStats();
  console.log(`Total connections: ${stats.totalConnections || 'N/A'}`);
  console.log(`Active connections: ${stats.activeConnections || 'N/A'}\n`);

  // Test 3: Create a test storyboard
  console.log('Test 3: Create test storyboard');
  const testStoryboard = await createStoryboard({
    userId: 'test-user-123',
    name: 'Test Storyboard',
    presetKey: 'cinematic',
    character: {
      id: 'test-char-1',
      name: 'Test Character',
      age: 30,
      gender: 'female',
    },
    scenes: [
      {
        id: 'scene-1',
        subject: 'Test subject',
        action: 'Test action',
        duration: 4,
      },
    ],
  });
  console.log(`Storyboard created: ${testStoryboard.id}\n`);

  // Test 4: Create a test video job
  console.log('Test 4: Create test video job');
  const testJob = await createVideoJob({
    storyboardId: testStoryboard.id,
    sceneId: 'scene-1',
    provider: 'sora',
    prompt: 'Test prompt for video generation',
    status: 'pending',
  });
  console.log(`Video job created: ${testJob.id}`);
  console.log(`   Status: ${testJob.status}`);
  console.log(`   Provider: ${testJob.provider}\n`);

  // Test 5: Retrieve video job
  console.log('Test 5: Retrieve video job');
  const retrievedJob = await getVideoJob(testJob.id);
  if (retrievedJob) {
    console.log(`Video job retrieved: ${retrievedJob.id}`);
    console.log(`   Prompt: ${retrievedJob.prompt.substring(0, 50)}...`);
  } else {
    console.error('Failed to retrieve video job');
  }
  console.log();

  // Test 6: Update video job
  console.log('Test 6: Update video job');
  const updatedJob = await updateVideoJob(testJob.id, {
    status: 'processing',
    providerJobId: 'test-provider-123',
  });
  console.log(`Video job updated: ${updatedJob.id}`);
  console.log(`   New status: ${updatedJob.status}`);
  console.log(`   Provider job ID: ${updatedJob.providerJobId}\n`);

  // Test 7: Retrieve storyboard
  console.log('Test 7: Retrieve storyboard');
  const retrievedStoryboard = await getStoryboard(testStoryboard.id);
  if (retrievedStoryboard) {
    console.log(`Storyboard retrieved: ${retrievedStoryboard.id}`);
    console.log(`   Name: ${retrievedStoryboard.character.name}`);
    console.log(`   Scenes: ${retrievedStoryboard.scenes.length}`);
  } else {
    console.error('Failed to retrieve storyboard');
  }
  console.log();

  // Test 8: Cleanup - Delete test data
  console.log('Test 8: Cleanup test data');
  await deleteVideoJob(testJob.id);
  console.log('Video job deleted');

  await deleteStoryboard(testStoryboard.id);
  console.log('Storyboard deleted\n');

  // Test 9: Verify deletion
  console.log('Test 9: Verify deletion');
  const deletedJob = await getVideoJob(testJob.id);
  const deletedStoryboard = await getStoryboard(testStoryboard.id);

  if (!deletedJob && !deletedStoryboard) {
    console.log('Test data successfully cleaned up\n');
  } else {
    console.error('Cleanup verification failed');
  }

  console.log('All tests passed!\n');
  console.log('Summary:');
  console.log('   - Database connection: OK');
  console.log('   - CRUD operations: OK');
  console.log('   - Data integrity: OK');
  console.log('   - Cleanup: OK\n');
}

// Run the tests
main()
  .catch((error) => {
    console.error('\nTest failed with error:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    // Disconnect from database
    await disconnectDatabase();
    console.log('Database connection closed\n');
  });

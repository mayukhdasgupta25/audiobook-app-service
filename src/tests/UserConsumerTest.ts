/**
 * Test script for User Consumer Worker
 * This script can be used to test the user creation consumer functionality
 */
import { PrismaClient } from '@prisma/client';
import { UserConsumerWorkerFactory } from '../workers/UserConsumerWorker';
import { UserProfileService } from '../services/UserProfileService';

async function testUserConsumer() {
   const prisma = new PrismaClient();

   try {
      console.log('🧪 Testing User Consumer Worker...');

      // Test 1: Test worker functionality
      const worker = UserConsumerWorkerFactory.getWorker(prisma);
      const testResult = await worker.testWorker();

      if (testResult) {
         console.log('✅ Worker test passed');
      } else {
         console.log('❌ Worker test failed');
         return;
      }

      // Test 2: Test user profile creation directly
      const userProfileService = new UserProfileService(prisma);
      const testUserId = `test-user-${Date.now()}`;

      console.log(`🧪 Testing user profile creation for userId: ${testUserId}`);
      const result = await userProfileService.createUserProfile(testUserId);

      if (result.success && result.userProfile) {
         console.log(`✅ User profile created successfully:`);
         console.log(`   - ID: ${result.userProfile.id}`);
         console.log(`   - Username: ${result.userProfile.username}`);

         // Clean up test user
         await userProfileService.deleteUserProfile(testUserId);
         console.log('✅ Test user cleaned up');
      } else {
         console.log('❌ User profile creation failed:', result.error);
      }

      // Test 3: Test duplicate user handling
      console.log('🧪 Testing duplicate user handling...');
      const duplicateResult = await userProfileService.createUserProfile(testUserId);

      if (duplicateResult.success) {
         console.log('✅ Duplicate user handling works correctly');
         await userProfileService.deleteUserProfile(testUserId);
      } else {
         console.log('❌ Duplicate user handling failed:', duplicateResult.error);
      }

      console.log('🎉 All tests completed successfully!');

   } catch (error) {
      console.error('❌ Test failed:', error);
   } finally {
      await prisma.$disconnect();
   }
}

// Run the test if this file is executed directly
if (require.main === module) {
   testUserConsumer().catch(console.error);
}

export { testUserConsumer };

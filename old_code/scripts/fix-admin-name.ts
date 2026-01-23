#!/usr/bin/env tsx

/**
 * Fix admin user display name
 * Updates firstName from "Admind" to "Admin" for all admin@admin.com users
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { CosmosClient } from '@azure/cosmos';

// Load environment variables from apps/api/.env
const envPath = resolve(__dirname, '../apps/api/.env');
dotenv.config({ path: envPath });

const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
const cosmosKey = process.env.COSMOS_DB_KEY;
const databaseName = process.env.COSMOS_DB_DATABASE || 'castiel';

if (!cosmosEndpoint || !cosmosKey) {
  console.error('❌ Missing COSMOS_DB_ENDPOINT or COSMOS_DB_KEY environment variables');
  process.exit(1);
}

const client = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
const database = client.database(databaseName);
const usersContainer = database.container('users');

async function fixAdminName() {
  try {
    console.log('Fetching admin@admin.com users...\n');
    
    const query = 'SELECT * FROM c WHERE c.email = "admin@admin.com"';
    const { resources: users } = await usersContainer.items.query(query).fetchAll();
    
    console.log(`Found ${users.length} user(s)\n`);
    
    if (users.length === 0) {
      console.log('No admin@admin.com users found');
      return;
    }
    
    let updatedCount = 0;
    
    for (const user of users) {
      console.log(`User in tenant ${user.tenantId}:`);
      console.log(`  - Current firstName: "${user.firstName}"`);
      console.log(`  - Current lastName: "${user.lastName}"`);
      
      if (user.firstName === 'Admind') {
        // Update firstName to "Admin"
        user.firstName = 'Admin';
        
        // Also ensure displayName is set correctly
        user.displayName = `${user.firstName} ${user.lastName}`.trim();
        
        await usersContainer.items.upsert(user);
        updatedCount++;
        
        console.log(`  ✅ Updated firstName to "Admin" and displayName to "${user.displayName}"\n`);
      } else {
        console.log(`  ℹ️  No update needed (firstName is already correct)\n`);
      }
    }
    
    console.log(`✅ Updated ${updatedCount} user(s)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

fixAdminName()
  .then(() => {
    console.log('✓ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script failed:', error);
    process.exit(1);
  });

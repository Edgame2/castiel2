#!/usr/bin/env tsx
import { CosmosClient } from '@azure/cosmos';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'Morpheus@12'; // Default password

const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT!,
  key: process.env.COSMOS_DB_KEY!,
});

const database = client.database(process.env.COSMOS_DB_DATABASE!);
const container = database.container('users');

async function setAdminPassword() {
  console.log(`Setting password for ${ADMIN_EMAIL}...`);
  
  // Find all users with this email
  const { resources: users } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.email = @email',
      parameters: [{ name: '@email', value: ADMIN_EMAIL }],
    })
    .fetchAll();

  if (users.length === 0) {
    console.error('❌ No users found with email:', ADMIN_EMAIL);
    process.exit(1);
  }

  console.log(`Found ${users.length} user(s) to update`);

  // Hash the password
  const passwordHash = await argon2.hash(ADMIN_PASSWORD);

  // Update each user
  for (const user of users) {
    console.log(`\nUpdating user in tenant ${user.tenantId}...`);
    
    const updatedUser = {
      ...user,
      passwordHash,
      updatedAt: new Date().toISOString(),
    };

    await container.item(user.id, user.tenantId).replace(updatedUser);
    console.log(`✅ Password set for user in tenant ${user.tenantId}`);
  }

  console.log(`\n✅ Password updated for all ${users.length} user(s)`);
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
}

setAdminPassword()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

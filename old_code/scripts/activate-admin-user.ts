import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const COSMOS_DB_ENDPOINT = process.env.COSMOS_DB_ENDPOINT!;
const COSMOS_DB_KEY = process.env.COSMOS_DB_KEY!;
const COSMOS_DB_DATABASE = process.env.COSMOS_DB_DATABASE!;
const COSMOS_DB_USERS_CONTAINER = process.env.COSMOS_DB_USERS_CONTAINER || 'users';

async function activateAdminUser() {
  console.log('Connecting to Cosmos DB...');

  const client = new CosmosClient({
    endpoint: COSMOS_DB_ENDPOINT,
    key: COSMOS_DB_KEY,
  });

  const database = client.database(COSMOS_DB_DATABASE);
  const container = database.container(COSMOS_DB_USERS_CONTAINER);

  try {
    // Find user by email
    console.log('Searching for user: admin@admin.com');

    const { resources: users } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: 'admin@admin.com' }],
      })
      .fetchAll();

    if (users.length === 0) {
      console.error('❌ User admin@admin.com not found in database!');
      console.log('Available users:');
      const { resources: allUsers } = await container.items
        .query('SELECT c.email, c.id, c.tenantId FROM c')
        .fetchAll();
      allUsers.forEach(u => console.log(`  - ${u.email} (ID: ${u.id}, Tenant: ${u.tenantId})`));
      process.exit(1);
    }

    const user = users[0];
    console.log(`✓ Found user: ${user.email}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Tenant: ${user.tenantId}`);
    console.log(`  Current status: ${user.status}`);
    console.log(`  Current roles: ${JSON.stringify(user.roles || [])}`);
    console.log(`  Email verified: ${user.emailVerified}`);

    // Update user to be active and super admin
    const updatedUser = {
      ...user,
      status: 'active',
      emailVerified: true,
      roles: ['super-admin', 'admin', 'user'],
      isSuperAdmin: true,
      updatedAt: new Date().toISOString(),
    };

    console.log('\nUpdating user...');
    await container.item(user.id, user.tenantId).replace(updatedUser);

    console.log('✅ Successfully activated and promoted user to super admin!');
    console.log('\nUser details:');
    console.log(`  Email: ${updatedUser.email}`);
    console.log(`  Status: ${updatedUser.status}`);
    console.log(`  Email Verified: ${updatedUser.emailVerified}`);
    console.log(`  Roles: ${JSON.stringify(updatedUser.roles)}`);
    console.log(`  Is Super Admin: ${updatedUser.isSuperAdmin}`);

  } catch (error) {
    console.error('❌ Error updating user:', error);
    process.exit(1);
  }
}

activateAdminUser()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

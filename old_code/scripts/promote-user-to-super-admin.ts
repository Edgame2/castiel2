import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const COSMOS_DB_ENDPOINT = process.env.COSMOS_DB_ENDPOINT!;
const COSMOS_DB_KEY = process.env.COSMOS_DB_KEY!;
const COSMOS_DB_DATABASE = process.env.COSMOS_DB_DATABASE!;
const COSMOS_DB_USERS_CONTAINER = process.env.COSMOS_DB_USERS_CONTAINER || 'users';

// Get email from command line argument or use default
const USER_EMAIL = process.argv[2] || 'gamelin.edouard@gmail.com';

async function promoteUserToSuperAdmin() {
  console.log('Connecting to Cosmos DB...');

  if (!COSMOS_DB_ENDPOINT || !COSMOS_DB_KEY || !COSMOS_DB_DATABASE) {
    console.error('❌ Missing required environment variables:');
    console.error('   COSMOS_DB_ENDPOINT:', COSMOS_DB_ENDPOINT ? '✓' : '✗');
    console.error('   COSMOS_DB_KEY:', COSMOS_DB_KEY ? '✓' : '✗');
    console.error('   COSMOS_DB_DATABASE:', COSMOS_DB_DATABASE ? '✓' : '✗');
    process.exit(1);
  }

  const client = new CosmosClient({
    endpoint: COSMOS_DB_ENDPOINT,
    key: COSMOS_DB_KEY,
  });

  const database = client.database(COSMOS_DB_DATABASE);
  const container = database.container(COSMOS_DB_USERS_CONTAINER);

  try {
    // Find user by email (case-insensitive search)
    console.log(`\n🔍 Searching for user: ${USER_EMAIL}`);

    const { resources: users } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE LOWER(c.email) = LOWER(@email)',
        parameters: [{ name: '@email', value: USER_EMAIL }],
      })
      .fetchAll();

    if (users.length === 0) {
      console.error(`❌ User ${USER_EMAIL} not found in database!`);
      console.log('\n📋 Available users:');
      const { resources: allUsers } = await container.items
        .query('SELECT c.email, c.id, c.tenantId, c.roles, c.isSuperAdmin FROM c')
        .fetchAll();
      allUsers.forEach(u => {
        const roles = u.roles?.join(', ') || 'none';
        const isSuperAdmin = u.isSuperAdmin ? ' (Super Admin)' : '';
        console.log(`  - ${u.email} (ID: ${u.id}, Tenant: ${u.tenantId}, Roles: ${roles})${isSuperAdmin}`);
      });
      process.exit(1);
    }

    // Process all user memberships (users can exist in multiple tenants)
    console.log(`\n✓ Found ${users.length} user record(s)`);

    for (const user of users) {
      console.log(`\n📝 Processing user record:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Tenant: ${user.tenantId}`);
      console.log(`   Current status: ${user.status}`);
      console.log(`   Current roles: ${JSON.stringify(user.roles || [])}`);
      console.log(`   Email verified: ${user.emailVerified}`);
      console.log(`   Is Super Admin: ${user.isSuperAdmin || false}`);

      // Check if already super admin
      const isAlreadySuperAdmin = user.isSuperAdmin === true || 
                                   user.roles?.some((r: string) => 
                                     ['super-admin', 'super_admin', 'superadmin', 'global_admin'].includes(r.toLowerCase())
                                   );

      if (isAlreadySuperAdmin) {
        console.log(`   ⚠️  User is already a super admin in tenant ${user.tenantId}`);
        continue;
      }

      // Update user to be active and super admin
      const updatedRoles = Array.from(new Set([
        ...(user.roles || []),
        'super-admin',
        'admin',
        'user'
      ]));

      const updatedUser = {
        ...user,
        status: 'active',
        emailVerified: true,
        roles: updatedRoles,
        isSuperAdmin: true,
        updatedAt: new Date().toISOString(),
      };

      console.log(`\n   🔄 Updating user in tenant ${user.tenantId}...`);
      await container.item(user.id, user.tenantId).replace(updatedUser);

      console.log(`   ✅ Successfully promoted user to super admin in tenant ${user.tenantId}!`);
      console.log(`   Updated roles: ${JSON.stringify(updatedUser.roles)}`);
    }

    console.log(`\n✨ All user records processed successfully!`);
    console.log(`\n📋 Summary:`);
    console.log(`   Email: ${USER_EMAIL}`);
    console.log(`   Total records updated: ${users.length}`);

  } catch (error: any) {
    console.error('\n❌ Error updating user:', error);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.message) {
      console.error(`   Error message: ${error.message}`);
    }
    process.exit(1);
  }
}

promoteUserToSuperAdmin()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });



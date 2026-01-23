import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT!,
  key: process.env.COSMOS_DB_KEY!,
});

const database = client.database(process.env.COSMOS_DB_DATABASE!);
const container = database.container('users');

async function checkUser() {
  const { resources } = await container.items
    .query({
      query: 'SELECT c.id, c.email, c.tenantId, c.status, c.emailVerified, c.roles FROM c WHERE c.email = @email',
      parameters: [{ name: '@email', value: 'admin@admin.com' }],
    })
    .fetchAll();

  console.log('Found users:', JSON.stringify(resources, null, 2));
  
  for (const user of resources) {
    console.log(`\nUser in tenant ${user.tenantId}:`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Status: ${user.status}`);
    console.log(`  - Email Verified: ${user.emailVerified}`);
    console.log(`  - Roles: ${JSON.stringify(user.roles)}`);
    console.log(`  - Has password: ${user.passwordHash ? 'YES' : 'NO'}`);
  }
}

checkUser().catch(console.error);

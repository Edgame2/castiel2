
import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from apps/api/.env
const result = dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });
if (result.error) {
    console.error('Error loading .env:', result.error);
}
console.log('COSMOS_DB_ENDPOINT:', process.env.COSMOS_DB_ENDPOINT);

// import { config } from './apps/api/src/config/env.js';

async function main() {
    const { config } = await import('./apps/api/src/config/env.js');
    console.log('Connecting to Cosmos DB...');
    const client = new CosmosClient({
        endpoint: config.cosmosDb.endpoint,
        key: config.cosmosDb.key,
    });

    const database = client.database(config.cosmosDb.databaseId);
    const shardsContainer = database.container(config.cosmosDb.containers.shards);
    const shardTypesContainer = database.container(config.cosmosDb.containers.shardTypes);

    // 1. List Shard Types
    console.log('\n--- Shard Types (c_project) ---');
    const { resources: shardTypes } = await shardTypesContainer.items
        .query("SELECT * FROM c WHERE c.name = 'c_project'")
        .fetchAll();

    if (shardTypes.length === 0) {
        console.log('No shard type found with name "c_project"');
    } else {
        shardTypes.forEach(t => {
            console.log(`ID: ${t.id}, Name: ${t.name}`);
        });
    }

    if (shardTypes.length > 0) {
        const projectTypeId = shardTypes[0].id;
        console.log(`\nUsing Shard Type ID: ${projectTypeId}`);

        // 2. List Projects (Shards)
        console.log('\n--- Projects ---');
        const query = `SELECT * FROM c WHERE c.shardTypeId = '${projectTypeId}'`;
        const { resources: projects } = await shardsContainer.items
            .query(query)
            .fetchAll();

        console.log(`Found ${projects.length} projects.`);
        projects.forEach(p => {
            console.log(`ID: ${p.id}, Name: ${p.name}, Manager: ${p.structuredData?.managerId}`);
        });

        // 3. Test Filter Query
        if (projects.length > 0) {
            const managerId = projects[0].structuredData?.managerId;
            if (managerId) {
                console.log(`\nTesting filter with managerId: ${managerId}`);
                const filterQuery = `SELECT * FROM c WHERE c.shardTypeId = '${projectTypeId}' AND c.structuredData.managerId = '${managerId}'`;
                const { resources: filteredProjects } = await shardsContainer.items
                    .query(filterQuery)
                    .fetchAll();
                console.log(`Found ${filteredProjects.length} projects with filter.`);
            }
        }
    }
}

main().catch(console.error);

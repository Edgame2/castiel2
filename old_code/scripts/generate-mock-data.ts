#!/usr/bin/env tsx
/**
 * Mock Data Generator Script
 * 
 * Generates realistic mock data for core shard types:
 * - c_opportunity - Sales opportunities
 * - c_account - CRM accounts
 * - c_company - Companies/organizations
 * - c_contact - People/contacts
 * 
 * Usage:
 *   tsx scripts/generate-mock-data.ts
 *   tsx scripts/generate-mock-data.ts --companies 100 --accounts 150 --contacts 200 --opportunities 250
 * 
 * Environment Variables:
 *   COSMOS_DB_ENDPOINT - Cosmos DB endpoint (required, loaded from .env files)
 *   COSMOS_DB_KEY - Cosmos DB key (required, loaded from .env files)
 *   COSMOS_DB_DATABASE_ID or COSMOS_DB_DATABASE - Database name (default: "castiel")
 *   USER_EMAIL - Email address of user to link data to (default: "gamelin.edouard@gmail.com")
 *   MOCK_COMPANY_COUNT - Number of companies (default: 200)
 *   MOCK_ACCOUNT_COUNT - Number of accounts (default: 200)
 *   MOCK_CONTACT_COUNT - Number of contacts (default: 200)
 *   MOCK_OPPORTUNITY_COUNT - Number of opportunities (default: 200)
 * 
 * Note: The script automatically loads environment variables from:
 *   - .env (root)
 *   - .env.local (root)
 *   - apps/api/.env
 * 
 * The script will automatically look up the user by email and use their
 * user ID and tenant ID for all generated shards.
 */

// IMPORTANT: Load .env files FIRST, before any imports
// This ensures COSMOS_DB_ENDPOINT and COSMOS_DB_KEY are available when config module validates
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from multiple locations (order matters - later files override earlier ones)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

// Set minimal required env vars for config validation (not used by this script)
// These are required because repositories import the config module which validates on import
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'dummy-secret-for-mock-data-script';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'dummy-refresh-secret-for-mock-data-script';
}
if (!process.env.REDIS_HOST) {
  process.env.REDIS_HOST = 'localhost';
}
if (!process.env.REDIS_PORT) {
  process.env.REDIS_PORT = '6379';
}

// Now import modules that might import the config module
import { CosmosClient, Container } from '@azure/cosmos';
import { MonitoringService } from '@castiel/monitoring';
// Use type imports to avoid importing the config module at this point
import type { CreateShardInput } from '../apps/api/src/types/shard.types.js';

// ============================================================================
// Configuration
// ============================================================================

const USER_EMAIL = process.env.USER_EMAIL || 'gamelin.edouard@gmail.com';

// Default counts (can be overridden by env vars or CLI args)
let COMPANY_COUNT = Number(process.env.MOCK_COMPANY_COUNT || 200);
let ACCOUNT_COUNT = Number(process.env.MOCK_ACCOUNT_COUNT || 200);
let CONTACT_COUNT = Number(process.env.MOCK_CONTACT_COUNT || 200);
let OPPORTUNITY_COUNT = Number(process.env.MOCK_OPPORTUNITY_COUNT || 200);

// Parse command-line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--companies' && args[i + 1]) {
    COMPANY_COUNT = Number(args[i + 1]);
    i++;
  } else if (args[i] === '--accounts' && args[i + 1]) {
    ACCOUNT_COUNT = Number(args[i + 1]);
    i++;
  } else if (args[i] === '--contacts' && args[i + 1]) {
    CONTACT_COUNT = Number(args[i + 1]);
    i++;
  } else if (args[i] === '--opportunities' && args[i + 1]) {
    OPPORTUNITY_COUNT = Number(args[i + 1]);
    i++;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randInt(0, items.length - 1)];
}

function pickMultiple<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, items.length));
}

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function futureDate(daysFromNow: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() + randInt(1, daysFromNow));
  return date.toISOString().split('T')[0];
}

// ============================================================================
// Data Pools
// ============================================================================

const COMPANY_NAME_PARTS = [
  'Acme', 'TechStart', 'Global', 'Innovate', 'Digital', 'Cloud', 'Data', 'Smart',
  'NextGen', 'Future', 'Prime', 'Elite', 'Pro', 'Max', 'Ultra', 'Apex', 'Summit',
  'Vertex', 'Nexus', 'Pinnacle', 'Catalyst', 'Momentum', 'Velocity', 'Synergy'
];

const COMPANY_NAME_SUFFIXES = [
  'Corp', 'Inc', 'LLC', 'Ltd', 'Solutions', 'Systems', 'Technologies', 'Group',
  'Enterprises', 'Industries', 'Partners', 'Associates', 'Holdings', 'Ventures'
];

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Harper', 'Avery',
  'Quinn', 'Sage', 'Blake', 'Cameron', 'Dakota', 'Emery', 'Finley', 'Hayden',
  'James', 'Kai', 'Logan', 'Noah', 'Oliver', 'Parker', 'Quinn', 'Reese',
  'Sam', 'Tyler', 'Will', 'Zoe', 'Emma', 'Olivia', 'Sophia', 'Isabella',
  'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Nguyen', 'Patel', 'Chen', 'Singh', 'Kim', 'Wang', 'Li', 'Zhang', 'Kumar'
];

const JOB_TITLES = [
  'CEO', 'CTO', 'CFO', 'COO', 'VP Sales', 'VP Marketing', 'VP Engineering',
  'Director of Sales', 'Director of Marketing', 'Director of Operations',
  'Sales Manager', 'Marketing Manager', 'Product Manager', 'Project Manager',
  'Account Executive', 'Business Development Manager', 'Customer Success Manager',
  'Senior Engineer', 'Software Engineer', 'Data Analyst', 'Business Analyst',
  'Operations Manager', 'Finance Manager', 'HR Manager'
];

const DEPARTMENTS = [
  'Sales', 'Marketing', 'Engineering', 'Product', 'Operations', 'Finance',
  'Customer Success', 'Support', 'HR', 'Legal', 'IT', 'Business Development'
];

const INDUSTRIES = [
  'technology', 'healthcare', 'finance', 'retail', 'manufacturing', 'education',
  'energy', 'telecommunications', 'media', 'real_estate', 'transportation',
  'hospitality', 'government', 'nonprofit', 'consulting', 'professional_services'
];

const INDUSTRY_SUBCATEGORIES: Record<string, string[]> = {
  technology: ['SaaS', 'Cloud Computing', 'AI/ML', 'Cybersecurity', 'FinTech', 'EdTech'],
  healthcare: ['Medical Devices', 'Pharmaceuticals', 'Telemedicine', 'Health IT', 'Biotech'],
  finance: ['Banking', 'Insurance', 'Investment', 'Wealth Management', 'Payments'],
  retail: ['E-commerce', 'Fashion', 'Consumer Goods', 'Grocery', 'Electronics'],
  manufacturing: ['Automotive', 'Aerospace', 'Electronics', 'Food & Beverage', 'Textiles'],
  education: ['K-12', 'Higher Education', 'Online Learning', 'EdTech', 'Training'],
};

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'San Francisco', 'Columbus', 'Fort Worth', 'Charlotte', 'Seattle', 'Denver',
  'Boston', 'Nashville', 'Portland', 'Miami', 'Atlanta', 'Detroit'
];

const STATES = [
  'CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA',
  'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI', 'CO', 'MN', 'SC', 'AL'
];

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia'];

const COMPANY_TYPES = ['public', 'private', 'startup', 'enterprise', 'smb', 'nonprofit', 'government', 'subsidiary'];
const EMPLOYEE_COUNTS = ['1', '2-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const STATUSES = ['prospect', 'lead', 'customer', 'partner', 'vendor', 'competitor', 'churned', 'inactive'];
const TIERS = ['strategic', 'enterprise', 'mid_market', 'smb', 'startup'];

const ACCOUNT_TYPES = ['customer', 'competitor', 'partner', 'prospect', 'reseller', 'other'];
const RATINGS = ['hot', 'warm', 'cold'];
const OWNERSHIP_TYPES = ['public', 'private', 'subsidiary', 'other'];

const CONTACT_ROLES = ['decision_maker', 'influencer', 'champion', 'end_user', 'gatekeeper', 'technical', 'executive', 'procurement', 'legal', 'other'];
const SENIORITY_LEVELS = ['c_level', 'vp', 'director', 'manager', 'senior', 'mid', 'junior', 'intern'];
const CONTACT_STATUSES = ['active', 'inactive', 'bounced', 'unsubscribed', 'archived'];
const CONTACT_SOURCES = ['inbound', 'outbound', 'referral', 'event', 'website', 'social', 'partner', 'advertisement', 'cold_call', 'other'];
const PREFERRED_CONTACT_METHODS = ['email', 'phone', 'sms', 'linkedin', 'slack', 'teams', 'in_person'];
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'];

const OPPORTUNITY_TYPES = ['new_business', 'existing_business', 'renewal', 'upsell', 'cross_sell', 'expansion', 'other'];
const OPPORTUNITY_STAGES = [
  'prospecting', 'qualification', 'needs_analysis', 'value_proposition',
  'id_decision_makers', 'perception_analysis', 'proposal_price_quote',
  'negotiation_review', 'closed_won', 'closed_lost'
];
const OPPORTUNITY_STATUSES = ['open', 'won', 'lost'];
const LEAD_SOURCES = [
  'web', 'phone_inquiry', 'partner_referral', 'purchased_list', 'other',
  'employee_referral', 'online_store', 'sales_mail_alias', 'seminar',
  'trade_show', 'webinar', 'chat', 'twitter', 'facebook', 'linkedin'
];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

// Stage to probability mapping (realistic probabilities based on stage)
const STAGE_PROBABILITIES: Record<string, number> = {
  prospecting: 10,
  qualification: 20,
  needs_analysis: 30,
  value_proposition: 40,
  id_decision_makers: 50,
  perception_analysis: 60,
  proposal_price_quote: 70,
  negotiation_review: 80,
  closed_won: 100,
  closed_lost: 0,
};

// ============================================================================
// Data Generators
// ============================================================================

function generateCompanyName(index: number): string {
  const part1 = pick(COMPANY_NAME_PARTS);
  const part2 = randInt(0, 1) === 0 ? pick(COMPANY_NAME_PARTS.filter(p => p !== part1)) : null;
  const suffix = pick(COMPANY_NAME_SUFFIXES);
  
  if (part2) {
    return `${part1} ${part2} ${suffix}`;
  }
  return `${part1} ${suffix}`;
}

function generateCompanyData(index: number): Record<string, any> {
  const name = generateCompanyName(index);
  const industry = pick(INDUSTRIES);
  const subcategories = INDUSTRY_SUBCATEGORIES[industry] || [];
  const companyType = pick(COMPANY_TYPES);
  const city = pick(CITIES);
  const state = pick(STATES);
  const country = pick(COUNTRIES);
  const employeeCount = pick(EMPLOYEE_COUNTS);
  const status = pick(STATUSES);
  const tier = pick(TIERS);
  
  // Generate realistic revenue based on employee count
  let annualRevenue = 0;
  const employeeCountNum = employeeCount === '5000+' ? 10000 : 
    employeeCount.includes('-') ? parseInt(employeeCount.split('-')[1]) : parseInt(employeeCount);
  if (employeeCountNum) {
    annualRevenue = employeeCountNum * randInt(80000, 200000); // $80k-$200k per employee
  }
  
  const website = `https://${name.toLowerCase().replace(/\s+/g, '')}.com`;
  const email = `contact@${name.toLowerCase().replace(/\s+/g, '')}.com`;
  const phone = `+1-${randInt(200, 999)}-${randInt(200, 999)}-${randInt(1000, 9999)}`;
  
  return {
    name,
    legalName: `${name} ${pick(['Inc.', 'LLC', 'Ltd.', 'Corporation'])}`,
    description: `${name} is a leading ${industry} company specializing in ${subcategories.length > 0 ? pick(subcategories) : industry} solutions. We provide innovative services to help businesses grow and succeed.`,
    industry,
    industrySubcategory: subcategories.length > 0 ? pick(subcategories) : undefined,
    companyType,
    website,
    email,
    phone,
    address: {
      street: `${randInt(100, 9999)} ${pick(['Main', 'Oak', 'Park', 'Maple', 'First', 'Second', 'Third'])} Street`,
      city,
      state,
      postalCode: `${randInt(10000, 99999)}`,
      country,
    },
    employeeCount,
    annualRevenue,
    revenueCurrency: pick(['USD', 'EUR', 'GBP']),
    foundedYear: randInt(1950, 2020),
    status,
    tier,
    tags: ['mock-data', `industry-${industry}`, `tier-${tier}`],
  };
}

function generateAccountData(index: number): Record<string, any> {
  const name = generateCompanyName(index + 1000); // Offset to avoid duplicates with companies
  const accountType = pick(ACCOUNT_TYPES);
  const industry = pick(INDUSTRIES);
  const rating = pick(RATINGS);
  const ownership = pick(OWNERSHIP_TYPES);
  const city = pick(CITIES);
  const state = pick(STATES);
  const country = pick(COUNTRIES);
  
  const numberOfEmployees = randInt(10, 5000);
  const annualRevenue = numberOfEmployees * randInt(80000, 200000);
  
  return {
    name,
    accountNumber: `ACC-${String(index).padStart(6, '0')}`,
    type: accountType,
    industry,
    rating,
    ownership,
    annualRevenue,
    numberOfEmployees,
    tickerSymbol: ownership === 'public' ? pick(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA']).substring(0, 4) + String(randInt(100, 999)) : undefined,
    yearStarted: randInt(1950, 2020),
    phone: `+1-${randInt(200, 999)}-${randInt(200, 999)}-${randInt(1000, 9999)}`,
    fax: randInt(0, 1) === 0 ? `+1-${randInt(200, 999)}-${randInt(200, 999)}-${randInt(1000, 9999)}` : undefined,
    website: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
    billingStreet: `${randInt(100, 9999)} ${pick(['Main', 'Oak', 'Park', 'Maple', 'First'])} Street`,
    billingCity: city,
    billingState: state,
    billingPostalCode: `${randInt(10000, 99999)}`,
    billingCountry: country,
    description: `${name} is a ${accountType} in the ${industry} industry.`,
    tags: ['mock-data', `type-${accountType}`, `rating-${rating}`],
  };
}

function generateContactData(index: number): Record<string, any> {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const jobTitle = pick(JOB_TITLES);
  const department = pick(DEPARTMENTS);
  const role = pick(CONTACT_ROLES);
  const seniorityLevel = pick(SENIORITY_LEVELS);
  const city = pick(CITIES);
  const state = pick(STATES);
  const country = pick(COUNTRIES);
  
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`;
  const phone = `+1-${randInt(200, 999)}-${randInt(200, 999)}-${randInt(1000, 9999)}`;
  
  return {
    firstName,
    lastName,
    name,
    salutation: pick(['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.']),
    email,
    emailSecondary: randInt(0, 3) === 0 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@personal.com` : undefined,
    phone,
    phoneSecondary: randInt(0, 4) === 0 ? `+1-${randInt(200, 999)}-${randInt(200, 999)}-${randInt(1000, 9999)}` : undefined,
    jobTitle,
    department,
    role,
    seniorityLevel,
    linkedInUrl: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${index}`,
    twitterHandle: randInt(0, 2) === 0 ? `@${firstName.toLowerCase()}${lastName.charAt(0)}` : undefined,
    address: {
      street: `${randInt(100, 9999)} ${pick(['Main', 'Oak', 'Park', 'Maple'])} Street`,
      city,
      state,
      postalCode: `${randInt(10000, 99999)}`,
      country,
    },
    timezone: pick(TIMEZONES),
    preferredContactMethod: pick(PREFERRED_CONTACT_METHODS),
    doNotContact: false,
    status: pick(CONTACT_STATUSES),
    source: pick(CONTACT_SOURCES),
    birthday: randInt(0, 3) === 0 ? randomDate(new Date(1970, 0, 1), new Date(2000, 11, 31)) : undefined,
    notes: randInt(0, 2) === 0 ? `Contact notes for ${name}. ${pick(['Met at conference.', 'Referred by partner.', 'Cold outreach.', 'Inbound inquiry.'])}` : undefined,
    tags: ['mock-data', `department-${department}`, `role-${role}`],
  };
}

function generateOpportunityData(index: number, ownerId: string): Record<string, any> {
  const type = pick(OPPORTUNITY_TYPES);
  const stage = pick(OPPORTUNITY_STAGES);
  const status = stage === 'closed_won' ? 'won' : stage === 'closed_lost' ? 'lost' : 'open';
  const probability = STAGE_PROBABILITIES[stage];
  
  // Generate realistic deal amounts
  const baseAmount = pick([10000, 25000, 50000, 100000, 250000, 500000, 1000000]);
  const amount = baseAmount + randInt(-baseAmount * 0.2, baseAmount * 0.2);
  const expectedRevenue = Math.round(amount * (probability / 100));
  
  const currency = pick(CURRENCIES);
  const leadSource = pick(LEAD_SOURCES);
  const closeDate = futureDate(90);
  const nextStepDate = futureDate(30);
  
  const opportunityNames = [
    `${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${pick(['Enterprise', 'Mid-Market', 'SMB'])} Deal`,
    `Q${randInt(1, 4)} ${pick(['Enterprise', 'Strategic', 'Key'])} ${type.replace('_', ' ')}`,
    `${pick(['New', 'Renewal', 'Expansion'])} Opportunity - ${pick(['Acme Corp', 'TechStart Inc', 'Global Solutions'])}`,
    `${pick(['Strategic', 'Tactical', 'Quick'])} ${type.replace('_', ' ')} Opportunity`,
  ];
  
  return {
    name: `${pick(opportunityNames)} ${index}`,
    opportunityNumber: `OPP-${String(index).padStart(6, '0')}`,
    type,
    stage,
    status,
    amount,
    expectedRevenue,
    currency,
    probability,
    closeDate,
    nextStepDate,
    leadSource,
    description: `This is a ${type.replace('_', ' ')} opportunity in the ${stage} stage. ${pick(['High priority deal.', 'Strategic account.', 'Key relationship.', 'Growth opportunity.'])}`,
    ownerId,
    tags: ['mock-data', `type-${type}`, `stage-${stage}`, `source-${leadSource}`],
  };
}

// ============================================================================
// Shard Creation
// ============================================================================

async function getShardTypeId(
  shardTypeRepo: ShardTypeRepository,
  shardTypeName: string,
  tenantId: string
): Promise<string> {
  // Try tenant-specific first, then system
  let shardType = await shardTypeRepo.findByName(shardTypeName, tenantId);
  if (!shardType) {
    shardType = await shardTypeRepo.findByName(shardTypeName, 'system');
  }
  
  if (!shardType) {
    throw new Error(`ShardType "${shardTypeName}" not found. Please run the seed-types script first.`);
  }
  
  return shardType.id;
}

async function createShards(
  shardRepo: ShardRepository,
  shardTypeRepo: ShardTypeRepository,
  shardTypeName: string,
  dataGenerator: (index: number, ...args: any[]) => Record<string, any>,
  count: number,
  tenantId: string,
  userId: string,
  batchSize: number = 50,
  ...generatorArgs: any[]
): Promise<number> {
  console.log(`\n📦 Generating ${count} ${shardTypeName} records...`);
  
  const shardTypeId = await getShardTypeId(shardTypeRepo, shardTypeName, tenantId);
  let created = 0;
  let errors = 0;
  
  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    const batchEnd = Math.min(i + batchSize, count);
    
    for (let j = i; j < batchEnd; j++) {
      try {
        const structuredData = dataGenerator(j + 1, ...generatorArgs);
        const input: CreateShardInput = {
          tenantId,
          shardTypeId,
          shardTypeName,
          structuredData,
          createdBy: userId,
        };
        batch.push(input);
      } catch (error: any) {
        console.error(`   ❌ Error generating data for ${shardTypeName} #${j + 1}: ${error.message}`);
        errors++;
      }
    }
    
    // Create batch
    for (const input of batch) {
      try {
        await shardRepo.create(input);
        created++;
        if (created % 10 === 0) {
          process.stdout.write(`   Progress: ${created}/${count}\r`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error creating ${shardTypeName}: ${error.message}`);
        errors++;
      }
    }
  }
  
  console.log(`   ✅ Created: ${created}, Errors: ${errors}`);
  return created;
}

// ============================================================================
// User Lookup
// ============================================================================

interface UserDocument {
  id: string;
  tenantId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

async function findUserByEmail(
  container: Container,
  email: string
): Promise<UserDocument | null> {
  const { resources } = await container.items
    .query<UserDocument>({
      query: 'SELECT * FROM c WHERE LOWER(c.email) = LOWER(@email)',
      parameters: [{ name: '@email', value: email }],
    })
    .fetchAll();
  
  return resources[0] || null;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  // Validate configuration
  // Support both COSMOS_DB_DATABASE_ID and COSMOS_DB_DATABASE (existing .env files use COSMOS_DB_DATABASE)
  const endpoint = process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_DB_KEY;
  const databaseId = process.env.COSMOS_DB_DATABASE_ID || process.env.COSMOS_DB_DATABASE || 'castiel';
  const usersContainerName = process.env.COSMOS_DB_USERS_CONTAINER || 'users';
  
  if (!endpoint || !key) {
    console.error('❌ Missing Cosmos DB configuration:');
    if (!endpoint) console.error('   - COSMOS_DB_ENDPOINT is not set');
    if (!key) console.error('   - COSMOS_DB_KEY is not set');
    console.error('\nPlease set these environment variables in your .env file.');
    process.exit(1);
  }
  
  console.log('🎲 Mock Data Generator Script');
  console.log('============================');
  console.log(`📍 Endpoint: ${endpoint.substring(0, 50)}...`);
  console.log(`📁 Database: ${databaseId}`);
  console.log(`👤 Looking up user: ${USER_EMAIL}`);
  console.log('');
  
  // Initialize Cosmos client for user lookup
  const cosmosClient = new CosmosClient({ endpoint, key });
  const database = cosmosClient.database(databaseId);
  const usersContainer = database.container(usersContainerName);
  
  // Find user by email
  console.log('🔍 Looking up user...');
  const user = await findUserByEmail(usersContainer, USER_EMAIL);
  
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}`);
    console.error('\nPlease ensure the user exists in the database.');
    console.error('You can check available users or create the user first.');
    process.exit(1);
  }
  
  const TENANT_ID = user.tenantId;
  const USER_ID = user.id;
  
  console.log(`   ✅ Found user: ${user.email}`);
  console.log(`   📋 User ID: ${USER_ID}`);
  console.log(`   🏢 Tenant ID: ${TENANT_ID}`);
  console.log('');
  console.log('📊 Generation Plan:');
  console.log(`   Companies: ${COMPANY_COUNT}`);
  console.log(`   Accounts: ${ACCOUNT_COUNT}`);
  console.log(`   Contacts: ${CONTACT_COUNT}`);
  console.log(`   Opportunities: ${OPPORTUNITY_COUNT}`);
  console.log('');
  
  // Initialize monitoring
  const monitoring = MonitoringService.initialize({
    enabled: false,
    provider: 'mock',
  });
  
  // Dynamically import repositories AFTER env vars are set
  // This ensures the config module sees the environment variables
  console.log('📦 Initializing repositories...');
  const { ShardRepository } = await import('../apps/api/src/repositories/shard.repository.js');
  const { ShardTypeRepository } = await import('../apps/api/src/repositories/shard-type.repository.js');
  
  const shardTypeRepo = new ShardTypeRepository(monitoring);
  await shardTypeRepo.ensureContainer();
  
  const shardRepo = new ShardRepository(monitoring);
  await shardRepo.ensureContainer();
  console.log('   ✅ Repositories initialized\n');
  
  const startTime = Date.now();
  let totalCreated = 0;
  
  try {
    // Generate companies
    if (COMPANY_COUNT > 0) {
      const created = await createShards(
        shardRepo,
        shardTypeRepo,
        'c_company',
        generateCompanyData,
        COMPANY_COUNT,
        TENANT_ID,
        USER_ID
      );
      totalCreated += created;
    }
    
    // Generate accounts
    if (ACCOUNT_COUNT > 0) {
      const created = await createShards(
        shardRepo,
        shardTypeRepo,
        'c_account',
        generateAccountData,
        ACCOUNT_COUNT,
        TENANT_ID,
        USER_ID
      );
      totalCreated += created;
    }
    
    // Generate contacts
    if (CONTACT_COUNT > 0) {
      const created = await createShards(
        shardRepo,
        shardTypeRepo,
        'c_contact',
        generateContactData,
        CONTACT_COUNT,
        TENANT_ID,
        USER_ID
      );
      totalCreated += created;
    }
    
    // Generate opportunities
    if (OPPORTUNITY_COUNT > 0) {
      const created = await createShards(
        shardRepo,
        shardTypeRepo,
        'c_opportunity',
        generateOpportunityData,
        OPPORTUNITY_COUNT,
        TENANT_ID,
        USER_ID,
        50,
        USER_ID // ownerId (same as createdBy)
      );
      totalCreated += created;
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log('============================');
    console.log(`✅ Mock data generation complete!`);
    console.log(`   Total created: ${totalCreated} shards`);
    console.log(`   Duration: ${duration}s`);
    console.log('');
    
  } catch (error: any) {
    console.error('');
    console.error('❌ Fatal error during generation:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('ShardType')) {
      console.error('');
      console.error('   Please run the seed-types script first:');
      console.error('   pnpm --filter @castiel/api run seed-types');
    }
    
    process.exit(1);
  }
}

// Run script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});


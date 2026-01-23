#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from repo root and app-local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

type Shard = { id: string; shardTypeId: string; structuredData?: Record<string, unknown> };

type CreateShardInput = {
  shardTypeId: string;
  structuredData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  parentShardId?: string;
};

type CreateLinkInput = {
  projectId: string;
  fromShardId: string;
  toShardId: string;
  relationshipType: string;
  strength?: number;
  isBidirectional?: boolean;
  tags?: string[];
};

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
const TENANT_ID = process.env.SEED_TENANT_ID || '4b189cbb10d93bb3ede467b34afe7909';
const USER_ID = process.env.SEED_USER_ID || '1985d117f61ce3e549a2a98b0d438fcf';

const PROJECT_COUNT = Number(process.env.SEED_PROJECT_COUNT || 20);
const CONTACTS_MIN = Number(process.env.SEED_CONTACTS_MIN || 2);
const CONTACTS_MAX = Number(process.env.SEED_CONTACTS_MAX || 4);
const NOTES_MIN = Number(process.env.SEED_NOTES_MIN || 2);
const NOTES_MAX = Number(process.env.SEED_NOTES_MAX || 3);
const OPPS_MIN = Number(process.env.SEED_OPPS_MIN || 1);
const OPPS_MAX = Number(process.env.SEED_OPPS_MAX || 2);

if (!AUTH_TOKEN) {
  console.error('Missing API_AUTH_TOKEN env var (Bearer access token)');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
  'x-tenant-id': TENANT_ID,
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[randInt(0, items.length - 1)];
}

function sentence(subject: string): string {
  const phrases = [
    `${subject} is aligned with the current OKRs and prioritizes risk reduction.`,
    `${subject} improves visibility for stakeholders and unblocks dependent teams.`,
    `${subject} focuses on customer-facing impact with measurable milestones.`,
    `${subject} integrates with existing systems and keeps scope controlled.`,
    `${subject} is sequenced to deliver incremental value every sprint.`,
  ];
  return pick(phrases);
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${res.statusText} - ${detail}`);
  }

  return (await res.json()) as T;
}

function buildProjectData(index: number) {
  const industries = ['FinTech', 'HealthTech', 'Retail', 'Manufacturing', 'Education', 'Energy'];
  const goals = ['modernization', 'analytics rollout', 'partner onboarding', 'automation pilot', 'customer portal'];
  const riskNotes = ['regulatory dependencies', 'third-party SLAs', 'data migration risk', 'timeline compression', 'staffing constraints'];
  const statusPool = ['planned', 'in_progress', 'on_hold', 'completed'];
  const priorities = ['low', 'medium', 'high', 'critical'];

  const name = `Project ${index.toString().padStart(2, '0')} - ${pick(industries)} ${pick(goals)}`;
  const startDay = (index % 24) + 1;
  const startDate = `2025-01-${startDay.toString().padStart(2, '0')}`;
  const targetDate = `2025-03-${((startDay + 10) % 28 + 1).toString().padStart(2, '0')}`;

  return {
    shardTypeId: 'c_project',
    structuredData: {
      name,
      description: `${name} focuses on ${pick(goals)} for ${pick(industries)} customers. ${sentence('The initiative')}`,
      status: pick(statusPool),
      priority: pick(priorities),
      startDate,
      targetDate,
      managerId: USER_ID,
      teamIds: [USER_ID],
      tags: ['seed', 'demo', `proj-${index}`],
    },
    metadata: {
      seed: true,
      seedIndex: index,
      tenantId: TENANT_ID,
      createdBy: USER_ID,
    },
  } satisfies CreateShardInput;
}

function buildContactData(projectName: string, projectIndex: number, contactIndex: number) {
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Harper'];
  const lastNames = ['Nguyen', 'Patel', 'Garcia', 'Chen', 'Williams', 'Singh', 'Johnson'];
  const titles = ['Director of Operations', 'VP Sales', 'Product Lead', 'Customer Success Manager', 'IT Manager', 'Program Manager'];
  const departments = ['Operations', 'Sales', 'Product', 'Customer Success', 'IT', 'Finance'];

  const firstName = pick(firstNames);
  const lastName = pick(lastNames);
  const email = `${firstName}.${lastName}${projectIndex}${contactIndex}@example.com`.toLowerCase();

  return {
    shardTypeId: 'c_contact',
    structuredData: {
      firstName,
      lastName,
      title: pick(titles),
      department: pick(departments),
      email,
      phone: `+1-555-${projectIndex.toString().padStart(3, '0')}-${contactIndex.toString().padStart(4, '0')}`,
      company: projectName,
      timezone: 'America/New_York',
      tags: ['seed', 'contact', `proj-${projectIndex}`],
    },
    metadata: {
      seed: true,
      projectName,
      projectIndex,
      role: contactIndex === 0 ? 'primary' : 'stakeholder',
    },
  } satisfies CreateShardInput;
}

function buildOpportunityData(projectName: string, projectIndex: number, oppIndex: number) {
  const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won'];
  const sources = ['inbound', 'referral', 'partner', 'expansion'];
  const amount = 25000 + projectIndex * 1500 + oppIndex * 5000;

  return {
    shardTypeId: 'c_opportunity',
    structuredData: {
      name: `${projectName} - ${pick(['Pilot', 'Rollout', 'Renewal', 'Expansion'])}`,
      stage: pick(stages),
      amount,
      currency: 'USD',
      probability: Math.min(0.15 + projectIndex * 0.02 + oppIndex * 0.05, 0.9),
      expectedCloseDate: `2025-04-${((projectIndex + oppIndex) % 27 + 1).toString().padStart(2, '0')}`,
      source: pick(sources),
      tags: ['seed', 'opportunity', `proj-${projectIndex}`],
    },
    metadata: {
      seed: true,
      projectName,
      projectIndex,
      track: 'pipeline',
    },
  } satisfies CreateShardInput;
}

function buildNoteData(projectName: string, projectIndex: number, noteIndex: number) {
  const categories = ['discovery', 'decision', 'risk', 'summary'];
  return {
    shardTypeId: 'c_note',
    structuredData: {
      title: `${projectName} note ${noteIndex + 1}`,
      content: `Key takeaways for ${projectName}: ${sentence('This workstream')} Progress updates are shared weekly.`,
      category: pick(categories),
      tags: ['seed', 'note', `proj-${projectIndex}`],
    },
    metadata: {
      seed: true,
      projectName,
      projectIndex,
      noteIndex,
    },
  } satisfies CreateShardInput;
}

async function createShard(input: CreateShardInput): Promise<Shard> {
  return apiPost<Shard>('/shards', input);
}

async function seedProject(index: number): Promise<void> {
  const projectInput = buildProjectData(index);
  const project = await createShard(projectInput);

  const contactCount = randInt(CONTACTS_MIN, CONTACTS_MAX);
  const noteCount = randInt(NOTES_MIN, NOTES_MAX);
  const oppCount = randInt(OPPS_MIN, OPPS_MAX);

  const contacts: Shard[] = [];
  for (let i = 0; i < contactCount; i++) {
    contacts.push(
      await createShard({
        ...buildContactData(projectInput.structuredData.name, index, i),
        parentShardId: project.id,
      })
    );
  }

  const opportunities: Shard[] = [];
  for (let i = 0; i < oppCount; i++) {
    opportunities.push(
      await createShard({
        ...buildOpportunityData(projectInput.structuredData.name, index, i),
        parentShardId: project.id,
      })
    );
  }

  const notes: Shard[] = [];
  for (let i = 0; i < noteCount; i++) {
    notes.push(
      await createShard({
        ...buildNoteData(projectInput.structuredData.name, index, i),
        parentShardId: project.id,
      })
    );
  }

  console.log(
    `Seeded project ${index}/${PROJECT_COUNT}: ${project.id} with ${contacts.length} contacts, ${opportunities.length} opps, ${notes.length} notes`
  );
}

async function main(): Promise<void> {
  console.log(`Seeding ${PROJECT_COUNT} projects via ${API_BASE_URL} (tenant ${TENANT_ID})`);

  for (let i = 1; i <= PROJECT_COUNT; i++) {
    try {
      await seedProject(i);
    } catch (error: any) {
      console.error(`Failed seeding project ${i}: ${error.message}`);
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});

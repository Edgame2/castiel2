/**
 * CAIS Dashboard
 * Overview of all Compound AI System services
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Calendar,
  Share2,
  Shield,
  Package,
  FileText,
  Eye,
  Target,
  Heart,
  Users,
  Zap,
  Network,
  GitMerge,
  Database,
  TestTube,
  UsersRound,
  TrendingUp,
  BarChart3,
  Handshake,
  Activity,
  Brain,
} from 'lucide-react';

const caisServices = [
  {
    category: 'Intelligence',
    services: [
      {
        name: 'Communication Analysis',
        description: 'Analyze communication content for sentiment, tone, and engagement',
        href: '/cais/communication-analysis',
        icon: MessageSquare,
        color: 'text-blue-500',
      },
      {
        name: 'Calendar Intelligence',
        description: 'Analyze calendar patterns for sales intelligence',
        href: '/cais/calendar-intelligence',
        icon: Calendar,
        color: 'text-green-500',
      },
      {
        name: 'Social Signals',
        description: 'Process external social signals for sales intelligence',
        href: '/cais/social-signals',
        icon: Share2,
        color: 'text-purple-500',
      },
      {
        name: 'Competitive Intelligence',
        description: 'Analyze competitive intelligence and detect threats',
        href: '/cais/competitive-intelligence',
        icon: Target,
        color: 'text-red-500',
      },
    ],
  },
  {
    category: 'Monitoring',
    services: [
      {
        name: 'Anomaly Detection',
        description: 'Detect anomalies in opportunity data',
        href: '/cais/anomaly-detection',
        icon: Shield,
        color: 'text-orange-500',
      },
      {
        name: 'Explanation Quality',
        description: 'Assess the quality of AI explanations',
        href: '/cais/explanation-quality',
        icon: FileText,
        color: 'text-indigo-500',
      },
      {
        name: 'Explanation Monitoring',
        description: 'Track how users interact with AI explanations',
        href: '/cais/explanation-monitoring',
        icon: Eye,
        color: 'text-cyan-500',
      },
    ],
  },
  {
    category: 'Learning',
    services: [
      {
        name: 'Conflict Resolution',
        description: 'Resolve conflicts between detection methods using learned strategies',
        href: '/cais/conflict-resolution',
        icon: GitMerge,
        color: 'text-pink-500',
      },
      {
        name: 'Hierarchical Memory',
        description: 'Store and retrieve memory records from the hierarchical memory system',
        href: '/cais/memory',
        icon: Database,
        color: 'text-teal-500',
      },
      {
        name: 'Adversarial Testing',
        description: 'Run adversarial tests to detect vulnerabilities',
        href: '/cais/adversarial-testing',
        icon: TestTube,
        color: 'text-yellow-500',
      },
      {
        name: 'Federated Learning',
        description: 'Start federated learning rounds for collaborative model training',
        href: '/cais/federated-learning',
        icon: Network,
        color: 'text-emerald-500',
      },
    ],
  },
  {
    category: 'Integration',
    services: [
      {
        name: 'Product Usage',
        description: 'Track product usage events for sales intelligence',
        href: '/cais/product-usage',
        icon: Package,
        color: 'text-amber-500',
      },
      {
        name: 'Customer Success Integration',
        description: 'Integrate customer success data with sales intelligence',
        href: '/cais/customer-success-integration',
        icon: Users,
        color: 'text-violet-500',
      },
      {
        name: 'Relationship Evolution',
        description: 'Track relationship evolution and health over time',
        href: '/cais/relationship-evolution',
        icon: Heart,
        color: 'text-rose-500',
      },
    ],
  },
  {
    category: 'Execution',
    services: [
      {
        name: 'Pipeline Health',
        description: 'Monitor pipeline health and performance metrics',
        href: '/cais/pipeline-health',
        icon: Activity,
        color: 'text-lime-500',
      },
      {
        name: 'Playbook Execution',
        description: 'Execute and monitor sales playbooks',
        href: '/cais/playbooks',
        icon: Zap,
        color: 'text-sky-500',
      },
      {
        name: 'Negotiation Intelligence',
        description: 'Analyze negotiations and provide strategic recommendations',
        href: '/cais/negotiation',
        icon: Handshake,
        color: 'text-fuchsia-500',
      },
    ],
  },
  {
    category: 'Forecasting',
    services: [
      {
        name: 'Forecast Analysis',
        description: 'Comprehensive forecast analysis with decomposition, consensus, and commitment',
        href: '/cais/forecast',
        icon: TrendingUp,
        color: 'text-green-600',
      },
    ],
  },
  {
    category: 'Collaboration',
    services: [
      {
        name: 'Collaborative Intelligence',
        description: 'Team learning and knowledge sharing',
        href: '/cais/collaborative-intelligence',
        icon: UsersRound,
        color: 'text-blue-600',
      },
      {
        name: 'Self Healing',
        description: 'Automatically detect and remediate issues',
        href: '/cais/self-healing',
        icon: Brain,
        color: 'text-purple-600',
      },
    ],
  },
];

export default function CAISDashboardPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compound AI Systems (CAIS)</h1>
        <p className="text-muted-foreground">
          Advanced AI-powered services for sales intelligence and automation
        </p>
      </div>

      <div className="grid gap-6">
        {caisServices.map((category) => (
          <div key={category.category} className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">{category.category}</h2>
              <Badge variant="outline">{category.services.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.services.map((service) => {
                const Icon = service.icon;
                return (
                  <Link key={service.name} href={service.href}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <Icon className={`h-6 w-6 ${service.color}`} />
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                        </div>
                        <CardDescription>{service.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2">About CAIS</h3>
        <p className="text-sm text-muted-foreground">
          Compound AI Systems (CAIS) is a comprehensive suite of AI-powered services designed to enhance
          sales intelligence, automate workflows, and provide actionable insights. The system includes
          22 specialized services across 7 categories, all working together to provide a complete
          intelligent sales platform.
        </p>
      </div>
    </div>
  );
}

import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Container Apps
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'web',
    timestamp: new Date().toISOString(),
  });
}




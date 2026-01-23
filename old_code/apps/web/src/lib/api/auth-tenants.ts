import type { TenantMembershipResponse, UpdateDefaultTenantResponse } from '@/types/api'

export interface SwitchTenantResponse {
  accessToken: string
  refreshToken: string
  expiresIn: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    tenantId: string
    tenantName?: string
    roles: string[]
  }
}

async function handleResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const data = await response.json().catch(() => ({})) as { error?: string } & T

  if (!response.ok) {
    throw new Error(data?.error || fallbackError)
  }

  return data as T
}

export async function getTenantMemberships(): Promise<TenantMembershipResponse> {
  const response = await fetch('/api/auth/tenants', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  return handleResponse<TenantMembershipResponse>(response, 'Failed to load tenant memberships')
}

export async function updateDefaultTenant(tenantId: string): Promise<UpdateDefaultTenantResponse> {
  const response = await fetch('/api/auth/default-tenant', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ tenantId }),
  })

  return handleResponse<UpdateDefaultTenantResponse>(response, 'Failed to update default tenant')
}

export async function switchTenant(tenantId: string): Promise<SwitchTenantResponse> {
  const response = await fetch('/api/auth/switch-tenant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ tenantId }),
  })

  return handleResponse<SwitchTenantResponse>(response, 'Failed to switch tenant')
}

import { apiClient } from './client'

export interface LoginResponse {
    accessToken: string
    refreshToken: string
    expiresIn: string
    user: any
}

export interface ImpersonateResponse extends LoginResponse { }

export async function impersonateUser(userId: string, tenantId: string): Promise<ImpersonateResponse> {
    const response = await apiClient.post('/auth/impersonate', {
        userId,
        tenantId,
    })
    return response.data
}

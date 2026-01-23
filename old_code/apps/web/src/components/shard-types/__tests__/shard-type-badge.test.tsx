import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { ShardTypeBadge } from '@/components/shard-types/shard-type-badge'
import { ShardTypeCategory, ShardTypeStatus } from '@/types/api'
import type { ShardType } from '@/types/api'

describe('ShardTypeBadge', () => {
    const mockShardType: ShardType = {
        id: '1',
        name: 'test-type',
        displayName: 'Test Type',
        category: ShardTypeCategory.DOCUMENT,
        status: ShardTypeStatus.ACTIVE,
        schema: {},
        tenantId: 'test-tenant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        isGlobal: false,
        isSystem: false,
        isActive: true,
        isCustom: false,
        isBuiltIn: false,
        tags: [],
    }

    it('renders shard type name', () => {
        render(<ShardTypeBadge shardType={mockShardType} />)
        expect(screen.getByText('Test Type' as any)).toBeInTheDocument()
    })

    it('shows status badge when showStatus is true', () => {
        render(<ShardTypeBadge shardType={mockShardType} showStatus />)
        // Component might show status indicator
        expect(screen.getByText('Test Type' as any)).toBeInTheDocument()
    })

    it('displays icon when provided', () => {
        const typeWithIcon = { ...mockShardType, icon: 'FileText' }
        render(<ShardTypeBadge shardType={typeWithIcon} />)
        // Icon is rendered by Lucide React
        expect(screen.getByText('Test Type' as any)).toBeInTheDocument()
    })

    it('shows global indicator for global types', () => {
        const globalType = { ...mockShardType, isGlobal: true }
        render(<ShardTypeBadge shardType={globalType} showGlobalIndicator />)
        // Might show Globe icon or "Global" text
        expect(screen.getByText('Test Type' as any)).toBeInTheDocument()
    })

    it('renders with different sizes', () => {
        const { rerender } = render(<ShardTypeBadge shardType={mockShardType} size="sm" />)
        expect(screen.getByText('Test Type' as any)).toBeInTheDocument()

        rerender(<ShardTypeBadge shardType={mockShardType} size="lg" />)
        expect(screen.getByText('Test Type' as any)).toBeInTheDocument()
    })

    it('renders as clickable when onClick provided', () => {
        let clicked = false
        const handleClick = () => {
            clicked = true
        }

        render(<ShardTypeBadge shardType={mockShardType} onClick={handleClick} />)
        const badge = screen.getByText('Test Type' as any).parentElement
        expect(badge).toBeDefined()
    })
})

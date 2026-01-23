'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface CreateTenantDialogProps {
  onSuccess?: () => void
}

export function CreateTenantDialog({ onSuccess }: CreateTenantDialogProps) {
  const { t } = useTranslation('tenants')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    plan: 'starter',
    adminContactEmail: '',
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          domain: formData.domain || undefined,
          plan: formData.plan,
          adminContactEmail: formData.adminContactEmail || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create tenant')
      }

      toast.success(t('create.success' as any))
      setOpen(false)
      setFormData({
        name: '',
        slug: '',
        domain: '',
        plan: 'starter',
        adminContactEmail: '',
      })
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/tenants/${data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('createTenant' as any)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('create.title' as any)}</DialogTitle>
            <DialogDescription>
              {t('create.description' as any)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">{t('create.name' as any)} *</Label>
              <Input
                id="name"
                placeholder={t('create.namePlaceholder' as any)}
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">{t('edit.slug' as any)} *</Label>
              <Input
                id="slug"
                placeholder="acme-corp"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {t('edit.slugHelp' as any)}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="domain">{t('create.domain' as any)} ({t('common:optional' as any)})</Label>
              <Input
                id="domain"
                placeholder={t('create.domainPlaceholder' as any)}
                value={formData.domain}
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {t('create.domainHelp', 'Users with this email domain can auto-join this tenant.')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="adminEmail">{t('create.adminEmail' as any)} ({t('common:optional' as any)})</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder={t('create.adminEmailPlaceholder' as any)}
                value={formData.adminContactEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, adminContactEmail: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plan">{t('create.plan' as any)}</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('create.selectPlan', 'Select a plan')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">{t('plans.starter' as any)}</SelectItem>
                  <SelectItem value="professional">{t('plans.professional' as any)}</SelectItem>
                  <SelectItem value="enterprise">{t('plans.enterprise' as any)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              {t('common:cancel' as any)}
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('create.creating' as any)}
                </>
              ) : (
                t('create.create' as any)
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


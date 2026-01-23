'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  User,
  Mail,
  Calendar,
  Shield,
  RefreshCw,
} from 'lucide-react'
import {
  useProfile,
  useUpdateProfile,
  type UserProfile,
} from '@/hooks/use-profile'
import { cn } from '@/lib/utils'

// Form schema
const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
})

type ProfileFormData = z.infer<typeof profileFormSchema>

interface PersonalInfoCardProps {
  profile?: UserProfile | null
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  className?: string
}

/**
 * PersonalInfoCard - Widget-compatible personal information card
 * Displays user profile info and allows editing name
 */
export function PersonalInfoCard({
  profile: externalProfile,
  isLoading: externalLoading,
  error: externalError,
  onRefresh: externalRefresh,
  className,
}: PersonalInfoCardProps) {
  // Use internal query if no external data provided
  const {
    data: internalProfile,
    isLoading: internalLoading,
    error: internalError,
    refetch: internalRefetch,
  } = useProfile()

  const profile = externalProfile ?? internalProfile
  const isLoading = externalLoading ?? internalLoading
  const error = externalError ?? internalError
  const onRefresh = externalRefresh ?? internalRefetch

  const updateMutation = useUpdateProfile()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
    },
    values: profile ? {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
    } : undefined,
  })

  const onSubmit = async (data: ProfileFormData) => {
    await updateMutation.mutateAsync(data)
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn(className)}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message || 'An error occurred'}</span>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={() => onRefresh()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!profile) return null

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Update your name and profile details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your first name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your last name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

interface AccountInfoCardProps {
  profile?: UserProfile | null
  isLoading?: boolean
  error?: Error | null
  onRefresh?: () => void
  className?: string
}

/**
 * AccountInfoCard - Widget-compatible account information card
 * Displays read-only account details like email, status, roles
 */
export function AccountInfoCard({
  profile: externalProfile,
  isLoading: externalLoading,
  error: externalError,
  onRefresh: externalRefresh,
  className,
}: AccountInfoCardProps) {
  // Use internal query if no external data provided
  const {
    data: internalProfile,
    isLoading: internalLoading,
    error: internalError,
    refetch: internalRefetch,
  } = useProfile()

  const profile = externalProfile ?? internalProfile
  const isLoading = externalLoading ?? internalLoading
  const error = externalError ?? internalError
  const onRefresh = externalRefresh ?? internalRefetch

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn(className)}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message || 'An error occurred'}</span>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={() => onRefresh()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!profile) return null

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Account Information
        </CardTitle>
        <CardDescription>
          View your account details (read-only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="font-medium">{profile.email}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Display Name</Label>
            <p className="font-medium">{profile.displayName}</p>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Status</Label>
            <div>
              <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
                {profile.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Email Verified</Label>
            <div>
              <Badge variant={profile.emailVerified ? 'default' : 'outline'}>
                {profile.emailVerified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Roles
          </Label>
          <div className="flex gap-2 flex-wrap">
            {profile.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created
            </Label>
            <p className="text-sm">
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last Updated
            </Label>
            <p className="text-sm">
              {new Date(profile.updatedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { profileFormSchema }
export type { ProfileFormData }

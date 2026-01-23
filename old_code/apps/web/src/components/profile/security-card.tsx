'use client'

import { useState } from 'react'
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
  FormDescription,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Lock,
  Shield,
  Smartphone,
  Key,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useChangePassword } from '@/hooks/use-profile'
import { useMFAMethods } from '@/hooks/use-mfa'
import { cn } from '@/lib/utils'

// Password change schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type PasswordFormData = z.infer<typeof passwordSchema>

interface SecurityCardProps {
  className?: string
}

/**
 * SecurityCard - Widget-compatible security settings card
 * Displays MFA status and allows password changes
 */
export function SecurityCard({ className }: SecurityCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { data: mfaMethods, isLoading: mfaLoading } = useMFAMethods()
  const changePasswordMutation = useChangePassword()

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: PasswordFormData) => {
    await changePasswordMutation.mutateAsync(data)
    setDialogOpen(false)
    form.reset()
  }

  const hasMFA = mfaMethods && mfaMethods.methods && mfaMethods.methods.length > 0
  const mfaEnabled = mfaMethods?.methods?.some((m) => m.status === 'active') ?? false

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Settings
        </CardTitle>
        <CardDescription>
          Manage your password and two-factor authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Password Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  Keep your account secure with a strong password
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and choose a new one
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showCurrentPassword ? 'text' : 'password'}
                                placeholder="Enter current password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="Enter new password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Must be 8+ characters with uppercase, lowercase, number, and special character
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm new password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={changePasswordMutation.isPending}>
                        {changePasswordMutation.isPending && (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Separator />

        {/* MFA Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                mfaEnabled ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
              )}>
                <Smartphone className={cn(
                  "h-4 w-4",
                  mfaEnabled ? "text-green-600 dark:text-green-400" : ""
                )} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Two-Factor Authentication</p>
                  {mfaLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : mfaEnabled ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Disabled
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/settings?tab=security">
                {mfaEnabled ? 'Manage' : 'Set Up'}
              </a>
            </Button>
          </div>

          {mfaEnabled && mfaMethods?.methods && (
            <div className="ml-11 space-y-2">
              {mfaMethods.methods.map((method, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>
                    {method.type === 'totp' ? 'Authenticator App' :
                     method.type === 'sms' ? 'SMS' :
                     method.type === 'email' ? 'Email' :
                     method.type}
                  </span>
                  {method.enrolledAt && (
                    <span className="text-xs">
                      (added {new Date(method.enrolledAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Security Tips */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Tips:</strong>
            <ul className="mt-2 list-disc list-inside text-sm space-y-1">
              <li>Use a unique password you don&apos;t use elsewhere</li>
              <li>Enable two-factor authentication for extra security</li>
              <li>Review your active sessions regularly</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

export { passwordSchema }
export type { PasswordFormData }

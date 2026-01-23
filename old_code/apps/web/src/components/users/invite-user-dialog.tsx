"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import { Loader2, Plus, ShieldCheck, UsersRound, Wallet, X } from "lucide-react"
import { useState } from "react"
import { SYSTEM_PERMISSIONS } from "@castiel/shared-types"
import { usePermissionCheck } from "@/hooks/use-permission-check"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/forms/form-field-wrapper"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useInviteUser } from "@/hooks/use-users"

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  message: z.string().max(500, "Message must be under 500 characters").optional(),
  roles: z.array(z.string()),
  rolesPreset: z.string().optional(),
  expiryDays: z.number().int().min(1).max(30),
}).superRefine((data, ctx) => {
  if ((!data.roles || data.roles.length === 0) && !data.rolesPreset) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['roles'],
      message: 'Select a role preset or add at least one custom role',
    })
  }
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteUserDialog({
  open,
  onOpenChange,
}: InviteUserDialogProps) {
  const { t } = useTranslation('users')
  const inviteUser = useInviteUser()
  const canInvite = usePermissionCheck(SYSTEM_PERMISSIONS.USERS.INVITE)

  const ROLE_PRESETS = [
    {
      id: 'member',
      label: t('invite.roles.member', 'Member'),
      description: t('invite.roles.memberDesc', 'Standard access for day-to-day work'),
      icon: UsersRound,
    },
    {
      id: 'admin',
      label: t('invite.roles.admin', 'Admin'),
      description: t('invite.roles.adminDesc', 'Manage users, roles, and settings'),
      icon: ShieldCheck,
    },
    {
      id: 'billing_admin',
      label: t('invite.roles.billingAdmin', 'Billing Admin'),
      description: t('invite.roles.billingAdminDesc', 'Manage billing profiles and invoices'),
      icon: Wallet,
    },
  ]
  const [roleInput, setRoleInput] = useState("")

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      message: "",
      roles: [],
      rolesPreset: 'member',
      expiryDays: 7,
    },
  })

  const currentRoles = form.watch("roles")
  const selectedPreset = form.watch('rolesPreset')

  const addRole = () => {
    if (roleInput && !currentRoles.includes(roleInput)) {
      form.setValue("roles", [...currentRoles, roleInput], {
        shouldValidate: true,
        shouldDirty: true,
      })
      setRoleInput("")
    }
  }

  const removeRole = (role: string) => {
    form.setValue(
      "roles",
      currentRoles.filter((r) => r !== role),
      {
        shouldValidate: true,
        shouldDirty: true,
      }
    )
  }

  const onSubmit = async (data: InviteFormData) => {
    const expiresAt = new Date(Date.now() + data.expiryDays * 24 * 60 * 60 * 1000).toISOString()
    await inviteUser.mutateAsync({
      email: data.email,
      message: data.message,
      roles: data.roles.length ? data.roles : undefined,
      rolesPreset: data.rolesPreset,
      expiresAt,
    })
    form.reset()
    setRoleInput("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('invite.title' as any)}</DialogTitle>
          <DialogDescription>
            {t('invite.description' as any)}
          </DialogDescription>
        </DialogHeader>
        {!canInvite ? (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Permission Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to invite users. Please contact your administrator.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormFieldWrapper control={form.control} name="email" label={t('invite.email' as any)}>
                {(field) => (
                  <Input {...field} type="email" placeholder={t('invite.emailPlaceholder' as any)} />
                )}
              </FormFieldWrapper>

              <FormFieldWrapper control={form.control} name="message" label={t('invite.message' as any)}>
                {(field) => (
                  <Textarea
                    {...field}
                    placeholder={t('invite.messagePlaceholder' as any)}
                    rows={3}
                  />
                )}
              </FormFieldWrapper>

              <div className="space-y-2">
                <Label>{t('invite.role' as any)}</Label>
                <div className="grid gap-2">
                  {ROLE_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant={selectedPreset === preset.id ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => form.setValue('rolesPreset', preset.id, { shouldValidate: true })}
                    >
                      <preset.icon className="mr-2 h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">{preset.label}</div>
                        <p className="text-xs text-muted-foreground">{preset.description}</p>
                      </div>
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={selectedPreset ? 'outline' : 'default'}
                    onClick={() => form.setValue('rolesPreset', undefined, { shouldValidate: true })}
                  >
                    {t('invite.useCustomRoles', 'Use custom roles')}
                  </Button>
                </div>

                {!selectedPreset && (
                  <p className="text-sm text-muted-foreground">
                    {t('invite.customRolesHint', "Add at least one custom role below if you're not using a preset.")}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-2">
                  {currentRoles.map((role) => (
                    <Badge key={role} variant="secondary" className="px-2 py-1">
                      {role}
                      <button
                        type="button"
                        onClick={() => removeRole(role)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {currentRoles.length === 0 && (
                    <span className="text-sm text-muted-foreground">{t('invite.noRoles', 'No roles assigned')}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder={t('invite.customRolePlaceholder', 'Custom role name...')}
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addRole()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={addRole}
                    disabled={!roleInput}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('invite.addRoleHint', 'Press Enter or click + to add a custom role')}
                </p>
                {form.formState.errors.roles && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.roles.message?.toString() ||
                      t('invite.selectRoleError', 'Select a preset or add at least one role')}
                  </p>
                )}
              </div>

              <FormFieldWrapper control={form.control} name="expiryDays" label={t('invite.expiryDays', 'Invitation Expiry (days)')}>
                {(field) => (
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    max={30}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                  />
                )}
              </FormFieldWrapper>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset()
                    setRoleInput("")
                    onOpenChange(false)
                  }}
                  disabled={inviteUser.isPending}
                >
                  {t('common:cancel' as any)}
                </Button>
                <Button type="submit" disabled={inviteUser.isPending}>
                  {inviteUser.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t('invite.send' as any)}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

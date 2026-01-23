"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser, useUpdateUser } from "@/hooks/use-users"
import { UserForm } from "@/components/users/user-form"
import { ExternalUserIdsSection } from "@/components/users/external-user-ids-section"
import { UpdateUserDto } from "@/types/api"

interface EditUserPageProps {
  params: Promise<{ id: string }>
}

function getUserDisplayName(user: { firstName?: string; lastName?: string; email: string }): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) return user.firstName
  if (user.lastName) return user.lastName
  return user.email.split('@' as any)[0]
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const { t } = useTranslation('users')
  const { id } = use(params)
  const router = useRouter()
  const { data: user, isLoading: userLoading } = useUser(id)
  const updateUser = useUpdateUser()

  const handleSubmit = async (data: UpdateUserDto) => {
    try {
      await updateUser.mutateAsync({ id, data })
      toast.success(t('edit.success' as any))
      router.push(`/users/${id}`)
    } catch (error) {
      // Error handled by the mutation
    }
  }

  const handleCancel = () => {
    router.push(`/users/${id}`)
  }

  if (userLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
        <h2 className="text-2xl font-semibold">{t('edit.userNotFound' as any)}</h2>
        <Button onClick={() => router.push("/users")}>{t('edit.backToUsers' as any)}</Button>
      </div>
    )
  }

  const displayName = getUserDisplayName(user)

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/users/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('edit.title' as any)}</h1>
          <p className="text-muted-foreground">{t('edit.subtitle' as any, { name: displayName })}</p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('edit.userInfo' as any)}</CardTitle>
          <CardDescription>
            {t('edit.userInfoDesc' as any)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            initialData={{
              firstName: user.firstName,
              lastName: user.lastName,
              roles: user.roles || [],
              metadata: user.metadata,
            }}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={updateUser.isPending}
          />
        </CardContent>
      </Card>

      {/* External User IDs Section */}
      <ExternalUserIdsSection userId={id} />
    </div>
  )
}

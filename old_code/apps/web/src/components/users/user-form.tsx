"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { UpdateUserDto } from "@/types/api"

const userFormSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  roles: z.array(z.string()).min(1, "At least one role is required"),
  metadata: z.record(z.string(), z.any()).optional(),
})

type UserFormData = z.infer<typeof userFormSchema>

interface UserFormProps {
  initialData?: Partial<UserFormData>
  onSubmit: (data: UpdateUserDto) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: UserFormProps) {
  const [roleInput, setRoleInput] = useState("")
  const [metadataKey, setMetadataKey] = useState("")
  const [metadataValue, setMetadataValue] = useState("")

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      roles: initialData?.roles || [],
      metadata: initialData?.metadata || {},
    },
  })

  const addRole = (role: string) => {
    const trimmedRole = role.trim().toLowerCase()
    if (trimmedRole && !form.getValues("roles").includes(trimmedRole)) {
      form.setValue("roles", [...form.getValues("roles"), trimmedRole])
    }
    setRoleInput("")
  }

  const removeRole = (roleToRemove: string) => {
    form.setValue(
      "roles",
      form.getValues("roles").filter((r) => r !== roleToRemove)
    )
  }

  const addMetadata = () => {
    const key = metadataKey.trim()
    const value = metadataValue.trim()
    if (key && value) {
      form.setValue("metadata", {
        ...form.getValues("metadata"),
        [key]: value,
      })
      setMetadataKey("")
      setMetadataValue("")
    }
  }

  const removeMetadata = (keyToRemove: string) => {
    const newMetadata = { ...form.getValues("metadata") }
    delete newMetadata[keyToRemove]
    form.setValue("metadata", newMetadata)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} disabled={isLoading} />
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
                  <Input placeholder="Doe" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Roles */}
        <FormField
          control={form.control}
          name="roles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Roles</FormLabel>
              <FormDescription>
                Assign roles to define user permissions
              </FormDescription>
              <div className="space-y-3">
                {/* Current Roles */}
                {field.value.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.value.map((role) => (
                      <Badge key={role} variant="secondary" className="gap-1">
                        {role}
                        <button
                          type="button"
                          onClick={() => removeRole(role)}
                          disabled={isLoading}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Quick Add Buttons */}
                <div className="flex flex-wrap gap-2">
                  {["admin", "user", "editor", "viewer"].map((role) => (
                    <Button
                      key={role}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addRole(role)}
                      disabled={field.value.includes(role) || isLoading}
                    >
                      + {role}
                    </Button>
                  ))}
                </div>

                {/* Custom Role Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Custom role name"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addRole(roleInput)
                      }
                    }}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addRole(roleInput)}
                    disabled={isLoading}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Metadata */}
        <FormField
          control={form.control}
          name="metadata"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metadata</FormLabel>
              <FormDescription>
                Store custom key-value pairs for this user
              </FormDescription>
              <div className="space-y-3">
                {/* Current Metadata */}
                {field.value && Object.keys(field.value).length > 0 && (
                  <div className="rounded-lg border p-3 space-y-2">
                    {Object.entries(field.value).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground flex-1 truncate">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMetadata(key)}
                          disabled={isLoading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Metadata */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Key"
                    value={metadataKey}
                    onChange={(e) => setMetadataKey(e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={metadataValue}
                    onChange={(e) => setMetadataValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addMetadata()
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addMetadata}
                    disabled={isLoading}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update" : "Create"} User
          </Button>
        </div>
      </form>
    </Form>
  )
}

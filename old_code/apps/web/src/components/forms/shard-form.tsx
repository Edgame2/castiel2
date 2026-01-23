"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { FormFieldWrapper } from "./form-field-wrapper"
import { createShardSchema, CreateShardFormData } from "@/lib/validations/shard"
import { JsonEditor } from "@/components/json-editor"
import { FileUpload } from "@/components/file-upload"

interface ShardFormProps {
  initialData?: Partial<CreateShardFormData>
  shardTypes: Array<{ id: string; name: string }>
  onSubmit: (data: CreateShardFormData & { files?: File[] }) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  existingAttachments?: Array<{ name: string; url: string }>
}

export function ShardForm({
  initialData,
  shardTypes,
  onSubmit,
  onCancel,
  isLoading,
  existingAttachments = [],
}: ShardFormProps) {
  const [unstructuredData, setUnstructuredData] = useState<any>(
    initialData?.unstructuredData || {}
  )
  const [files, setFiles] = useState<File[]>([])

  const form = useForm<CreateShardFormData>({
    resolver: zodResolver(createShardSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      shardTypeId: initialData?.shardTypeId || "",
      content: initialData?.content || "",
      tags: initialData?.tags || [],
      isPublic: initialData?.isPublic || false,
      unstructuredData: initialData?.unstructuredData || {},
    },
  })

  const handleFormSubmit = async (data: CreateShardFormData) => {
    // Include the unstructured data from the JSON editor and files
    await onSubmit({
      ...data,
      unstructuredData,
      files,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormFieldWrapper
          control={form.control}
          name="name"
          label="Name"
          description="A unique name for this shard"
        >
          {(field) => (
            <Input placeholder="Enter shard name" {...field} disabled={isLoading} />
          )}
        </FormFieldWrapper>

        <FormFieldWrapper
          control={form.control}
          name="shardTypeId"
          label="Shard Type"
          description="Select the type of shard to create"
        >
          {(field) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a shard type" />
              </SelectTrigger>
              <SelectContent>
                {shardTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormFieldWrapper>

        <FormFieldWrapper
          control={form.control}
          name="description"
          label="Description"
          description="Optional description of the shard"
        >
          {(field) => (
            <Textarea
              placeholder="Enter description"
              className="resize-none"
              disabled={isLoading}
              {...field}
            />
          )}
        </FormFieldWrapper>

        <FormFieldWrapper
          control={form.control}
          name="content"
          label="Content"
          description="The main content of the shard"
        >
          {(field) => (
            <Textarea
              placeholder="Enter content"
              className="min-h-[200px]"
              disabled={isLoading}
              {...field}
            />
          )}
        </FormFieldWrapper>

        <FormFieldWrapper
          control={form.control}
          name="isPublic"
          label="Public"
          description="Make this shard accessible to all users"
        >
          {(field) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isLoading}
              />
              <span className="text-sm text-muted-foreground">
                {field.value ? "This shard is public" : "This shard is private"}
              </span>
            </div>
          )}
        </FormFieldWrapper>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Attachments (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              Upload files to attach to this shard (images, documents, etc.)
            </p>
          </div>
          <FileUpload
            onFilesChange={setFiles}
            maxFiles={10}
            maxSizeMB={10}
            existingFiles={existingAttachments}
          />
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Unstructured Data (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              Add any additional JSON data that doesn't fit the shard type schema
            </p>
          </div>
          <JsonEditor
            value={unstructuredData}
            onChange={setUnstructuredData}
            height="300px"
            title="Additional JSON Data"
            description="This data will be stored alongside the shard's structured data"
          />
        </div>

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
            {initialData ? "Update" : "Create"} Shard
          </Button>
        </div>
      </form>
    </Form>
  )
}

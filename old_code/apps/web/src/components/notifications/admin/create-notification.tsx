"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useUsers } from "@/hooks/use-users";
import { UserPicker } from "@/components/ui/user-picker";
import { notificationApi } from "@/lib/api/notifications";
import { toast } from "sonner";
import type { NotificationType, NotificationTargetType, NotificationPriority } from "@/types/notification";

const createNotificationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["success", "error", "warning", "information", "alert"]),
  link: z.string().url("Invalid URL").optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]).optional(),
  targetType: z.enum(["user", "all_tenant", "all_system"]),
  targetUserIds: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.targetType === "user") {
    return data.targetUserIds && data.targetUserIds.length > 0;
  }
  return true;
}, {
  message: "Please select at least one user",
  path: ["targetUserIds"],
});

type CreateNotificationFormData = z.infer<typeof createNotificationSchema>;

interface CreateNotificationProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function CreateNotification({ onSuccess, trigger }: CreateNotificationProps) {
  const { t } = useTranslation("notifications");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const form = useForm<CreateNotificationFormData>({
    resolver: zodResolver(createNotificationSchema),
    defaultValues: {
      name: "",
      content: "",
      type: "information",
      link: "",
      priority: "medium",
      targetType: "user",
      targetUserIds: [],
    },
    mode: "onChange",
  });

  const targetType = form.watch("targetType");

  const onSubmit = async (data: CreateNotificationFormData) => {
    try {
      setLoading(true);

      await notificationApi.createAdminNotification({
        name: data.name,
        content: data.content,
        type: data.type,
        link: data.link || undefined,
        priority: data.priority,
        targetType: data.targetType,
        targetUserIds: data.targetType === "user" ? data.targetUserIds : undefined,
      });

      toast.success(t("admin.form.success" as any) || "Notification sent successfully");

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || t("admin.form.error" as any) || "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            {t("admin.createNotification" as any)}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.createNotification" as any)}</DialogTitle>
          <DialogDescription>
            Create and send notifications to users
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.form.name" as any)}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("admin.form.namePlaceholder" as any)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.form.content" as any)}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("admin.form.contentPlaceholder" as any)}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.form.type" as any)}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="success">{t("types.success" as any)}</SelectItem>
                        <SelectItem value="error">{t("types.error" as any)}</SelectItem>
                        <SelectItem value="warning">{t("types.warning" as any)}</SelectItem>
                        <SelectItem value="information">{t("types.information" as any)}</SelectItem>
                        <SelectItem value="alert">{t("types.alert" as any)}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.form.priority" as any)}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t("priority.low" as any)}</SelectItem>
                        <SelectItem value="medium">{t("priority.medium" as any)}</SelectItem>
                        <SelectItem value="high">{t("priority.high" as any)}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.form.link" as any)}</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder={t("admin.form.linkPlaceholder" as any)}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional link to include in the notification
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.form.targetType" as any)}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="user" id="target-user" />
                        <Label htmlFor="target-user" className="cursor-pointer">
                          {t("admin.targetType.user" as any)}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all_tenant" id="target-tenant" />
                        <Label htmlFor="target-tenant" className="cursor-pointer">
                          {t("admin.targetType.all_tenant" as any)}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all_system" id="target-system" />
                        <Label htmlFor="target-system" className="cursor-pointer">
                          {t("admin.targetType.all_system" as any)}
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {targetType === "user" && (
              <FormField
                control={form.control}
                name="targetUserIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.form.targetUsers" as any)}</FormLabel>
                    <FormControl>
                      <UserPicker
                        value={field.value || []}
                        onChange={(value) => {
                          const ids = Array.isArray(value) ? value : value ? [value] : [];
                          field.onChange(ids);
                        }}
                        multiple
                        placeholder={t("admin.form.targetUsers" as any)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t("admin.form.sending" as any) : t("admin.form.submit" as any)}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}








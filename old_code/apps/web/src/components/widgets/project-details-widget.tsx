"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Pencil, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { shardApi } from "@/lib/api/shards"
import { Project } from "@/types/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

const projectFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    status: z.enum(["planned", "active", "on_hold", "completed", "cancelled"]),
    priority: z.enum(["low", "medium", "high", "critical"]),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

interface ProjectDetailsWidgetProps {
    project: Project
    className?: string
}

export function ProjectDetailsWidget({ project, className }: ProjectDetailsWidgetProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(projectFormSchema),
        defaultValues: {
            name: project.structuredData.name || project.name,
            description: project.structuredData.description || project.description || "",
            status: project.structuredData.status as any || "planned",
            priority: project.structuredData.priority as any || "medium",
            startDate: project.structuredData.startDate ? new Date(project.structuredData.startDate) : undefined,
            endDate: project.structuredData.endDate ? new Date(project.structuredData.endDate) : undefined,
        },
    })

    async function onSubmit(data: ProjectFormValues) {
        setIsLoading(true)
        try {
            await shardApi.updateShard(project.id, {
                name: data.name,
                description: data.description,
                structuredData: {
                    ...project.structuredData,
                    name: data.name,
                    description: data.description,
                    status: data.status,
                    priority: data.priority,
                    startDate: data.startDate,
                    endDate: data.endDate,
                },
            })

            toast.success("Project updated successfully")
            setIsEditing(false)
            router.refresh()
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to update project", 3, {
                errorMessage: errorObj.message,
                projectId: project.id,
            })
            toast.error("Failed to update project")
        } finally {
            setIsLoading(false)
        }
    }

    if (isEditing) {
        return (
            <Card className={className}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Edit Project Details</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Project Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter project name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe the project..."
                                                className="resize-none"
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
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="planned">Planned</SelectItem>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="on_hold">On Hold</SelectItem>
                                                    <SelectItem value="completed">Completed</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
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
                                            <FormLabel>Priority</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select priority" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                    <SelectItem value="critical">Critical</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Start Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>End Date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Project Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold">{project.structuredData.name || project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.structuredData.description || project.description || "No description provided."}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Status</p>
                        <Badge variant={project.structuredData.status === "active" ? "default" : "secondary"} className="mt-1">
                            {project.structuredData.status || "Unknown"}
                        </Badge>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Priority</p>
                        <p className="text-sm font-medium capitalize mt-1">{project.structuredData.priority || "Medium"}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">Start Date</p>
                        <p className="text-sm font-medium mt-1">
                            {project.structuredData.startDate ? format(new Date(project.structuredData.startDate), "MMM d, yyyy") : "-"}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">End Date</p>
                        <p className="text-sm font-medium mt-1">
                            {project.structuredData.endDate ? format(new Date(project.structuredData.endDate), "MMM d, yyyy") : "-"}
                        </p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">Owner</p>
                        <p className="text-sm font-medium mt-1">{project.structuredData.ownerName || "Unknown"}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

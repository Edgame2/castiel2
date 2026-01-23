"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { shardApi, shardTypeApi } from "@/lib/api/shards"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

const projectFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    status: z.enum(["planned", "active", "on_hold", "completed", "cancelled"]),
    priority: z.enum(["low", "medium", "high", "critical"]),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    tags: z.string().optional(), // Comma separated string for input
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

export function ProjectCreateWidget({ className }: { className?: string }) {
    const router = useRouter()
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [projectTypeId, setProjectTypeId] = useState<string | null>(null)

    useEffect(() => {
        const fetchProjectType = async () => {
            try {
                const types = await shardTypeApi.getShardTypes()
                const projectType = types.find((t) => t.name === "c_project")
                if (projectType) {
                    setProjectTypeId(projectType.id)
                } else {
                    toast.error("Project shard type not found")
                }
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error))
                trackException(errorObj, 3)
                trackTrace("Failed to fetch shard types in project-create-widget", 3, {
                    errorMessage: errorObj.message,
                })
                toast.error("Failed to load project configuration")
            }
        }
        fetchProjectType()
    }, [])

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(projectFormSchema),
        defaultValues: {
            name: "",
            description: "",
            status: "planned",
            priority: "medium",
            tags: "",
        },
    })

    async function onSubmit(data: ProjectFormValues) {
        if (!projectTypeId || !user) return

        setIsLoading(true)
        try {
            const tagsArray = data.tags
                ? data.tags.split("," as any).map((t) => t.trim()).filter(Boolean)
                : []

            await shardApi.createShard({
                name: data.name,
                description: data.description,
                shardTypeId: projectTypeId,
                tags: tagsArray,
                structuredData: {
                    name: data.name,
                    description: data.description,
                    status: data.status,
                    priority: data.priority,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    ownerId: user.id,
                    ownerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                    teamMembers: [{
                        id: user.id,
                        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                        email: user.email,
                        avatarUrl: user.avatarUrl
                    }],
                },
                isPublic: false,
            })

            toast.success("Project created successfully")
            router.push("/projects") // Assuming a projects list page exists, or maybe just refresh
            router.refresh()
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to create project", 3, {
                errorMessage: errorObj.message,
                projectName: data.name,
            })
            toast.error("Failed to create project")
        } finally {
            setIsLoading(false)
        }
    }

    if (!projectTypeId) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className={cn("grid gap-6", className)}>
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

                    <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tags</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter tags separated by commas"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Separate tags with commas (e.g. "urgent, frontend, q1")
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Project
                    </Button>
                </form>
            </Form>
        </div>
    )
}

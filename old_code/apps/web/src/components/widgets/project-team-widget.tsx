"use client"

import { useState } from "react"
import { Plus, Trash2, User as UserIcon, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { shardApi } from "@/lib/api/shards"
import { userApi } from "@/lib/api/users"
import { Project, User } from "@/types/api"
import { toast } from "sonner"
import { useEffect } from "react"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface ProjectTeamWidgetProps {
    project: Project
    className?: string
}

export function ProjectTeamWidget({ project, className }: ProjectTeamWidgetProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<User[]>([])
    const [isSearching, setIsSearching] = useState(false)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery) {
                setSearchResults([])
                return
            }

            setIsSearching(true)
            try {
                const response = await userApi.getUsers({
                    search: searchQuery,
                    limit: 5,
                })
                // Filter out existing team members
                const existingIds = new Set(project.structuredData.teamMembers?.map(m => m.id) || [])
                setSearchResults(response.users.filter(u => !existingIds.has(u.id)))
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error))
                trackException(errorObj, 3)
                trackTrace("Failed to search users in project-team-widget", 3, {
                    errorMessage: errorObj.message,
                    searchQuery,
                })
            } finally {
                setIsSearching(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, project.structuredData.teamMembers])

    const addMember = async (user: User) => {
        try {
            const newMember = {
                id: user.id,
                name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
                email: user.email,
                avatarUrl: undefined, // User type doesn't have avatarUrl
            }

            const updatedTeam = [...(project.structuredData.teamMembers || []), newMember]

            await shardApi.updateShard(project.id, {
                structuredData: {
                    ...project.structuredData,
                    teamMembers: updatedTeam,
                },
            })

            toast.success(`${newMember.name} added to the team`)
            setOpen(false)
            setSearchQuery("")
            router.refresh()
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to add team member", 3, {
                errorMessage: errorObj.message,
                projectId: project.id,
                userId: user.id,
            })
            toast.error("Failed to add team member")
        }
    }

    const removeMember = async (memberId: string) => {
        try {
            const updatedTeam = (project.structuredData.teamMembers || []).filter(m => m.id !== memberId)

            await shardApi.updateShard(project.id, {
                structuredData: {
                    ...project.structuredData,
                    teamMembers: updatedTeam,
                },
            })

            toast.success("Team member removed")
            router.refresh()
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to remove team member", 3, {
                errorMessage: errorObj.message,
                projectId: project.id,
                memberId,
            })
            toast.error("Failed to remove team member")
        }
    }

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="end">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Search users..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {isSearching ? "Searching..." : "No users found."}
                                </CommandEmpty>
                                <CommandGroup>
                                    {searchResults.map((user) => (
                                        <CommandItem
                                            key={user.id}
                                            onSelect={() => addMember(user)}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={undefined} />
                                                <AvatarFallback>
                                                    {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {(project.structuredData.teamMembers || []).map((member) => (
                        <div key={member.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.avatarUrl} />
                                    <AvatarFallback>
                                        {member.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{member.name}</span>
                                    <span className="text-xs text-muted-foreground">{member.email}</span>
                                </div>
                            </div>
                            {project.structuredData.ownerId !== member.id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeMember(member.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {(!project.structuredData.teamMembers || project.structuredData.teamMembers.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No team members yet.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

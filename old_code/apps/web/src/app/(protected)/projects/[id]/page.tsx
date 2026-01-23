"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ProjectDetailsWidget } from "@/components/widgets/project-details-widget"
import { ProjectTeamWidget } from "@/components/widgets/project-team-widget"
import { ProjectLinkedShardsWidget } from "@/components/widgets/project-linked-shards-widget"
import { ProjectChatWidget } from "@/components/widgets/project-chat-widget"
import { ProjectAnalyticsWidget } from "@/components/widgets/project-analytics-widget"
import { shardApi } from "@/lib/api/shards"
import { Project } from "@/types/api"
import { toast } from "sonner"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

import { GenerationWizard } from "@/components/content/generation-wizard"
import { DocumentUploadModal } from "@/components/documents/DocumentUploadModal"
import { shardLinkingApi } from "@/lib/api/shard-linking"
import { LinkRelationshipType } from "@/types/shard-linking"
import { Document } from "@/types/documents"

export default function ProjectViewPage() {
    const params = useParams()
    const router = useRouter()
    const [project, setProject] = useState<Project | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isWizardOpen, setIsWizardOpen] = useState(false)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

    const fetchProject = async () => {
        if (!params.id) return

        setIsLoading(true)
        try {
            const data = await shardApi.getShard(params.id as string)
            
            // Verify this is actually a project shard
            if (data.shardTypeId !== 'c_project' && data.shardTypeName !== 'c_project') {
                toast.error(`This page is for projects only. The selected item is a ${data.shardTypeName || data.shardTypeId || 'different type'}.`)
                router.push("/projects")
                return
            }
            
            // Type guard or assertion could be better, but for now casting
            setProject(data as Project)
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to fetch project", 3, {
                errorMessage: errorObj.message,
                projectId: params.id,
            })
            toast.error("Failed to load project")
            router.push("/projects")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchProject()
    }, [params.id, router])

    const handleUploadSuccess = async (uploadedDocs: any[]) => {
        if (!project) return

        try {
            // 1. Link Documents to Project (Update Project)
            const currentPrjRels = project.internal_relationships || []
            const newPrjRels = uploadedDocs.map(doc => ({
                shardId: doc.id,
                shardTypeId: doc.shardTypeId,
                shardTypeName: doc.shardTypeName || "Document",
                shardName: doc.name || (doc.structuredData as any)?.name || "Untitled",
                createdAt: new Date().toISOString()
            }))

            // Avoid duplicates
            const uniqueNewRels = newPrjRels.filter(nr => !currentPrjRels.some(cr => cr.shardId === nr.shardId))

            if (uniqueNewRels.length > 0) {
                await shardApi.updateShard(project.id, {
                    internal_relationships: [...currentPrjRels, ...uniqueNewRels]
                })
            }

            // 2. Link Project to Documents (Update uploaded docs)
            // Each doc needs to know about the project
            const projectRel = {
                shardId: project.id,
                shardTypeId: project.shardTypeId,
                shardTypeName: project.shardTypeName || "Project",
                shardName: project.name || (project.structuredData as any)?.name || "Untitled",
                createdAt: new Date().toISOString()
            }

            await Promise.all(uploadedDocs.map(doc =>
                shardApi.updateShard(doc.id, {
                    internal_relationships: [projectRel] // Assuming new docs create fresh list
                })
            ))

            toast.success(`Uploaded and linked ${uploadedDocs.length} document(s)`)

            // Refresh project data to show new links
            await fetchProject()

        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to link documents", 3, {
                errorMessage: errorObj.message,
                projectId: project.id,
                documentCount: uploadedDocs.length,
            })
            toast.error("Documents uploaded but failed to link to project")
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!project) {
        return null // Redirect handled in useEffect
    }

    return (
        <div className="space-y-6 p-10 pb-16 md:block">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/projects">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{project.structuredData.name || project.name}</h2>
                        <p className="text-muted-foreground">
                            Project Dashboard
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>
                        Upload Document
                    </Button>
                    <Button onClick={() => setIsWizardOpen(true)}>
                        Generate Document
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Main Details - Spans 2 columns on large screens */}
                <ProjectDetailsWidget project={project} className="col-span-1 md:col-span-2 lg:col-span-2" />

                {/* Team Widget */}
                <ProjectTeamWidget project={project} className="col-span-1" />

                {/* Project Analytics - Spans 2 columns */}
                <ProjectAnalyticsWidget project={project} className="col-span-1 md:col-span-2" />

                {/* Linked Shards - Spans 2 columns */}
                <ProjectLinkedShardsWidget
                    project={project}
                    className="col-span-1 md:col-span-2"
                    onProjectUpdate={fetchProject}
                />

                {/* Chat Widget - Spans 1 column but tall */}
                <ProjectChatWidget project={project} className="col-span-1 row-span-2" />
            </div>

            <GenerationWizard
                open={isWizardOpen}
                onOpenChange={setIsWizardOpen}
                projectId={project.id}
                projectName={project.structuredData.name || project.name}
            />

            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
                onUploadSuccess={handleUploadSuccess}
                projectId={project.id}
            />
        </div>
    )
}

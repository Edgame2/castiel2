import { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ProjectListWidget } from "@/components/widgets/project-list-widget"

export const metadata: Metadata = {
    title: "Projects",
    description: "Manage your projects.",
}

export default function ProjectsPage() {
    return (
        <div className="space-y-6 p-10 pb-16 md:block">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
                    <p className="text-muted-foreground">
                        Manage your projects and track progress.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href="/projects/new">
                            <Plus className="mr-2 h-4 w-4" />
                            New Project
                        </Link>
                    </Button>
                </div>
            </div>
            <Separator className="my-6" />
            <ProjectListWidget />
        </div>
    )
}

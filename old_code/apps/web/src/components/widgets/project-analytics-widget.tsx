"use client"

import { useState, useEffect } from "react"
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Target, Users, DollarSign, Calendar, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { Project } from "@/types/api"
import { 
  getProjectAnalytics, 
  type ProjectAnalyticsSummary,
  type ProjectHealthScore,
  type PredictiveCompletion,
  type ResourceOptimization
} from "@/lib/api/project-analytics"
import { toast } from "sonner"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface ProjectAnalyticsWidgetProps {
  project: Project
  className?: string
}

export function ProjectAnalyticsWidget({ project, className }: ProjectAnalyticsWidgetProps) {
  const [analytics, setAnalytics] = useState<ProjectAnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Check if this is actually a project before fetching analytics
      if (project.shardTypeId !== 'c_project' && project.shardTypeName !== 'c_project') {
        setError(
          `Analytics are only available for projects. ` +
          `This shard is of type '${project.shardTypeName || project.shardTypeId || 'unknown'}'. ` +
          `Please use a project shard to view analytics.`
        )
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const data = await getProjectAnalytics(project.id, {
          includeHistory: true,
          includePredictions: true,
          includeOptimization: true,
        })
        setAnalytics(data)
      } catch (err) {
        // Extract a more user-friendly error message
        let errorMessage = "Failed to load analytics"
        if (err instanceof Error) {
          errorMessage = err.message
          // Check for the specific "not found" error with shard type mismatch
          if (err.message.includes("shard with this ID exists but is of type")) {
            errorMessage = 
              "This item is not a project. Project analytics can only be generated for project shards. " +
              "Please navigate to a project to view analytics."
          } else if (err.message.includes("Project not found")) {
            errorMessage = 
              "Project not found. The project may not exist, or you may not have access to it."
          }
        }
        setError(errorMessage)
        const errorObj = err instanceof Error ? err : new Error(String(err))
        trackException(errorObj, 3)
        trackTrace("Failed to fetch project analytics", 3, {
          errorMessage: errorObj.message,
          projectId: project.id,
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (project.id) {
      fetchAnalytics()
    }
  }, [project.id, project.shardTypeId, project.shardTypeName])

  if (isLoading) {
    return (
      <Card className={cn("col-span-1 md:col-span-2", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Project Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !analytics) {
    return (
      <Card className={cn("col-span-1 md:col-span-2", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Project Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || "Failed to load project analytics"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("col-span-1 md:col-span-2", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Project Analytics
        </CardTitle>
        <CardDescription>Health score, predictions, and optimization recommendations</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="health" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="completion">Completion</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-4 mt-4">
            {analytics.healthScore ? (
              <HealthScoreTab healthScore={analytics.healthScore} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Health score data not available
              </div>
            )}
          </TabsContent>

          <TabsContent value="completion" className="space-y-4 mt-4">
            {analytics.predictiveCompletion ? (
              <PredictiveCompletionTab completion={analytics.predictiveCompletion} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Predictive completion data not available
              </div>
            )}
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4 mt-4">
            {analytics.resourceOptimization ? (
              <ResourceOptimizationTab optimization={analytics.resourceOptimization} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Resource optimization data not available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function HealthScoreTab({ healthScore }: { healthScore: ProjectHealthScore }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <TrendingUp className="h-4 w-4" />
      case 'at_risk':
        return <AlertTriangle className="h-4 w-4" />
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return null
    }
  }

  const displayStatus = healthScore.status === 'at_risk' ? 'warning' : healthScore.status

  return (
    <div className="space-y-4">
      {/* Health Score Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Health Score</span>
          <Badge className={cn("font-semibold", getStatusColor(healthScore.status))}>
            {getStatusIcon(healthScore.status)}
            <span className="ml-1 capitalize">{displayStatus}</span>
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold">{Math.round(healthScore.overallScore)}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <Progress value={healthScore.overallScore} className="h-2" />
        </div>
      </div>

      {/* Score Breakdown */}
      {healthScore.scoreBreakdown && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Score Breakdown</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Timeline</div>
              <div className="text-sm font-semibold">{Math.round(healthScore.scoreBreakdown.timeline)}</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Budget</div>
              <div className="text-sm font-semibold">{Math.round(healthScore.scoreBreakdown.budget)}</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Milestones</div>
              <div className="text-sm font-semibold">{Math.round(healthScore.scoreBreakdown.milestones)}</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">Activity</div>
              <div className="text-sm font-semibold">{Math.round(healthScore.scoreBreakdown.activity)}</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50 col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Risk</div>
              <div className="text-sm font-semibold">{Math.round(healthScore.scoreBreakdown.risk)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Health Factors */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Health Factors</h4>
        <div className="space-y-2">
          {healthScore.factors.map((factor, index) => (
            <div key={index} className="p-2 rounded-md bg-muted/50">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className="text-sm font-medium">{factor.description}</div>
                  {factor.recommendation && (
                    <div className="text-xs text-muted-foreground mt-1">{factor.recommendation}</div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {factor.severity}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Impact: {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact)} points
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PredictiveCompletionTab({ completion }: { completion: PredictiveCompletion }) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Predicted Date */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Predicted Completion Date</span>
        </div>
        <div className="text-2xl font-bold">
          {formatDate(completion.predictedCompletionDate)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Confidence:</span>
          <Badge variant="outline">{Math.round(completion.confidence * 100)}%</Badge>
        </div>
        {completion.confidenceRange && (
          <div className="text-xs text-muted-foreground">
            Range: {formatDate(completion.confidenceRange.earliest)} - {formatDate(completion.confidenceRange.latest)}
          </div>
        )}
      </div>

      {/* Scenarios */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Completion Scenarios</h4>
        <div className="space-y-2">
          {completion.scenarios.map((scenario, index) => (
            <div key={index} className="p-3 rounded-md border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {scenario.name === 'optimistic' && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {scenario.name === 'realistic' && <Target className="h-4 w-4 text-blue-600" />}
                  {scenario.name === 'pessimistic' && <TrendingDown className="h-4 w-4 text-red-600" />}
                  <span className="text-sm font-medium capitalize">{scenario.name}</span>
                </div>
                <Badge variant="secondary">{Math.round(scenario.probability * 100)}%</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {formatDate(scenario.completionDate)}
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">Assumptions:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {scenario.assumptions.map((assumption, i) => (
                    <li key={i}>{assumption}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Factors */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Prediction Factors</h4>
        <div className="space-y-1">
          {completion.factors.map((factor, index) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
              <span>{factor.description}</span>
              <Badge variant="outline" className="text-xs">
                {Math.round(factor.value * 100)}%
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResourceOptimizationTab({ optimization }: { optimization: ResourceOptimization }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Recommendations */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Optimization Recommendations</h4>
        {optimization.recommendations.length > 0 ? (
          <div className="space-y-3">
            {optimization.recommendations.map((rec, index) => (
              <div key={index} className="p-3 rounded-md border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {rec.type === 'team' && <Users className="h-4 w-4 text-muted-foreground" />}
                      {rec.type === 'budget' && <DollarSign className="h-4 w-4 text-muted-foreground" />}
                      {rec.type === 'timeline' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-semibold">{rec.title}</span>
                      <Badge className={cn("text-xs", getPriorityColor(rec.priority))}>
                        {rec.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                    {rec.impact.healthScore && (
                      <div className="text-xs text-muted-foreground mb-1">
                        Impact: Health score {rec.impact.healthScore > 0 ? '+' : ''}{rec.impact.healthScore} points
                      </div>
                    )}
                    {rec.actionItems.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-medium mb-1">Action Items:</div>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {rec.actionItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span>•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No optimization recommendations at this time
          </div>
        )}
      </div>

      {/* Current State Summary */}
      <div className="space-y-3 pt-4 border-t">
        <h4 className="text-sm font-semibold">Current State</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-md bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Team Members</div>
            <div className="text-lg font-semibold">{optimization.currentState.teamAllocation.length}</div>
          </div>
          <div className="p-2 rounded-md bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Budget Utilization</div>
            <div className="text-lg font-semibold">
              {Math.round(optimization.currentState.budgetAllocation.utilization)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


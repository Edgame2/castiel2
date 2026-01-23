'use client'

/**
 * Model Selection Configuration Tab
 * Super Admin interface for configuring AI model auto-selection behavior
 */

import { useState, useEffect } from 'react'
import { Save, Settings, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSystemAIConfig, useUpdateSystemAIConfig } from '@/hooks/use-ai-settings'
import { ModelSelectionConfig } from '@/lib/api/ai-settings'
import { toast } from 'sonner'

const DEFAULT_CONFIG: ModelSelectionConfig = {
  enabled: true,
  defaultQualityPreference: 'auto',
  scoringWeights: {
    complexityMatching: 40,
    costOptimization: 30,
    capabilityMatching: 30,
    performanceHistory: 0,
  },
  complexityThresholds: {
    economyMax: 30,
    premiumMin: 70,
  },
  costOptimization: {
    strategy: 'balanced',
    maxCostMultiplier: 2.0,
    preferTenantModels: true,
  },
  fallback: {
    allowFallback: true,
    fallbackOrder: ['standard', 'economy', 'premium'],
    maxFallbackAttempts: 2,
  },
  tenantOverrides: {
    allowQualityPreference: true,
    allowModelBlacklist: true,
    allowModelWhitelist: false,
    maxCustomPreferences: 5,
  },
}

export function ModelSelectionConfigTab() {
  const { data: config, isLoading } = useSystemAIConfig()
  const updateConfig = useUpdateSystemAIConfig()
  
  const modelSelection = config?.modelSelection || DEFAULT_CONFIG
  
  const [localConfig, setLocalConfig] = useState<ModelSelectionConfig>(modelSelection)
  const [hasChanges, setHasChanges] = useState(false)

  // Update local config when server config loads
  useEffect(() => {
    if (config?.modelSelection) {
      setLocalConfig(config.modelSelection)
      setHasChanges(false)
    } else if (config && !config.modelSelection) {
      // If config exists but no modelSelection, use default
      setLocalConfig(DEFAULT_CONFIG)
      setHasChanges(false)
    }
  }, [config])

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync({
        modelSelection: localConfig,
      })
      setHasChanges(false)
      toast.success('Model selection configuration saved')
    } catch (error) {
      toast.error('Failed to save configuration')
    }
  }

  const updateScoringWeight = (key: keyof ModelSelectionConfig['scoringWeights'], value: number) => {
    const newWeights = { ...localConfig.scoringWeights, [key]: value }
    // Ensure weights sum to 100
    const total = Object.values(newWeights).reduce((sum, v) => sum + (v || 0), 0)
    if (total !== 100) {
      // Adjust the other weights proportionally
      const otherKeys = Object.keys(newWeights).filter(k => k !== key) as Array<keyof typeof newWeights>
      const otherTotal = otherKeys.reduce((sum, k) => sum + (newWeights[k] || 0), 0)
      if (otherTotal > 0) {
        const scale = (100 - value) / otherTotal
        otherKeys.forEach(k => {
          newWeights[k] = Math.round((newWeights[k] || 0) * scale)
        })
      }
    }
    setLocalConfig({ ...localConfig, scoringWeights: newWeights })
    setHasChanges(true)
  }

  const updateComplexityThreshold = (key: 'economyMax' | 'premiumMin', value: number) => {
    setLocalConfig({
      ...localConfig,
      complexityThresholds: {
        ...localConfig.complexityThresholds,
        [key]: value,
      },
    })
    setHasChanges(true)
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading configuration...</div>
  }

  const weightsTotal = Object.values(localConfig.scoringWeights).reduce((sum, v) => sum + (v || 0), 0)
  const weightsValid = weightsTotal === 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Model Selection Configuration
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure how AI models are automatically selected based on query complexity and requirements
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || !weightsValid || updateConfig.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Validation Alert */}
      {!weightsValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Scoring weights must sum to 100. Current total: {weightsTotal}
          </AlertDescription>
        </Alert>
      )}

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic model selection configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto-Selection</Label>
              <p className="text-sm text-muted-foreground">
                Automatically select the best model based on query complexity
              </p>
            </div>
            <Switch
              checked={localConfig.enabled}
              onCheckedChange={(checked) => {
                setLocalConfig({ ...localConfig, enabled: checked })
                setHasChanges(true)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Default Quality Preference</Label>
            <Select
              value={localConfig.defaultQualityPreference}
              onValueChange={(value: ModelSelectionConfig['defaultQualityPreference']) => {
                setLocalConfig({ ...localConfig, defaultQualityPreference: value })
                setHasChanges(true)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Based on Query)</SelectItem>
                <SelectItem value="economy">Economy (Cost-Optimized)</SelectItem>
                <SelectItem value="standard">Standard (Balanced)</SelectItem>
                <SelectItem value="premium">Premium (Quality-First)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Weights */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Weights</CardTitle>
          <CardDescription>
            Control how models are scored and ranked. Weights must sum to 100.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Complexity Matching</Label>
                <span className="text-sm font-medium">{localConfig.scoringWeights.complexityMatching}%</span>
              </div>
              <Slider
                value={[localConfig.scoringWeights.complexityMatching]}
                onValueChange={([value]) => updateScoringWeight('complexityMatching', value)}
                min={0}
                max={100}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                How well the model matches the query complexity
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Cost Optimization</Label>
                <span className="text-sm font-medium">{localConfig.scoringWeights.costOptimization}%</span>
              </div>
              <Slider
                value={[localConfig.scoringWeights.costOptimization]}
                onValueChange={([value]) => updateScoringWeight('costOptimization', value)}
                min={0}
                max={100}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Cost efficiency of the model
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Capability Matching</Label>
                <span className="text-sm font-medium">{localConfig.scoringWeights.capabilityMatching}%</span>
              </div>
              <Slider
                value={[localConfig.scoringWeights.capabilityMatching]}
                onValueChange={([value]) => updateScoringWeight('capabilityMatching', value)}
                min={0}
                max={100}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Required capabilities (vision, functions, JSON mode)
              </p>
            </div>

            {localConfig.scoringWeights.performanceHistory !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Performance History</Label>
                  <span className="text-sm font-medium">{localConfig.scoringWeights.performanceHistory}%</span>
                </div>
                <Slider
                  value={[localConfig.scoringWeights.performanceHistory || 0]}
                  onValueChange={([value]) => updateScoringWeight('performanceHistory', value)}
                  min={0}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Historical performance of the model
                </p>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total</span>
                <span className={weightsValid ? 'text-green-600' : 'text-red-600'}>
                  {weightsTotal}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complexity Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Complexity Thresholds</CardTitle>
          <CardDescription>
            Define when to use economy vs standard vs premium models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Economy Tier Maximum</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[localConfig.complexityThresholds.economyMax]}
                onValueChange={([value]) => updateComplexityThreshold('economyMax', value)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={localConfig.complexityThresholds.economyMax}
                onChange={(e) => updateComplexityThreshold('economyMax', parseInt(e.target.value) || 0)}
                className="w-20"
                min={0}
                max={localConfig.complexityThresholds.premiumMin - 1}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Complexity score ≤ {localConfig.complexityThresholds.economyMax} → Economy tier
            </p>
          </div>

          <div className="space-y-2">
            <Label>Premium Tier Minimum</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[localConfig.complexityThresholds.premiumMin]}
                onValueChange={([value]) => updateComplexityThreshold('premiumMin', value)}
                min={localConfig.complexityThresholds.economyMax + 1}
                max={100}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={localConfig.complexityThresholds.premiumMin}
                onChange={(e) => updateComplexityThreshold('premiumMin', parseInt(e.target.value) || 70)}
                className="w-20"
                min={localConfig.complexityThresholds.economyMax + 1}
                max={100}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Complexity score ≥ {localConfig.complexityThresholds.premiumMin} → Premium tier
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Scores between {localConfig.complexityThresholds.economyMax + 1} and {localConfig.complexityThresholds.premiumMin - 1} use Standard tier
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Cost Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization</CardTitle>
          <CardDescription>Control how aggressively to optimize for cost</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Strategy</Label>
            <Select
              value={localConfig.costOptimization.strategy}
              onValueChange={(value: ModelSelectionConfig['costOptimization']['strategy']) => {
                setLocalConfig({
                  ...localConfig,
                  costOptimization: { ...localConfig.costOptimization, strategy: value },
                })
                setHasChanges(true)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aggressive">Aggressive (Maximize Savings)</SelectItem>
                <SelectItem value="balanced">Balanced (Default)</SelectItem>
                <SelectItem value="quality-first">Quality First (Minimize Cost Impact)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Max Cost Multiplier</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[localConfig.costOptimization.maxCostMultiplier]}
                onValueChange={([value]) => {
                  setLocalConfig({
                    ...localConfig,
                    costOptimization: { ...localConfig.costOptimization, maxCostMultiplier: value },
                  })
                  setHasChanges(true)
                }}
                min={1}
                max={5}
                step={0.1}
                className="flex-1"
              />
              <Input
                type="number"
                value={localConfig.costOptimization.maxCostMultiplier}
                onChange={(e) => {
                  setLocalConfig({
                    ...localConfig,
                    costOptimization: { ...localConfig.costOptimization, maxCostMultiplier: parseFloat(e.target.value) || 2.0 },
                  })
                  setHasChanges(true)
                }}
                className="w-20"
                min={1}
                max={5}
                step={0.1}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum cost vs cheapest option (e.g., 2.0 = can be 2x more expensive)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Prefer Tenant Models</Label>
              <p className="text-sm text-muted-foreground">
                Prefer tenant BYOK models when available
              </p>
            </div>
            <Switch
              checked={localConfig.costOptimization.preferTenantModels}
              onCheckedChange={(checked) => {
                setLocalConfig({
                  ...localConfig,
                  costOptimization: { ...localConfig.costOptimization, preferTenantModels: checked },
                })
                setHasChanges(true)
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tenant Overrides */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Override Capabilities</CardTitle>
          <CardDescription>Control what tenants can customize</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Quality Preference</Label>
              <p className="text-sm text-muted-foreground">
                Allow tenants to set default quality preference
              </p>
            </div>
            <Switch
              checked={localConfig.tenantOverrides.allowQualityPreference}
              onCheckedChange={(checked) => {
                setLocalConfig({
                  ...localConfig,
                  tenantOverrides: { ...localConfig.tenantOverrides, allowQualityPreference: checked },
                })
                setHasChanges(true)
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Model Blacklist</Label>
              <p className="text-sm text-muted-foreground">
                Allow tenants to blacklist specific models
              </p>
            </div>
            <Switch
              checked={localConfig.tenantOverrides.allowModelBlacklist}
              onCheckedChange={(checked) => {
                setLocalConfig({
                  ...localConfig,
                  tenantOverrides: { ...localConfig.tenantOverrides, allowModelBlacklist: checked },
                })
                setHasChanges(true)
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Model Whitelist</Label>
              <p className="text-sm text-muted-foreground">
                Allow tenants to whitelist specific models
              </p>
            </div>
            <Switch
              checked={localConfig.tenantOverrides.allowModelWhitelist}
              onCheckedChange={(checked) => {
                setLocalConfig({
                  ...localConfig,
                  tenantOverrides: { ...localConfig.tenantOverrides, allowModelWhitelist: checked },
                })
                setHasChanges(true)
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


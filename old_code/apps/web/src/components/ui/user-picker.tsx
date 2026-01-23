"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown, Search, Loader2, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge } from "./badge"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import { useUsers } from "@/hooks/use-users"
import type { User } from "@/types/api"

// ============================================================================
// Types
// ============================================================================

export type UserDisplayFormat = "name" | "email" | "avatar" | "full"

export interface UserPickerProps {
  /** Selected user ID(s) */
  value: string | string[] | null
  /** Change handler */
  onChange: (value: string | string[] | null) => void
  /** Allow selecting multiple users */
  multiple?: boolean
  /** Filter by roles */
  roles?: string[]
  /** Include inactive users */
  includeInactive?: boolean
  /** Minimum required selections (for multiple) */
  minSelection?: number
  /** Maximum allowed selections (for multiple) */
  maxSelection?: number
  /** Placeholder text */
  placeholder?: string
  /** Display format for selected user */
  displayFormat?: UserDisplayFormat
  /** Show user avatar */
  showAvatar?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
  /** Additional class name */
  className?: string
  /** ID for accessibility */
  id?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getUserInitials(user: User): string {
  const first = user.firstName?.[0] || ""
  const last = user.lastName?.[0] || ""
  if (first || last) {
    return `${first}${last}`.toUpperCase()
  }
  return user.email[0].toUpperCase()
}

function getUserDisplayName(user: User, format: UserDisplayFormat): string {
  switch (format) {
    case "email":
      return user.email
    case "name":
      if (user.firstName || user.lastName) {
        return `${user.firstName || ""} ${user.lastName || ""}`.trim()
      }
      return user.email
    case "full":
      if (user.firstName || user.lastName) {
        return `${user.firstName || ""} ${user.lastName || ""} (${user.email})`.trim()
      }
      return user.email
    case "avatar":
    default:
      if (user.firstName || user.lastName) {
        return `${user.firstName || ""} ${user.lastName || ""}`.trim()
      }
      return user.email
  }
}

function generateAvatarColor(userId: string): string {
  // Generate a consistent color based on user ID
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ]
  
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash |= 0
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// ============================================================================
// User Avatar Component
// ============================================================================

interface UserAvatarProps {
  user: User
  size?: "sm" | "md" | "lg"
  className?: string
}

function UserAvatar({ user, size = "sm", className }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage
        src={user.metadata?.avatarUrl}
        alt={getUserDisplayName(user, "name")}
      />
      <AvatarFallback className={cn(generateAvatarColor(user.id), "text-white")}>
        {getUserInitials(user)}
      </AvatarFallback>
    </Avatar>
  )
}

// ============================================================================
// Selected Users Display
// ============================================================================

interface SelectedUsersProps {
  users: User[]
  displayFormat: UserDisplayFormat
  showAvatar: boolean
  onRemove: (userId: string) => void
  disabled?: boolean
  maxDisplay?: number
}

function SelectedUsers({
  users,
  displayFormat,
  showAvatar,
  onRemove,
  disabled,
  maxDisplay = 3,
}: SelectedUsersProps) {
  if (users.length === 0) return null

  const displayItems = users.slice(0, maxDisplay)
  const remainingCount = users.length - maxDisplay

  return (
    <div className="flex flex-wrap gap-1">
      {displayItems.map((user) => (
        <Badge
          key={user.id}
          variant="secondary"
          className="rounded-sm px-1.5 py-0 h-6 gap-1"
        >
          {showAvatar && <UserAvatar user={user} size="sm" className="h-4 w-4 text-[10px]" />}
          <span className="truncate max-w-[120px]">
            {getUserDisplayName(user, displayFormat)}
          </span>
          {!disabled && (
            <button
              type="button"
              className="ml-1 hover:bg-muted rounded-sm p-0.5 -mr-1"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(user.id)
              }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="secondary" className="rounded-sm px-1.5 py-0 h-6">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  )
}

// ============================================================================
// Single User Display
// ============================================================================

interface SingleUserDisplayProps {
  user: User
  displayFormat: UserDisplayFormat
  showAvatar: boolean
}

function SingleUserDisplay({ user, displayFormat, showAvatar }: SingleUserDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      {showAvatar && <UserAvatar user={user} size="sm" />}
      <span className="truncate">{getUserDisplayName(user, displayFormat)}</span>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const UserPicker = React.forwardRef<HTMLButtonElement, UserPickerProps>(
  (
    {
      value,
      onChange,
      multiple = false,
      roles,
      includeInactive = false,
      minSelection,
      maxSelection,
      placeholder = "Select user...",
      displayFormat = "name",
      showAvatar = true,
      disabled = false,
      error = false,
      errorMessage,
      className,
      id,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Convert value to array for internal handling
    const selectedIds = React.useMemo(() => {
      if (!value) return []
      return Array.isArray(value) ? value : [value]
    }, [value])

    // Fetch users
    const { data: usersData, isLoading } = useUsers({
      search: searchQuery || undefined,
      role: roles?.[0], // API supports single role filter
      status: includeInactive ? undefined : "active",
      limit: 50,
    })

    const users = usersData?.users || []

    // Get selected users as full objects
    const selectedUsers = React.useMemo(
      () => users.filter((user) => selectedIds.includes(user.id)),
      [users, selectedIds]
    )

    // Handle selection
    const handleSelect = React.useCallback(
      (userId: string) => {
        if (multiple) {
          const isSelected = selectedIds.includes(userId)

          if (isSelected) {
            // Check min selection
            if (minSelection && selectedIds.length <= minSelection) {
              return
            }
            const newValue = selectedIds.filter((id) => id !== userId)
            onChange(newValue.length > 0 ? newValue : null)
          } else {
            // Check max selection
            if (maxSelection && selectedIds.length >= maxSelection) {
              return
            }
            onChange([...selectedIds, userId])
          }
        } else {
          // Single selection
          const isSelected = selectedIds.includes(userId)
          if (isSelected) {
            onChange(null)
          } else {
            onChange(userId)
            setOpen(false)
          }
        }
      },
      [selectedIds, onChange, multiple, minSelection, maxSelection]
    )

    // Handle remove
    const handleRemove = React.useCallback(
      (userId: string) => {
        if (minSelection && selectedIds.length <= minSelection) {
          return
        }
        const newValue = selectedIds.filter((id) => id !== userId)
        onChange(multiple ? (newValue.length > 0 ? newValue : null) : null)
      },
      [selectedIds, onChange, minSelection, multiple]
    )

    // Clear all
    const handleClearAll = React.useCallback(() => {
      if (minSelection) {
        onChange(multiple ? selectedIds.slice(0, minSelection) : null)
      } else {
        onChange(null)
      }
    }, [selectedIds, minSelection, onChange, multiple])

    // Validation message
    const validationMessage = React.useMemo(() => {
      if (multiple) {
        if (minSelection && selectedIds.length < minSelection) {
          return `Select at least ${minSelection} user${minSelection > 1 ? "s" : ""}`
        }
        if (maxSelection && selectedIds.length >= maxSelection) {
          return `Maximum ${maxSelection} user${maxSelection > 1 ? "s" : ""} reached`
        }
      }
      return null
    }, [selectedIds.length, minSelection, maxSelection, multiple])

    return (
      <div className={cn("space-y-1", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={id}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-haspopup="listbox"
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal min-h-10 h-auto",
                error && "border-destructive focus:ring-destructive",
                !selectedIds.length && "text-muted-foreground"
              )}
            >
              <div className="flex flex-1 flex-wrap gap-1 items-center">
                {selectedUsers.length > 0 ? (
                  multiple ? (
                    <SelectedUsers
                      users={selectedUsers}
                      displayFormat={displayFormat}
                      showAvatar={showAvatar}
                      onRemove={handleRemove}
                      disabled={disabled}
                    />
                  ) : (
                    <SingleUserDisplay
                      user={selectedUsers[0]}
                      displayFormat={displayFormat}
                      showAvatar={showAvatar}
                    />
                  )
                ) : (
                  <span className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 opacity-50" />
                    {placeholder}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              {/* Search input */}
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Search users..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="border-0 focus:ring-0"
                />
              </div>

              {/* Quick actions for multiple */}
              {multiple && selectedIds.length > 0 && (
                <div className="flex items-center justify-between px-2 py-1.5 border-b">
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.length} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleClearAll}
                    disabled={minSelection ? selectedIds.length <= minSelection : false}
                  >
                    Clear
                  </Button>
                </div>
              )}

              <CommandList className="max-h-64">
                {/* Loading state */}
                {isLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
                  </div>
                )}

                {/* Empty state */}
                {!isLoading && users.length === 0 && (
                  <CommandEmpty>No users found.</CommandEmpty>
                )}

                {/* User list */}
                {!isLoading && users.length > 0 && (
                  <CommandGroup>
                    {users.map((user) => {
                      const isSelected = selectedIds.includes(user.id)
                      const isDisabled =
                        !isSelected && maxSelection && selectedIds.length >= maxSelection

                      return (
                        <CommandItem
                          key={user.id}
                          value={user.id}
                          onSelect={() => handleSelect(user.id)}
                          disabled={!!isDisabled}
                          className={cn(
                            "flex items-center gap-2",
                            isDisabled && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {/* Checkbox indicator for multiple */}
                          {multiple && (
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-sm border shrink-0",
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-input"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          )}

                          {/* Radio indicator for single */}
                          {!multiple && (
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-full border shrink-0",
                                isSelected
                                  ? "border-primary"
                                  : "border-input"
                              )}
                            >
                              {isSelected && (
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                          )}

                          {/* User avatar */}
                          {showAvatar && <UserAvatar user={user} size="sm" />}

                          {/* User info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">
                                {getUserDisplayName(user, "name")}
                              </span>
                              {user.status !== "active" && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {user.status}
                                </Badge>
                              )}
                            </div>
                            {displayFormat !== "email" && (
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            )}
                          </div>

                          {/* Role badges */}
                          {user.roles && user.roles.length > 0 && (
                            <div className="flex gap-1 shrink-0">
                              {user.roles.slice(0, 2).map((role) => (
                                <Badge
                                  key={role}
                                  variant="secondary"
                                  className="text-xs px-1 py-0"
                                >
                                  {role}
                                </Badge>
                              ))}
                              {user.roles.length > 2 && (
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  +{user.roles.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Validation/error message */}
        {(errorMessage || validationMessage) && (
          <p
            className={cn(
              "text-xs",
              errorMessage ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {errorMessage || validationMessage}
          </p>
        )}
      </div>
    )
  }
)

UserPicker.displayName = "UserPicker"

export default UserPicker












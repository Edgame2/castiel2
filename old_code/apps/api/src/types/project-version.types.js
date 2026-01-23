/**
 * Project Versioning & History Types
 * Version snapshots, change tracking, and rollback support
 */
/**
 * Version status
 */
export var VersionStatus;
(function (VersionStatus) {
    VersionStatus["DRAFT"] = "draft";
    VersionStatus["PUBLISHED"] = "published";
    VersionStatus["ARCHIVED"] = "archived";
    VersionStatus["ROLLBACK"] = "rollback";
})(VersionStatus || (VersionStatus = {}));
/**
 * Change types
 */
export var ChangeType;
(function (ChangeType) {
    ChangeType["CREATE"] = "create";
    ChangeType["UPDATE"] = "update";
    ChangeType["DELETE"] = "delete";
    ChangeType["MOVE"] = "move";
    ChangeType["RESTORE"] = "restore";
    ChangeType["MERGE"] = "merge";
    ChangeType["SPLIT"] = "split";
})(ChangeType || (ChangeType = {}));
/**
 * Conflict resolution strategies
 */
export var ConflictStrategy;
(function (ConflictStrategy) {
    ConflictStrategy["KEEP_MINE"] = "keep_mine";
    ConflictStrategy["KEEP_THEIRS"] = "keep_theirs";
    ConflictStrategy["MERGE"] = "merge";
    ConflictStrategy["MANUAL"] = "manual";
})(ConflictStrategy || (ConflictStrategy = {}));
/**
 * Version severity (for importance/priority)
 */
export var VersionSeverity;
(function (VersionSeverity) {
    VersionSeverity["MINOR"] = "minor";
    VersionSeverity["MAJOR"] = "major";
    VersionSeverity["BREAKING"] = "breaking";
})(VersionSeverity || (VersionSeverity = {}));
//# sourceMappingURL=project-version.types.js.map
# Workspace Refactor Mongo Migration

This project now treats `workspaces` as the official Jira Space/Project domain.
The old `Project` domain was removed from the backend code.

## Who Needs To Run This

If the team uses the same MongoDB Atlas database, run this migration only once on that shared database.

If a developer uses a separate local MongoDB database, a separate Atlas database, or a restored dump, that developer must run the migration on their own database too.

## Before Running

Confirm the database name in `.env`, then connect to the same database in MongoDB Compass or `mongosh`.

In MongoDB Compass, open the target database and use the **MONGOSH** tab.

## Check Current State

```js
({
  tasks_projectId: db.tasks.countDocuments({ projectId: { $exists: true } }),
  boards_projectId: db.boards.countDocuments({ projectId: { $exists: true } }),
  sprints_projectId: db.sprints.countDocuments({ projectId: { $exists: true } }),
  workflows_projectId: db.workflows.countDocuments({ projectId: { $exists: true } }),

  tasks_workspaceId: db.tasks.countDocuments({ workspaceId: { $exists: true } }),
  boards_workspaceId: db.boards.countDocuments({ workspaceId: { $exists: true } }),
  sprints_workspaceId: db.sprints.countDocuments({ workspaceId: { $exists: true } }),
  workflows_workspaceId: db.workflows.countDocuments({ workspaceId: { $exists: true } }),

  projects_count: db.projects.countDocuments(),
  workspaces_count: db.workspaces.countDocuments()
})
```

## Backup Existing Collections

Run these before changing a database that already has real data.

```js
db.projects.aggregate([{ $out: "projects_backup_before_workspace_refactor" }])
db.workspaces.aggregate([{ $out: "workspaces_backup_before_workspace_refactor" }])
db.tasks.aggregate([{ $out: "tasks_backup_before_workspace_refactor" }])
db.boards.aggregate([{ $out: "boards_backup_before_workspace_refactor" }])
db.sprints.aggregate([{ $out: "sprints_backup_before_workspace_refactor" }])
db.workflows.aggregate([{ $out: "workflows_backup_before_workspace_refactor" }])
```

## Merge Old Projects Into Workspaces

Skip this section if `projects_count` is `0`.

```js
db.projects.aggregate([
  {
    $project: {
      _id: 1,
      name: 1,
      description: 1,
      slug: { $toLower: "$key" },
      key: 1,
      type: { $ifNull: ["$type", "kanban"] },
      ownerId: "$leadId",
      leadId: 1,
      members: 1,
      settings: { $ifNull: ["$settings", {}] },
      status: { $ifNull: ["$status", "active"] },
      createdAt: 1,
      updatedAt: 1
    }
  },
  {
    $merge: {
      into: "workspaces",
      on: "_id",
      whenMatched: "merge",
      whenNotMatched: "insert"
    }
  }
])
```

## Rename Relationship Fields

```js
db.tasks.updateMany({ projectId: { $exists: true } }, { $rename: { projectId: "workspaceId" } })
db.boards.updateMany({ projectId: { $exists: true } }, { $rename: { projectId: "workspaceId" } })
db.sprints.updateMany({ projectId: { $exists: true } }, { $rename: { projectId: "workspaceId" } })
db.workflows.updateMany({ projectId: { $exists: true } }, { $rename: { projectId: "workspaceId" } })
```

## Backfill Existing Workspaces

Run this if existing workspace documents are missing `key`, `type`, `leadId`, or `status`.

```js
db.workspaces.updateMany(
  {
    $or: [
      { key: { $exists: false } },
      { type: { $exists: false } },
      { leadId: { $exists: false } },
      { status: { $exists: false } }
    ]
  },
  [
    {
      $set: {
        key: {
          $ifNull: [
            "$key",
            {
              $toUpper: {
                $substrCP: [
                  {
                    $replaceAll: {
                      input: "$slug",
                      find: "-",
                      replacement: ""
                    }
                  },
                  0,
                  10
                ]
              }
            }
          ]
        },
        type: { $ifNull: ["$type", "kanban"] },
        leadId: { $ifNull: ["$leadId", "$ownerId"] },
        status: { $ifNull: ["$status", "active"] }
      }
    }
  ]
)
```

## Verify

```js
({
  tasks_projectId: db.tasks.countDocuments({ projectId: { $exists: true } }),
  boards_projectId: db.boards.countDocuments({ projectId: { $exists: true } }),
  sprints_projectId: db.sprints.countDocuments({ projectId: { $exists: true } }),
  workflows_projectId: db.workflows.countDocuments({ projectId: { $exists: true } })
})
```

All values should be `0`.

Check workspaces:

```js
db.workspaces.find(
  {},
  { name: 1, slug: 1, key: 1, type: 1, ownerId: 1, leadId: 1, status: 1 }
).pretty()
```

Each workspace should have `key`, `type`, `ownerId`, `leadId`, and `status`.

## After Verification

If the app works correctly and old `projects` data was merged, keep the old collection as a rollback backup:

```js
db.projects.renameCollection("projects_deprecated_after_workspace_refactor")
```

Do not delete backup collections immediately.

# Database Entity Relationship Diagram (ERD)

**Application:** Student Management System API
**Database:** SQLite (LibSQL)
**ORM:** Drizzle ORM
**Last Updated:** 2026-09-19

---

## Table of Contents

1. [ERD Diagram](#erd-diagram)
2. [Tables Overview](#tables-overview)
3. [Core Domain Tables](#core-domain-tables)
4. [Authorization & Permissions Tables](#authorization--permissions-tables)
5. [Notification Tables](#notification-tables)
6. [Relationships Summary](#relationships-summary)
7. [Indexes](#indexes)
8. [Constraints](#constraints)

---

## ERD Diagram

```mermaid
erDiagram
    %% Core Domain Tables
    units ||--o{ units : "parent-child (battalion > company > class)"
    units ||--o{ users : "commands"
    units ||--o{ students : "enrolls (class-level unit)"
    units ||--o{ rooms : "teaching room of a class"

    %% User Authorization
    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "assigned to"
    roles ||--o{ role_permissions : "has"
    permissions ||--o{ role_permissions : "granted via"
    resources ||--o{ permissions : "defines"
    actions ||--o{ permissions : "defines"

    %% Notifications
    users ||--o{ notifications : "receives"
    users ||--o{ notifications : "creates (actor)"
    notifications ||--o{ notification_items : "contains"

    %% Table Definitions

    students {
        int id PK "Auto-increment"
        text createdAt
        text updatedAt
        text fullName
        text birthPlace
        text address
        text dob "Date of birth"
        text rank
        text previousUnit
        text previousPosition
        text position "Default: Học viên"
        text ethnic
        text religion "Default: Không"
        text enlistmentPeriod
        text politicalOrg "hcyu | cpv"
        text politicalOrgOfficialDate
        text cpvId
        text educationLevel
        text schoolName
        text major
        boolean isGraduated "Default: false"
        text talent "Default: Không"
        text shortcoming "Default: Không"
        text policyBeneficiaryGroup "Default: Không"
        text fatherName
        text fatherDob
        text fatherPhoneNumber
        text fatherJob
        text motherName
        text motherDob
        text motherPhoneNumber
        text motherJob
        boolean isMarried "Default: false"
        text spouseName
        text spouseDob
        text spouseJob
        text spousePhoneNumber
        json childrenInfos "Default: []"
        int familySize
        text familyBackground "Default: Không"
        text familyBirthOrder
        text achievement "Default: Không"
        text disciplinaryHistory "Default: Không"
        text phone
        int unitId FK "NOT NULL, class-level unit"
        text cpvOfficialAt
        text avatar
        json siblings "Default: []"
        json contactPerson "Default: {}"
        text studentId
        text relatedDocumentations
        text status "pending | confirmed, Default: pending"
    }

    units {
        int id PK "Auto-increment"
        text createdAt
        text updatedAt
        text alias "NOT NULL, indexed, NOT unique"
        text name "NOT NULL, NOT unique"
        int level "battalion(0) | company(1) | class(2), NOT NULL"
        int parentId FK "Self-reference"
        text description "class level only"
        text graduatedAt "class level only"
        text status "ongoing | graduated, class level only"
    }

    users {
        int id PK "Auto-increment"
        text createdAt
        text updatedAt
        text username "UNIQUE, NOT NULL"
        text password "NOT NULL"
        text displayName "NOT NULL, Default: empty"
        boolean isSuperUser "Default: false"
        int unitId FK
        text status "pending | approved, Default: pending"
    }

    roles {
        int id PK "Auto-increment"
        text createdAt
        text updatedAt
        text name "UNIQUE, NOT NULL"
        text description
    }

    user_roles {
        int userId FK "NOT NULL, ON DELETE CASCADE"
        int roleId FK "NOT NULL, ON DELETE CASCADE"
        text createdAt
    }

    permissions {
        int id PK "Auto-increment"
        text createdAt
        text updatedAt
        text name "UNIQUE, NOT NULL (format: resource:action)"
        text displayName "NOT NULL"
        text description
        int resourceId FK "NOT NULL, ON DELETE CASCADE"
        int actionId FK "NOT NULL, ON DELETE CASCADE"
    }

    role_permissions {
        int roleId FK "NOT NULL, ON DELETE CASCADE"
        int permissionId FK "NOT NULL, ON DELETE CASCADE"
        text createdAt
    }

    resources {
        int id PK "Auto-increment"
        text createdAt
        text updatedAt
        text name "UNIQUE, NOT NULL (e.g., classes, students)"
        text displayName "NOT NULL"
        text description
    }

    actions {
        int id PK "Auto-increment"
        text createdAt
        text updatedAt
        text name "UNIQUE, NOT NULL (e.g., create, read, update, delete)"
        text displayName "NOT NULL"
        text description
    }

    notifications {
        text id PK "NOT NULL"
        text createdAt
        text readAt
        text notificationType "birthday | officialCpv, Default: birthday"
        text title "NOT NULL"
        text message "NOT NULL"
        boolean isBatch "Default: false"
        text batchKey
        int totalCount "Default: 1"
        int recipientId FK
        int actorId FK
    }

    notification_items {
        int id PK "Auto-increment"
        text createdAt
        text updatedAt
        text notifiableType "units | students, NOT NULL"
        int notifiableId "NOT NULL"
        text notificationId FK "NOT NULL"
    }
```

---

## Tables Overview

| Table | Purpose | Record Count Type |
|-------|---------|------------------|
| `students` | Student records with personal, family, and educational info | High volume |
| `units` | Organizational units (battalion/company/class hierarchy) | Low-Medium volume |
| `users` | System users with authentication | Low-Medium volume |
| `roles` | User roles for RBAC | Low volume |
| `user_roles` | Many-to-many: Users ↔ Roles | Medium volume |
| `permissions` | System permissions (resource:action pairs) | Low-Medium volume |
| `role_permissions` | Many-to-many: Roles ↔ Permissions | Medium volume |
| `resources` | Protected resources (e.g., students, units) | Very low volume |
| `actions` | CRUD operations (create, read, update, delete) | Very low volume |
| `notifications` | User notifications | High volume |
| `notification_items` | Items referenced by batch notifications | High volume |

---

## Core Domain Tables

### 1. students

**Purpose:** Store comprehensive student information including personal details, family background, education, and political organization membership.

**Key Fields:**
- Personal: `fullName`, `dob`, `birthPlace`, `address`, `phone`, `ethnic`, `religion`
- Military: `rank`, `position`, `previousUnit`, `enlistmentPeriod`
- Political: `politicalOrg` (hcyu/cpv), `cpvId`, `cpvOfficialAt`
- Education: `educationLevel`, `schoolName`, `major`, `isGraduated`
- Family: Father/mother/spouse info, `childrenInfos` (JSON), `siblings` (JSON)
- Status: `status` (pending/confirmed)

**Relationships:**
- **Many-to-One** → `units` (via `unitId`, must be a class-level unit)

**Constraints:**
- `unitId` NOT NULL (every student must belong to a class-level unit)
- `politicalOrg` must be 'hcyu' or 'cpv'
- `status` must be 'pending' or 'confirmed'

**JSON Fields:**
- `childrenInfos`: Array of children information
- `siblings`: Array of sibling information
- `contactPerson`: Emergency contact object

---

### 2. units

**Purpose:** Hierarchical organizational structure: battalion → company → class. Classes are units with `level = 'class'` (there is no separate `classes` table).

**Key Fields:**
- `alias`: Short identifier (indexed, **not** unique)
- `name`: Full unit name (**not** unique)
- `level`: 0 (battalion), 1 (company) or 2 (class)
- `parentId`: Reference to parent unit (self-referencing)
- `description`, `graduatedAt`, `status` (`ongoing` | `graduated`): only used by class-level units

**Relationships:**
- **Self-referencing**: `parentId` → `id` (parent-child hierarchy)
- **One-to-Many** → `students` (via `students.unitId`, class-level units)
- **One-to-Many** → `rooms` (via `rooms.unit_id`, class-level units)
- **One-to-Many** → `users` (unit commanders)

**Constraints:**
- No unique constraint on `alias` or `name` (duplicates are allowed, e.g. the same class name under different companies)
- Each level sits directly under the previous one: class → company → battalion (validated in `units/controller.ts`)
- Custom enum type stores level as integer (0/1/2) but presents as string (battalion/company/class)

**Hierarchy Example:**
```
Battalion (level 0, parentId: NULL)
  └─ Company A (level 1, parentId: battalion.id)
      └─ Class 1 (level 2, parentId: company.id)
      └─ Class 2 (level 2, parentId: company.id)
  └─ Company B (level 1, parentId: battalion.id)
      └─ Class 3 (level 2, parentId: company.id)
```

**Repository (`apps/api/units/repo.ts`):** only two read methods.
- `find(query?)`: filter by `ids`, `level`, `parentId`, `alias`, `search` (LIKE on name/alias), paginate with `limit`/`offset`.
- `findOne(partialUnitDb)`: first unit matching every defined field (`null` → `IS NULL`).

---

## Authorization & Permissions Tables

### RBAC (Role-Based Access Control) System

The application implements a comprehensive RBAC system with the following structure:

```
Users → Roles → Permissions → (Resources + Actions)
```

### 4. users

**Purpose:** System users with authentication and authorization.

**Key Fields:**
- `username`: Unique login identifier
- `password`: Hashed password
- `displayName`: User's display name
- `isSuperUser`: Super admin flag
- `unitId`: Associated organizational unit
- `status`: 'pending' or 'approved'

**Relationships:**
- **Many-to-One** → `units` (via `unitId`)
- **Many-to-Many** → `roles` (via `user_roles`)
- **One-to-Many** → `notifications` (as recipient)
- **One-to-Many** → `notifications` (as actor/creator)

**Constraints:**
- `username` must be UNIQUE
- `password` is required (should be hashed)

---

### 5. roles

**Purpose:** Define user roles in the system.

**Key Fields:**
- `name`: Role name (unique)
- `description`: Role description

**Relationships:**
- **Many-to-Many** → `users` (via `user_roles`)
- **Many-to-Many** → `permissions` (via `role_permissions`)

**Examples:**
- Super Administrator
- Unit Commander
- Class Instructor
- Student Viewer

---

### 6. user_roles (Junction Table)

**Purpose:** Many-to-many relationship between users and roles.

**Key Fields:**
- `userId`: Foreign key to users
- `roleId`: Foreign key to roles
- `createdAt`: Assignment timestamp

**Primary Key:** Composite (`userId`, `roleId`)

**Constraints:**
- ON DELETE CASCADE on both foreign keys
- A user can have multiple roles
- A role can be assigned to multiple users

---

### 7. permissions

**Purpose:** Define granular permissions for system resources.

**Key Fields:**
- `name`: Auto-generated format `resource:action` (e.g., "students:create")
- `displayName`: Human-readable name (e.g., "Create Students")
- `description`: Permission description
- `resourceId`: FK to resources table
- `actionId`: FK to actions table

**Relationships:**
- **Many-to-One** → `resources`
- **Many-to-One** → `actions`
- **Many-to-Many** → `roles` (via `role_permissions`)

**Constraints:**
- `name` must be UNIQUE
- ON DELETE CASCADE on resource and action FKs

**Permission Examples:**
- `students:read` - View student records
- `students:create` - Create new students
- `units:update` - Modify unit (battalion/company/class) information
- `users:delete` - Delete user accounts

---

### 8. role_permissions (Junction Table)

**Purpose:** Many-to-many relationship between roles and permissions.

**Key Fields:**
- `roleId`: Foreign key to roles
- `permissionId`: Foreign key to permissions
- `createdAt`: Grant timestamp

**Primary Key:** Composite (`roleId`, `permissionId`)

**Constraints:**
- ON DELETE CASCADE on both foreign keys

---

### 9. resources

**Purpose:** Define protected resources in the system.

**Key Fields:**
- `name`: Resource identifier (e.g., "students", "classes", "units")
- `displayName`: Human-readable name
- `description`: Resource description

**Relationships:**
- **One-to-Many** → `permissions`

**Examples:**
- students - Student Records
- units - Organizational Units
- users - User Accounts

---

### 10. actions

**Purpose:** Define operations that can be performed on resources.

**Key Fields:**
- `name`: Action identifier (e.g., "create", "read", "update", "delete")
- `displayName`: Human-readable name
- `description`: Action description

**Relationships:**
- **One-to-Many** → `permissions`

**Standard Actions:**
- create - Create new records
- read - View/list records
- update - Modify existing records
- delete - Remove records

---

## Notification Tables

### 11. notifications

**Purpose:** Store user notifications for events like birthdays and CPV official dates.

**Key Fields:**
- `id`: Text UUID (primary key)
- `notificationType`: 'birthday' or 'officialCpv'
- `title`: Notification title
- `message`: Notification body
- `isBatch`: Whether this is a batch notification
- `batchKey`: Key for grouping batch notifications
- `totalCount`: Number of items in batch
- `recipientId`: User receiving the notification
- `actorId`: User who triggered the notification
- `readAt`: Timestamp when notification was read

**Relationships:**
- **Many-to-One** → `users` (recipient)
- **Many-to-One** → `users` (actor)
- **One-to-Many** → `notification_items`

**Indexes:**
- `recipient_idx` on `recipientId` (fast lookup of user's notifications)
- `batch_idx` on `batchKey` (fast lookup of batch notifications)

---

### 12. notification_items

**Purpose:** Store individual items (students/units) referenced in batch notifications.

**Key Fields:**
- `notifiableType`: 'students' or 'units'
- `notifiableId`: ID of the student or unit
- `notificationId`: FK to parent notification

**Relationships:**
- **Many-to-One** → `notifications`

**Indexes:**
- `notification_items_notification_idx` on `notificationId`
- `notification_items_item_idx` on (`notifiableType`, `notifiableId`)

**Use Case:**
A birthday notification can reference multiple students:
```
Notification (id: "uuid-123", title: "5 students have birthdays this week")
  ├─ NotificationItem (notifiableType: "students", notifiableId: 101)
  ├─ NotificationItem (notifiableType: "students", notifiableId: 102)
  ├─ NotificationItem (notifiableType: "students", notifiableId: 103)
  ├─ NotificationItem (notifiableType: "students", notifiableId: 104)
  └─ NotificationItem (notifiableType: "students", notifiableId: 105)
```

---

## Relationships Summary

### One-to-Many Relationships

| Parent Table | Child Table | Foreign Key | Relationship |
|-------------|-------------|-------------|--------------|
| `units` | `units` | `parentId` | Self-referencing hierarchy |
| `units` | `users` | `unitId` | Unit has commanders |
| `units` | `students` | `unitId` | Class-level unit enrolls students |
| `resources` | `permissions` | `resourceId` | Resource has permissions |
| `actions` | `permissions` | `actionId` | Action defines permissions |
| `users` | `notifications` | `recipientId` | User receives notifications |
| `users` | `notifications` | `actorId` | User creates notifications |
| `notifications` | `notification_items` | `notificationId` | Notification contains items |

### Many-to-Many Relationships

| Table 1 | Junction Table | Table 2 | Purpose |
|---------|---------------|---------|---------|
| `users` | `user_roles` | `roles` | Users have multiple roles |
| `roles` | `role_permissions` | `permissions` | Roles grant permissions |

### Relationship Cardinality

```
units (1) ──────< (N) units (self-reference: battalion > company > class)
  │
  └──────< (N) users
  │
  └──────< (N) students (class-level units)

users (N) >────< (N) roles
      (via user_roles)

roles (N) >────< (N) permissions
      (via role_permissions)

permissions (N) >────── (1) resources
                │
                └────── (1) actions

notifications (1) ──────< (N) notification_items
```

---

## Indexes

### Performance Indexes

| Table | Index Name | Columns | Purpose |
|-------|-----------|---------|---------|
| `notifications` | `recipient_idx` | `recipientId` | Fast user notification lookup |
| `notifications` | `batch_idx` | `batchKey` | Fast batch notification grouping |
| `notification_items` | `notification_items_notification_idx` | `notificationId` | Fast item lookup by notification |
| `notification_items` | `notification_items_item_idx` | `notifiableType`, `notifiableId` | Fast lookup by referenced entity |

### Primary Key Indexes (Automatic)

All tables have primary key indexes on `id` except:
- `user_roles`: Composite PK on (`userId`, `roleId`)
- `role_permissions`: Composite PK on (`roleId`, `permissionId`)
- `notifications`: PK on `id` (text UUID)

---

## Constraints

### Unique Constraints

| Table | Columns | Constraint Name |
|-------|---------|----------------|
| `users` | `username` | Unique |
| `roles` | `name` | Unique |
| `permissions` | `name` | Unique |
| `resources` | `name` | Unique |
| `actions` | `name` | Unique |

### Foreign Key Constraints

#### With CASCADE DELETE

| Child Table | Parent Table | FK Column | Action |
|------------|-------------|-----------|--------|
| `user_roles` | `users` | `userId` | ON DELETE CASCADE |
| `user_roles` | `roles` | `roleId` | ON DELETE CASCADE |
| `role_permissions` | `roles` | `roleId` | ON DELETE CASCADE |
| `role_permissions` | `permissions` | `permissionId` | ON DELETE CASCADE |
| `permissions` | `resources` | `resourceId` | ON DELETE CASCADE |
| `permissions` | `actions` | `actionId` | ON DELETE CASCADE |

#### Without CASCADE

| Child Table | Parent Table | FK Column | Notes |
|------------|-------------|-----------|-------|
| `units` | `units` | `parentId` | Self-reference |
| `students` | `units` | `unitId` | Required |
| `users` | `units` | `unitId` | Optional |
| `notifications` | `users` | `recipientId` | Optional |
| `notifications` | `users` | `actorId` | Optional |
| `notification_items` | `notifications` | `notificationId` | Required |

### Check Constraints (Custom Types)

| Table | Column | Valid Values |
|-------|--------|--------------|
| `students` | `politicalOrg` | 'hcyu', 'cpv' |
| `students` | `status` | 'pending', 'confirmed' |
| `units` | `status` | 'ongoing', 'graduated' (class level) |
| `units` | `level` | 0 (battalion), 1 (company), 2 (class) |
| `users` | `status` | 'pending', 'approved' |
| `notifications` | `notificationType` | 'birthday', 'officialCpv' |
| `notification_items` | `notifiableType` | 'units', 'students' |

---

## Base Schema Pattern

All tables (except junction tables) inherit from a base schema:

```typescript
{
  id: integer PRIMARY KEY AUTO_INCREMENT,
  createdAt: text DEFAULT CURRENT_TIMESTAMP,
  updatedAt: text DEFAULT CURRENT_TIMESTAMP (auto-updates on change)
}
```

**Exceptions:**
- `notifications`: Uses text UUID for `id`
- `user_roles`: Composite PK, only has `createdAt`
- `role_permissions`: Composite PK, only has `createdAt`

---

## Data Types

### SQLite Column Types

| Drizzle Type | SQLite Type | Usage |
|-------------|-------------|-------|
| `sqlite.int()` | INTEGER | IDs, foreign keys, boolean (0/1) |
| `sqlite.text()` | TEXT | Strings, dates (ISO format), JSON |
| `sqlite.int({ mode: 'boolean' })` | INTEGER | Boolean values (0/1) |
| `sqlite.text({ mode: 'json' })` | TEXT | JSON arrays/objects |
| Custom types | TEXT/INTEGER | Enums with validation |

### Custom Enum Types

| Table | Column | Storage | Runtime Type |
|-------|--------|---------|--------------|
| `units` | `level` | INTEGER (0/1/2) | 'battalion' \| 'company' \| 'class' |
| `students` | `politicalOrg` | TEXT | 'hcyu' \| 'cpv' |
| `students` | `status` | TEXT | 'pending' \| 'confirmed' |
| `units` | `status` | TEXT | 'ongoing' \| 'graduated' |
| `users` | `status` | TEXT | 'pending' \| 'approved' |
| `notifications` | `notificationType` | TEXT | 'birthday' \| 'officialCpv' |
| `notification_items` | `notifiableType` | TEXT | 'units' \| 'students' |

---

## Query Patterns

### Common Joins

#### Get students with class, company and battalion
```typescript
db.query.students.findMany({
  with: {
    unit: {
      with: { parent: { with: { parent: true } } }
    }
  }
})
```

#### Get classes with student count
```typescript
db.select({
  ...getTableColumns(units),
  studentCount: count(students.unitId)
})
.from(units)
.leftJoin(students, eq(units.id, students.unitId))
.where(eq(units.level, 'class'))
.groupBy(units.id)
```

#### Get user permissions
```typescript
db.select({
  permissionName: permissions.name,
  resourceName: resources.name,
  actionName: actions.name
})
.from(users)
.innerJoin(userRoles, eq(users.id, userRoles.userId))
.innerJoin(roles, eq(userRoles.roleId, roles.id))
.innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
.innerJoin(resources, eq(permissions.resourceId, resources.id))
.innerJoin(actions, eq(permissions.actionId, actions.id))
.where(eq(users.id, userId))
```

#### Get unit hierarchy
```typescript
db.query.units.findMany({
  with: {
    children: {
      with: { children: true } // company -> classes
    },
    parent: true
  }
})
```

---

## Database File

**Location:** `apps/api/local.db`
**Type:** LibSQL (SQLite-compatible)
**Connection:** File-based (`file:local.db`)
**Migrations:** Auto-applied from `./migrations` folder on startup

---

## Schema Files

All schema definitions are located in `apps/api/schema/`:

| File | Tables Defined |
|------|----------------|
| `base.ts` | Base schema pattern (id, createdAt, updatedAt) |
| `student.ts` | `students` table and types |
| `units.ts` | `units` table (battalion / company / class) and types |
| `users.ts` | `users` table and types |
| `roles.ts` | `roles` table and types |
| `user-roles.ts` | `user_roles` junction table |
| `permissions.ts` | `permissions` table and types |
| `role-permissions.ts` | `role_permissions` junction table |
| `resources.ts` | `resources` table and types |
| `actions.ts` | `actions` table and types |
| `notifications.ts` | `notifications` table and types |
| `notification-items.ts` | `notification_items` table and types |
| `index.ts` | Exports all schemas |

---


## Commands

Run these from `apps/api`.

| Task | Command |
|------|---------|
| Generate the web API client (`apps/web/src/api/client.ts`) | `pnpm gen` |
| Generate Drizzle migrations from schema changes | `encore exec -- pnpm generate` |
| Apply migrations | `encore exec -- pnpm migrate` |

**Never run `tsc` (`npx tsc`, `pnpm tsc`, `tsc --noEmit`, ...) in this project.** It freezes the shell / agent. Do not type-check that way; rely on the editor, the dev server, or tests.

After changing any Encore endpoint (path, request or response type), run `pnpm gen` so `apps/web` stays in sync. Do not hand-edit `client.ts`.

## Generate Migrations
```bash
encore exec -- pnpm generate
```
Generates Drizzle migrations based on schema changes in `apps/api/schema/`.

## Run Migrations
```bash
encore exec -- pnpm migrate
```
Runs pending migrations against the database.

## Workflow
When creating new fields or modifying schema:

1. **Generate migrations**: Run `encore exec -- pnpm generate` to create migration files from schema changes
2. **Apply migrations**: Run `encore exec -- pnpm migrate` to apply the migrations to the database

**Important**: Always use generate + migrate workflow. Do not use `pnpm push` for schema changes.


## Notes

1. **Timestamps:** All timestamps are stored as TEXT in ISO 8601 format
2. **Auto-increment:** All IDs (except notifications) use auto-increment integers
3. **JSON Fields:** JSON data is stored as TEXT and parsed by Drizzle ORM
4. **Soft Deletes:** Not implemented - deletions are hard deletes
5. **Audit Trail:** Base schema includes `createdAt` and `updatedAt` for all tables
6. **Validation:** Custom enum types provide runtime validation on insert/update
7. **Cascading:** User and role deletions cascade to junction tables
8. **Self-referencing:** Units table supports hierarchical structure via `parentId`

---

**Generated by:** Claude Code
**Database ORM:** Drizzle ORM
**Database Engine:** LibSQL (SQLite)

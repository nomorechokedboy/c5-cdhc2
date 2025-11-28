# Authorization Patterns for API

**Updated:** 2025-11-28
**Skill File:** `.claude/skills/drizzle-orm.md`

## Overview

This document explains the authorization patterns used in the Student Management System API when working with units, classes, and students.

## Authorization Structure

### Auth Data Available in All Authenticated Endpoints

```typescript
import { getAuthData } from '~encore/auth'

interface AuthData {
  userID: string           // Current user's ID
  permissions: string[]    // User's permissions
  validClassIds: number[]  // Classes user can access
  validUnitIds: number[]   // Units user can access
}

// Usage
const authData = getAuthData()!
const validClassIds = authData.validClassIds
const validUnitIds = authData.validUnitIds
```

## Authorization Rules by Table

### 1. Units Table

**Rule:** User can ONLY interact with units whose `id` is in `validUnitIds`

**Check:** `unit.id IN validUnitIds`

**Example:**
```typescript
// In controller
async create(unitParams: UnitParams[], validUnitIds: number[]): Promise<UnitDB[]> {
  const unitIds = unitParams.map(p => p.id)

  // Authorization check
  const isAuthorized = unitIds.every(id => validUnitIds.includes(id))
  if (!isAuthorized) {
    throw AppError.unauthorized("You don't have permission")
  }

  return this.repo.create(unitParams)
}

// In API endpoint
export const createUnit = api(
  { auth: true, method: 'POST', path: '/units' },
  async (req: CreateUnitRequest) => {
    const validUnitIds = getAuthData()!.validUnitIds
    return await unitController.create(req.units, validUnitIds)
  }
)
```

### 2. Classes Table

**Rule:** User can ONLY interact with classes whose:
- `id` is in `validClassIds` (for read/update/delete by class ID)
- `unitId` is in `validUnitIds` (for create operations)

**Check:**
- `class.id IN validClassIds`
- `class.unitId IN validUnitIds`

**Example:**
```typescript
// CREATE: Check by unitId
async create(classParams: ClassParam[], validUnitIds: number[]): Promise<ClassDB[]> {
  const unitIds = classParams.map(p => p.unitId)

  // Authorization check - user can only create in authorized units
  const isAuthorized = unitIds.every(id => validUnitIds.includes(id))
  if (!isAuthorized) {
    throw AppError.unauthorized("You don't have permission")
  }

  return this.repo.create(classParams)
}

// UPDATE: Check by both classId and unitId
async update(params: ClassDB[], validUnitIds: number[]): Promise<ClassDB[]> {
  // Check new unitIds are authorized
  const checkParamUnitIds = params.every(c => validUnitIds.includes(c.unitId))

  // Check existing classes' unitIds are authorized
  const classes = await this.findByIds(params.map(p => p.id))
  const checkExistingUnitIds = classes.every(c => validUnitIds.includes(c.unitId))

  if (!checkParamUnitIds || !checkExistingUnitIds) {
    throw AppError.unauthorized("You don't have permission")
  }

  return this.repo.update(params)
}

// DELETE: Check by classId
async delete(classes: ClassDB[], validClassIds: number[]): Promise<ClassDB[]> {
  const isAuthorized = classes.every(c => validClassIds.includes(c.id))
  if (!isAuthorized) {
    throw AppError.unauthorized("You don't have permission")
  }

  return this.repo.delete(classes)
}

// In API endpoint
export const createClass = api(
  { auth: true, method: 'POST', path: '/classes' },
  async (req: CreateClassRequest) => {
    const validUnitIds = getAuthData()!.validUnitIds
    return await classController.create(req.classes, validUnitIds)
  }
)

export const deleteClass = api(
  { auth: true, method: 'DELETE', path: '/classes' },
  async (req: DeleteClassRequest) => {
    const validClassIds = getAuthData()!.validClassIds
    return await classController.delete(req.classes, validClassIds)
  }
)
```

### 3. Students Table

**Rule:** User can ONLY interact with students whose `classId` is in `validClassIds`

**Check:** `student.classId IN validClassIds`

**Example:**
```typescript
// CREATE
async create(params: StudentParam[], validClassIds: number[]): Promise<StudentDB[]> {
  // Authorization check - all students must be in authorized classes
  const isAuthorized = params.every(s => validClassIds.includes(s.classId))
  if (!isAuthorized) {
    throw AppError.unauthorized("You don't have permission")
  }

  return this.repo.create(params)
}

// FIND (with unit filtering)
async find(
  { unitAlias, unitLevel, classId, classIds, ...q }: GetStudentsQuery,
  validClassIds: number[]
): Promise<Student[]> {
  // If querying by unit, convert to classIds and check authorization
  if (unitAlias && unitLevel) {
    const unit = await this.unitRepo.findOne({ alias: unitAlias, level: unitLevel })

    // Extract classIds from unit structure
    const unitClassIds = unit.level === 'battalion'
      ? unit.children.flatMap(c => c.classes.map(cl => cl.id))
      : unit.classes.map(c => c.id)

    // Authorization check
    const isAuthorized = unitClassIds.every(id => validClassIds.includes(id))
    if (!isAuthorized) {
      throw AppError.unauthorized("You don't have permission")
    }

    return this.repo.find({ ...q, classIds: unitClassIds })
  }

  // Build and filter classIds
  const cIds = [...(classIds || []), ...(classId ? [classId] : [])]
  const authorizedClassIds = cIds.length > 0
    ? cIds.filter(id => validClassIds.includes(id))
    : validClassIds

  return this.repo.find({ ...q, classIds: authorizedClassIds })
}

// UPDATE
async update(params: StudentDB[], validClassIds: number[]): Promise<StudentDB[]> {
  // Authorization check
  const isAuthorized = params.every(s => validClassIds.includes(s.classId))
  if (!isAuthorized) {
    throw AppError.unauthorized("You don't have permission")
  }

  return this.repo.update(params)
}

// DELETE
async delete(students: StudentDB[], validClassIds: number[]): Promise<StudentDB[]> {
  // Authorization check
  const isAuthorized = students.every(s => validClassIds.includes(s.classId))
  if (!isAuthorized) {
    throw AppError.unauthorized("You don't have permission")
  }

  return this.repo.delete(students)
}

// In API endpoint
export const createStudent = api(
  { auth: true, method: 'POST', path: '/students' },
  async (req: CreateStudentRequest) => {
    const validClassIds = getAuthData()!.validClassIds
    return await studentController.create(req.students, validClassIds)
  }
)

export const getStudents = api(
  { auth: true, method: 'GET', path: '/students' },
  async (query: GetStudentsQuery) => {
    const validClassIds = getAuthData()!.validClassIds
    return await studentController.find(query, validClassIds)
  }
)
```

## Authorization Pattern Summary

| Table | Authorization Key | Check Location | Validation Rule |
|-------|------------------|----------------|-----------------|
| **units** | `validUnitIds` | Controller | `unit.id IN validUnitIds` |
| **classes** (create) | `validUnitIds` | Controller | `class.unitId IN validUnitIds` |
| **classes** (read/update/delete) | `validClassIds` | Controller | `class.id IN validClassIds` |
| **students** | `validClassIds` | Controller | `student.classId IN validClassIds` |

## Architecture Layers

```
┌─────────────────────────────────────────┐
│         API Endpoint Layer              │
│  - Extract auth context (getAuthData()) │
│  - Pass validClassIds/validUnitIds      │
└──────────────┬──────────────────────────┘
               │
               v
┌─────────────────────────────────────────┐
│        Controller Layer                 │
│  ✅ AUTHORIZATION CHECKS HERE           │
│  - Validate all IDs against valid lists │
│  - Filter queries to authorized scope   │
│  - Throw AppError.unauthorized()        │
└──────────────┬──────────────────────────┘
               │
               v
┌─────────────────────────────────────────┐
│        Repository Layer                 │
│  ❌ NO AUTHORIZATION HERE               │
│  - Pure data access                     │
│  - Execute queries                      │
│  - Return results                       │
└─────────────────────────────────────────┘
```

## Critical Rules

### ✅ DO

1. **Always get auth context in API endpoints:**
   ```typescript
   const validClassIds = getAuthData()!.validClassIds
   const validUnitIds = getAuthData()!.validUnitIds
   ```

2. **Always validate in controllers BEFORE calling repositories:**
   ```typescript
   const isAuthorized = params.every(item => validIds.includes(item.id))
   if (!isAuthorized) {
     throw AppError.unauthorized("...")
   }
   ```

3. **Use `.every()` for validation (ensures ALL items are authorized):**
   ```typescript
   params.every(item => validIds.includes(item.id))
   ```

4. **Filter queries to authorized scope:**
   ```typescript
   const authorizedIds = requestedIds.filter(id => validIds.includes(id))
   ```

5. **Log authorization checks for debugging:**
   ```typescript
   log.trace('Authorization check', { params, validIds })
   ```

### ❌ DON'T

1. **Don't perform authorization in repositories** - Repositories are pure data layer
2. **Don't skip authorization checks** - Always validate before database operations
3. **Don't use `.some()` for validation** - Use `.every()` to ensure all items are authorized
4. **Don't return unauthorized data** - Filter results to user's scope
5. **Don't forget to pass auth context** - Controllers need validClassIds/validUnitIds

## Helper Functions

```typescript
// Check if all IDs are authorized
function checkAuthorization(
  itemIds: number[],
  validIds: number[],
  errorMessage: string
): void {
  const isAuthorized = itemIds.every(id => validIds.includes(id))
  if (!isAuthorized) {
    throw AppError.handleAppErr(
      AppError.unauthorized(errorMessage)
    )
  }
}

// Filter to authorized IDs only
function filterAuthorizedIds(
  requestedIds: number[] | undefined,
  validIds: number[]
): number[] | undefined {
  if (!requestedIds) return validIds
  return requestedIds.filter(id => validIds.includes(id))
}

// Usage
checkAuthorization(
  students.map(s => s.classId),
  validClassIds,
  "You don't have permission to access these students"
)

const authorizedClassIds = filterAuthorizedIds(query.classIds, validClassIds)
```

## Complete Flow Example

### Student Creation Flow

```typescript
// 1. User makes request
POST /students
Authorization: Bearer <token>
Body: { students: [{ fullName: "...", classId: 123, ... }] }

// 2. API Endpoint extracts auth context
export const createStudent = api(
  { auth: true, method: 'POST', path: '/students' },
  async (req: CreateStudentRequest) => {
    // Extract valid class IDs from auth token
    const validClassIds = getAuthData()!.validClassIds  // [100, 101, 102]

    // Pass to controller
    const students = await studentController.create(
      req.students,
      validClassIds
    )

    return { data: students }
  }
)

// 3. Controller validates authorization
async create(
  params: StudentParam[],  // [{ classId: 123, ... }]
  validClassIds: number[]  // [100, 101, 102]
): Promise<StudentDB[]> {
  // Check if classId 123 is in [100, 101, 102]
  const checkClassIds = params.every(s =>
    validClassIds.includes(s.classId)  // FALSE!
  )

  if (!checkClassIds) {
    // Throws 403 Unauthorized
    throw AppError.unauthorized(
      'You are not authorized to create student with this classId'
    )
  }

  // If authorized, proceed to repository
  return this.repo.create(params)
}

// 4. Repository executes query (no auth check)
create(params: StudentParam[]): Promise<StudentDB[]> {
  return this.db
    .insert(students)
    .values(params)
    .returning()
    .catch(handleDatabaseErr)
}
```

## Testing Authorization

```typescript
// Test unauthorized access
test('should reject creating student in unauthorized class', async () => {
  const validClassIds = [100, 101]  // User can only access class 100, 101
  const params = [{ classId: 999, fullName: "Test" }]  // Trying to create in 999

  await expect(
    studentController.create(params, validClassIds)
  ).rejects.toThrow('You are not authorized')
})

// Test authorized access
test('should allow creating student in authorized class', async () => {
  const validClassIds = [100, 101]
  const params = [{ classId: 100, fullName: "Test" }]  // Creating in 100 ✓

  const result = await studentController.create(params, validClassIds)
  expect(result).toBeDefined()
})

// Test filtering in queries
test('should filter query to authorized classes only', async () => {
  const validClassIds = [100, 101]
  const query = { classIds: [100, 999] }  // Requesting 100 and 999

  const result = await studentController.find(query, validClassIds)

  // Should only return students from class 100 (not 999)
  expect(result.every(s => s.classId === 100)).toBe(true)
})
```

## References

- **Skill File:** `.claude/skills/drizzle-orm.md`
- **Auth Handler:** `apps/api/auth/auth.ts`
- **Student Controller:** `apps/api/students/controller.ts`
- **Class Controller:** `apps/api/classes/controller.ts`
- **ERD Document:** `claude.md`

---

**Note:** This authorization pattern is enforced at the controller layer to maintain separation of concerns. Repositories remain pure data access layers without business logic or authorization checks.

# Class results reports (semester and year) — design

Status: draft for review · Scope: `apps/sms-api`, `apps/sms-web` · No Moodle plugin changes in the reports work (aligning the existing calculators is a separate later phase, §12)
Source of rules: *Quy chế đào tạo hệ Quân sự* (QĐ 1127/QĐ-CĐHC), Điều 10, 11, 14, 15 — the regulation is authoritative; the sample PDFs are illustrative.

## 1. Goal

Reproduce the two sample reports (`Ket_qua_hoc_tap_HK1_Y53.pdf`, `Ket_qua_nam_thu_nhat_Y53_sinh_vien_gioi.pdf`)
inside sms, from Moodle grade data, and let users export them as **Excel (.xlsx)**
so they can be edited afterwards. PDF and Word are not targets (Excel was chosen because the reports are
tables with merged headers and colour bands, which a spreadsheet models directly).

- **Semester report**: one row per student, one column per học phần (with credits), then ĐTB, xếp loại,
  hạng, rèn luyện; plus a class summary (headcount, class ĐTB, classification counts, per-course
  distribution, top 3).
- **Year report**: every semester of the year side by side (not fixed at two), year ĐTB, rèn luyện, xếp loại, hạng.

Audience: **admin and manager** (any class) and **students** (their own result and rank only).
Teachers are not included.

## 2. Decisions taken and deferred

Taken: reports are pages in the app plus Excel export; rèn luyện is stored in **sms-api** as a numeric score
(0–10, with its own labels and thresholds), and the year value is the average of its semesters;
Moodle stays the source of course grades; cross-course numbers (ĐTB, rank, classification) are computed
in **sms-api** because Moodle only computes per-course TKMH.

Deferred (no clear requirement yet — the design leaves a seam, see §10):
- retake handling (which attempt counts, how it is shown). Interim rule: the **latest** `Thi` grade counts;
  grades are never averaged;
- the "sinh viên giỏi" selection rule for the year report (the regulation has none; the year report lists
  every student until the rule is known);
- graduation classification (Điều 20), including the `*` exclusion of GDTC and QS, which applies to the
  graduation score only and is **not** used in semester or year ĐTB;
- promotion or repeat-year decisions (Điều 16).

## 3. Domain rules

All numbers follow the regulation. Rounding is half-up on **exact decimal arithmetic** (`math/big` rationals,
not floats), so 7.845 rounds to 7.85 and never to 7.84.

| Rule | Definition |
|---|---|
| Tests | Grade items of a course carry an exam type (existing custom field): `15P` = KTTX (weight 1), `1T` = KTĐK (weight 2), `Thi` = ĐKTM. A blank grade counts as **0** (Điều 10.5, 11.2.c). Test scores keep the value Moodle holds, rounded to 1 decimal. |
| ĐTBKT | `(ΣKTTX + 2·ΣKTĐK) / (nKTTX + 2·nKTĐK)`, where n is the number of configured items of that type in the course. No assumption that both counts are equal. |
| ĐKTM | The **latest** `Thi` item (in course order) that has a grade, i.e. a retake value replaces the earlier one; if none has a grade, 0. Never the average of several `Thi` items. |
| Course score ĐMH | `0.4·ĐTBKT + 0.6·ĐKTM`, **2 decimals**. A course with no configured grade items at all is not scored and is named in `warnings` (`course_no_grade_items`). |
| Course classification | ≥ 9.00 Xuất sắc · 8.00–8.99 Giỏi · 7.00–7.99 Khá · 6.00–6.99 Trung bình khá · 5.00–5.99 Trung bình · < 5.00 Yếu. (Điều 11 prints Trung bình as 5.00–6.99, which overlaps Trung bình khá; read as 5.00–5.99.) |
| Period of a course | Course custom fields `year` (new, added by you in Moodle) and `semester` (existing). A year contains whatever distinct `semester` values its courses carry, so it may have one, two or more semesters. A period is the pair (`year`, `semester`). Both come from the course metadata Moodle already returns. |
| Credits | Course custom field `credit`. |
| ĐTB (semester / year) | `Σ(ĐMH·credit) / Σ credit` over **all** scored courses of the period (a year: all courses of all its semesters); **2 decimals**. No course is excluded. |
| Conduct (rèn luyện) | A score 0–10 per student and semester (§5), labelled by its own threshold table `ConductBands`: Xuất sắc ≥ 9.00 · Tốt 8.00–8.99 · Khá 6.50–7.99 · Trung bình 5.00–6.49 · Yếu 3.50–4.99 · Kém < 3.50 (Xuất sắc added on request; the ranges below it are working values that can be changed in that one table). Year conduct = simple mean of the year's semester scores, 2 decimals, labelled by the same table; empty if any semester of the year has no score. Not credit-weighted. |
| Xếp loại (semester / year) | The ĐTB tier only, using the same six bands as course classification (Yếu at ĐTB < 5). **Conduct is not part of the formula for now**: Điều 14 also requires a conduct level per tier, but rèn luyện is reported next to the classification, on its own. The rule lives in one function so a conduct condition can be added later without changing the report shape. |
| Hạng | Competition ranking (1, 2, 3, 3, 3, 3, 3, 3, 9 …) on the 2-decimal ĐTB among students with an ĐTB. The regulation defines no class rank; this reproduces the sample column. |
| Class ĐTB, top 3, distributions | Class ĐTB = mean of student ĐTB; per-course distribution counts students per course-classification band. |

Worked check (Chu Việt Anh, HK1, all six courses): (5.8·4 + 7.9·3 + 7.7·4 + 8.7·3 + 6.2·2 + 7.4·2) / 18 = 131.0 / 18
= **7.28**. The sample PDF shows 7.4 because it left GDTC and QS out; that exclusion belongs to graduation only,
so the sample's ĐTB, xếp loại and hạng will not match the app for students near a band edge.

Class = Moodle category; học phần = course in that category. A course missing `credit`, `semester` or `year`
is left out of the report and named in `warnings`.

## 4. Architecture

```
sms-web ──JSON──▶ sms-api ──▶ Moodle (local_coursegrades_get_course_data, teacher courses metadata)
   │                 ├──▶ MySQL (sms_conduct)   ← new table, same DB the audit log already uses
   └─ builds the .xlsx export from the report JSON
```

**sms-api (Go/Encore)** — follows the existing layering (`mdlapi` provider → usecase → controller → endpoint):
- `internal/reporting` (new, pure functions, no I/O): ĐMH, ĐTB, both classification tables, conduct labels, ranking, summary, top 3.
  All maths lives here and is table-tested.
- `internal/usecases/report.go`: for a category, lists its courses (metadata gives `credit`, `semester`),
  fetches each course's students and grades **in parallel with bounded concurrency**, builds the report via
  `reporting`, and merges conduct.
- `conduct` service (new Encore service, pattern of `auditlog`): owns `sms_conduct`, its own embedded
  migrations, and its own tracking table `sms_conduct_schema_migrations` (the audit service already uses
  `sms_schema_migrations`; sharing it would collide on version numbers).
- `usrreports` endpoints (§6).

**sms-web** — new routes under the existing class route, new components, export builders (§7, §8).

**Moodle** — untouched. The Moodle client uses one service token, so sms-api enforces roles itself.

## 5. Data model

```sql
CREATE TABLE sms_conduct (
  category_id BIGINT       NOT NULL,   -- class
  student_id  BIGINT       NOT NULL,   -- Moodle user id
  year        INT          NOT NULL,
  semester    INT          NOT NULL,
  score       DECIMAL(3,1) NOT NULL,   -- 0.0–10.0, validated in Go
  updated_by  BIGINT       NOT NULL,
  updated_at  DATETIME(3)  NOT NULL,
  PRIMARY KEY (category_id, student_id, year, semester),
  INDEX idx_class_period (category_id, year, semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Only semester scores are stored. Year rèn luyện is always derived (§3), so there is nothing to keep in sync.

No foreign key into Moodle tables. Rows for students no longer in the class are ignored when reading and
can be removed by a purge from the admin UI later. Edits go through the existing audit middleware.

## 6. API (all `auth`; role from `TokenPayload`)

| Method & path | Who | Returns |
|---|---|---|
| `GET /reports/classes/:categoryId/years/:year/semesters/:semester` | admin, manager | `SemesterReport` |
| `GET /reports/classes/:categoryId/years/:year` | admin, manager | `YearReport` |
| `GET /reports/classes/:categoryId/periods` | admin, manager | the class's (year, semester) pairs, so the UI builds its pickers from data |
| `PUT /reports/classes/:categoryId/conduct` | admin, manager | body `[{studentId, year, semester, score}]`, upserts |
| `GET /reports/me/years/:year/semesters/:semester`, `/reports/me/years/:year` | student | own row, own rank, class size, class ĐTB. No other student's name or score. |

```jsonc
// SemesterReport
{
  "class": { "id": 12, "name": "Y sĩ K12", "idnumber": "Y53" },
  "year": 1, "semester": 1, "totalCredits": 18,
  "courses": [{ "id": 5, "shortname": "GP", "fullname": "Giải phẫu", "credits": 4 }],
  "students": [{
    "id": 101, "idnumber": "2301010001", "fullname": "Chu Việt Anh",
    "scores": { "5": 5.80 },          // courseId → ĐMH (2 decimals) or null when the course is not scored
    "gpa": 7.28, "classification": "kha", "rank": 48,           // from ĐTB only
    "conduct": { "score": 5.5, "label": "trung_binh" }                     // nullable; label from ConductBands
  }],
  "summary": { "headcount": 56, "classGpa": 7.96, "maxGpa": 8.7,
               "byClassification": { "gioi": 33, "kha": 21, "trung_binh": 2 },
               "perCourse": { "5": { "bands": { "gioi": 14 }, "mean": 7.46 } },
               "top": [{ "rank": 1, "fullname": "Hồ Nhật Tân", "gpa": 8.7 }] },
  "warnings": [{ "code": "course_missing_credit", "courseId": 9 }]
}
```

`YearReport` has the same shape with a `periods` array (one entry per semester of the year, however many), each
with its own courses, credits, per-student ĐTB and rèn luyện, plus the year-level ĐTB, rank and derived year
rèn luyện per student.
Errors: `PermissionDenied` for the wrong role, `NotFound` for an unknown class, `FailedPrecondition` when a
class has no course with `credit`, `semester` and `year`; `InvalidArgument` for a conduct score outside 0–10.

A student's class is resolved from their courses using the direct Moodle DB access that
`internal/categories` already has. Students only ever receive their own data.

## 7. Web (sms-web)

Uses the "Vở ghi điểm" identity already in place (paper, serif scores, failing scores circled in red).

- `/khoa-hoc/$categoryIdnumber/ket-qua` (admin, manager): tabs **Học kỳ** (semester picker) and **Năm**;
  ledger table with sticky name column and group headers (Điểm học phần / Tổng kết); summary panel with
  stacked distribution bars and top 3. Cell colouring follows the sample legend (≥ 9 green, 5–6.9 amber),
  mapped to `--success` and `--warning`. Rèn luyện is an inline numeric input (0–10) that saves via `PUT …/conduct`; the year view shows the derived average read-only. Semester pickers come from `…/periods`.
- `/ket-qua` (student): own semester and year cards — ĐTB, xếp loại, hạng of class size, rèn luyện, per-course
  scores. Linked from the student dashboard and sidebar.
- Direct loads: the existing course routes read the category from router state; the new route resolves the
  category from `/categories` by `idnumber` so reload and deep links work.
- All text goes in `vi.json`. Loading, empty ("chưa có điểm"), incomplete-student and error states are explicit.
- Files: `components/reports/{SemesterReport,YearReport,ReportTable,SummaryPanel,ConductInput,useReport}.tsx`,
  `lib/report/` (types only; **no maths in the browser**).

## 8. Export

Built in the browser from the report JSON, so the API stays pure JSON (no base64 files through Encore) and
the numbers on screen and in the file are identical by construction.

- **Excel (.xlsx)** via `exceljs`, landscape A4, fit to one page wide: school header block, merged group
  headers (Điểm học phần, one group per semester in the year report, Tổng kết), one row per student, cell
  fills for the colour bands, the legend, and the place/date and two signature blocks (Hiệu trưởng, Trưởng
  phòng đào tạo) under the table. The class summary (counts, per-course distribution, top 3) goes on a second
  sheet.
- Scores are written as numbers with a one-decimal format (not strings), so teachers can sort, filter and
  recalculate after editing. Incomplete students get an empty ĐTB cell.
- Button on the report page: "Tải Excel", for the selected semester or the year.
- Not in v1: Word or PDF, uploadable templates (the existing course export has them), and a chart in the
  summary sheet (a table is used).

## 9. Testing

- `reporting` (Go): table tests seeded with rows from the PDFs, recomputed by hand under the regulation
  (worked example 131.0/18 = 7.28, not the sample's 7.4), covering: ĐMH with unequal KTTX/KTĐK counts;
  blank test and blank exam counting as 0; several `Thi` items (latest wins, never averaged); half-up
  rounding at 2 decimals with values like 7.845; all six band edges (4.99/5.00, 5.99/6.00, 6.99/7.00,
  7.99/8.00, 8.99/9.00); conduct present or absent never changes the classification; the six conduct bands and their edges;
  rank ties (3 ×6 then 9); course with no grade items or no credit excluded with a warning.
- Use-case tests with a fake `mdlapi` provider (fan-out, partial failure, timeout).
- Endpoint role tests: student cannot call class endpoints, cannot see other students; teacher denied.
- Year aggregation: years with 1, 2 and 3 semesters; semester numbers global and restarting; year ĐTB over
  all the year's credits; year rèn luyện = mean of semester scores, empty when one semester is missing.
- Conduct: migration up/down, upsert idempotence, score outside 0–10 rejected.
- Web (Vitest): report table rendering (six colour bands, rows without conduct, conduct input), export builder
  (sheet headers, merged cells, numeric cell types, row order) using the same fixtures.

## 10. Deferred items and where they plug in

| Deferred | Seam |
|---|---|
| `*` exclusion (GDTC, QS) | Graduation score only (Điều 20); not part of this work. Would be a course custom field consumed by a future graduation calculator. |
| Retake | Interim rule: latest `Thi` item counts. Later: `reporting.Attempt` on the exam score (`first`, `final`); the report's `scores[courseId]` becomes `{first, final}` (additive change). |
| "Sinh viên giỏi" | `YearReport` request gets an optional filter (min ĐTB, min conduct, no failing course) once the rule is known. |

## 11. Risks

- **Fan-out cost**: a class report makes one Moodle call per course, and the Moodle client has a 10 s timeout.
  Mitigation: bounded parallelism and a short Redis cache per (category, semester); measure with a real class.
- **Existing endpoints without role checks**: `PUT /courses` and `GET /courses/:id` do not check the caller's
  role in Go. Not part of this work, but it affects the "admin edits grades" story; suggest a separate fix.
- **Moodle setup**: admins must add the numeric course custom field `year` (shortname `year`) and fill it on
  existing courses; until then those courses show up under `warnings`.
- **Provisional numbers**: because a missing grade counts as 0, a semester still in progress shows a low
  ĐTB. The report warns when a course has no `Thi` grade for any student (`exam_not_held`) so it is not
  mistaken for a final result.
- **Test-count drift**: Điều 10.4 expects 1+1, 2+2 or 3+3 tests for 1–2, 3–4 or 5+ credits. The formula uses
  the items actually configured; a mismatch is reported as a warning (`test_count_mismatch`), not corrected.
- **Retake rule** (the latest `Thi` grade replaces earlier ones) is isolated in one function; a richer display
  (first attempt struck through) stays deferred.
- **Open items**: the conduct ranges below Xuất sắc are working values; class = category and its direct
  courses only (no nested sub-categories).
- **Conduct and classification are decoupled** by decision. The regulation ties the top tiers to conduct;
  until that is added, a student with poor conduct can show a high classification, so the two columns must
  be read together.
- **Existing calculators disagree with the regulation** (out of this work, separate phase in §12): the
  Moodle export plugin (`calculate_tkmh`, `get_classification`) and the web app (`calculateFinalGrade`,
  `getGradeColor`) use one decimal or unrounded values, five bands, `(avg15P + 2·avg1T)/3` (only equal to the
  regulation when the test counts are equal), and average several `Thi` items.

## 12. Delivery order

Reports work:
1. `reporting` package and tests. 2. `conduct` service, migration, endpoint. 3. Report use case and class
endpoints. 4. Web class pages. 5. Excel export. 6. Student endpoints and page.

Alignment of existing code (separate phase, after the reports so it can reuse `reporting` as the reference):
7. sms-web: replace `calculateFinalGrade` / `getGradeColor` with the sms-api values (student dashboard and
grade table show the regulation's ĐMH, six bands, 2 decimals). 8. Moodle `local_customgradeexport`:
`calculate_tkmh` and `get_classification` updated to the same rules, so exported course sheets agree.

Each step is reviewable on its own and nothing is committed until you ask.

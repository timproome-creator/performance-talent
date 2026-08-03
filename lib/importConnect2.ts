import * as XLSX from 'xlsx'
import type { FinalRating, ObjectiveStatus, Section } from '@/lib/types'
import { STATUSES, FINAL_RATINGS } from '@/lib/types'

// Parses Mr Price's real "Connect 2.0" KPI Tracker workbook — one tab per
// team member, all sharing the exact layout confirmed by reading six real
// tabs (Tim Proome, Neren Singh, Clive Subramany, Pieter Jacobs, Donovan
// Fourie, Joan Smith) plus the blank "Template Manager" tab:
//
//   B4 name / G4 associate no / B5 role / G5 division / B6 team / B7 manager
//   G6 "2026 (FY27)" -> fyStartYear = leading 4-digit year (2026)
//   Row "KPI DELIVERY" / "LEADERSHIP EFFECTIVENESS" in col A marks a section.
//   Objective rows within a section: col E (weighting, or "Applicable" for
//   Leadership Effectiveness) is populated - that's the reliable "this is a
//   real objective row" signal. Column D (due date) is NOT reliable for
//   this: confirmed against real data that only the FIRST Leadership
//   Effectiveness row in a section carries a due date, the other three
//   share the same one conceptually but leave the cell blank - so an
//   earlier version of this parser that keyed off column D silently
//   dropped 3 of every 4 Leadership Effectiveness objectives. Column E is
//   filled on every real objective row in both sections; the filler row
//   beneath each objective (holding the two comment labels) always has E
//   empty.
//   Cols: B division-sub-objective, C objective, D due date, E weighting,
//   F measures of success, G-J Q1-Q4 status, K final outcome,
//   L (objective row) associate comment, L (row+1) manager comment.
//
// Two things the real data forced into this parser, confirmed across all
// six tabs, not guessed:
//  1. KPI Delivery's E is always a real 0..1 fraction. Leadership
//     Effectiveness's E is always the literal word "Applicable" (or
//     "Not Applicable" to exclude an item) - never a number - because Mr
//     Price's template doesn't assign per-item weights there, only a
//     100%-for-the-whole-section rule (confirmed in the "Use Guide" tab).
//     This parser splits that 100% evenly across the "Applicable" items,
//     which is an interpretation (the spreadsheet doesn't state a split
//     rule), not a fact read off the sheet - flag this to the user.
//  2. Most G-J/K/L cells in the real tabs still hold the UNFILLED TEMPLATE
//     PLACEHOLDER text ("KPI Progress", "Leadership Effectiveness
//     Progress", "Performance Measure", "Associate Comment:", "Line
//     Manager Comment:") rather than real data - the FY27 cycle has KPIs
//     set but hasn't had real quarterly updates entered into this workbook
//     yet. Importing that placeholder text as if it were a real status
//     would corrupt the data, so it's detected and skipped.

const NON_PERSON_SHEETS = new Set([
  'legend',
  'previously planned_connect 2.0',
  'use guide',
  'our dna',
  'template manager',
  'new_option 2',
  'current_connect 2.0 planned',
])

const PLACEHOLDER_TEXT = new Set([
  'kpi progress',
  'leadership effectiveness progress',
  'performance measure',
])

const STATUS_BY_LABEL = new Map(STATUSES.map((s) => [s.label.toLowerCase(), s.key]))
const RATING_BY_LABEL = new Map(FINAL_RATINGS.map((r) => [r.label.toLowerCase(), r.key]))

export interface ParsedObjective {
  section: Section
  divisionSubObjective: string | null
  objective: string
  dueDate: string | null // ISO date
  weighting: number // 0..1
  measuresOfSuccess: string | null
  progress: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', ObjectiveStatus>>
  finalRating: FinalRating | null
  associateComment: string | null
  managerComment: string | null
}

export interface ParsedPerson {
  sheetName: string
  name: string
  associateNo: string | null
  roleTitle: string | null
  division: string | null
  team: string | null
  managerName: string | null
  fyStartYear: number
  objectives: ParsedObjective[]
  warnings: string[]
}

function excelSerialToISODate(serial: number): string {
  const epoch = Date.UTC(1899, 11, 30)
  return new Date(epoch + serial * 86400000).toISOString().slice(0, 10)
}

function cellStr(row: unknown[], col: number): string | null {
  const v = row[col]
  if (v === undefined || v === null || v === '') return null
  return String(v).trim()
}

function stripLabel(value: string, label: string): string | null {
  const trimmed = value.trim()
  if (trimmed.toLowerCase() === label.toLowerCase()) return null
  const withColon = `${label}`.toLowerCase()
  if (trimmed.toLowerCase().startsWith(withColon)) {
    const rest = trimmed.slice(label.length).trim()
    return rest || null
  }
  return trimmed
}

function parseSection(
  rows: unknown[][],
  section: Section,
  startRow: number,
  endRow: number,
  warnings: string[],
): ParsedObjective[] {
  const raw: { row: unknown[]; weighting: number | 'applicable' | 'excluded' }[] = []

  for (let i = startRow; i < endRow; i++) {
    const row = rows[i] ?? []
    const eRaw = cellStr(row, 4)
    if (!eRaw) continue // not an objective row - the filler comment row beneath each objective

    let weighting: number | 'applicable' | 'excluded'
    if (/^not applicable$/i.test(eRaw)) {
      weighting = 'excluded'
    } else if (/^applicable$/i.test(eRaw)) {
      weighting = 'applicable'
    } else {
      const n = Number(eRaw)
      weighting = Number.isFinite(n) ? n : 0
    }
    raw.push({ row, weighting })
  }

  const explicitTotal = raw
    .filter((r) => typeof r.weighting === 'number')
    .reduce((sum, r) => sum + (r.weighting as number), 0)
  const applicableCount = raw.filter((r) => r.weighting === 'applicable').length
  const equalShare = applicableCount > 0 ? Math.max(0, 1 - explicitTotal) / applicableCount : 0
  if (applicableCount > 0) {
    warnings.push(
      `${section === 'leadership_effectiveness' ? 'Leadership Effectiveness' : 'KPI Delivery'}: ` +
        `${applicableCount} objective(s) marked "Applicable" with no explicit weighting - split evenly ` +
        `(${Math.round(equalShare * 100)}% each). Review if that's not the intended split.`,
    )
  }

  return raw
    .filter((r) => r.weighting !== 'excluded')
    .map(({ row, weighting }) => {
      const finalWeighting = weighting === 'applicable' ? equalShare : (weighting as number)

      const progress: ParsedObjective['progress'] = {}
      const quarterCols: [('Q1' | 'Q2' | 'Q3' | 'Q4'), number][] = [
        ['Q1', 6],
        ['Q2', 7],
        ['Q3', 8],
        ['Q4', 9],
      ]
      for (const [q, col] of quarterCols) {
        const raw = cellStr(row, col)
        if (!raw || PLACEHOLDER_TEXT.has(raw.toLowerCase())) continue
        const mapped = STATUS_BY_LABEL.get(raw.toLowerCase())
        if (mapped) {
          progress[q] = mapped
        } else {
          warnings.push(`Unrecognised ${q} status "${raw}" on an objective - left blank.`)
        }
      }

      const kRaw = cellStr(row, 10)
      let finalRating: FinalRating | null = null
      if (kRaw && !PLACEHOLDER_TEXT.has(kRaw.toLowerCase()) && !/^not applicable$/i.test(kRaw)) {
        const mapped = RATING_BY_LABEL.get(kRaw.toLowerCase())
        if (mapped) {
          finalRating = mapped
        } else {
          warnings.push(`Unrecognised final rating "${kRaw}" on an objective - left blank.`)
        }
      }

      const associateRaw = cellStr(row, 11)
      const managerRaw = null // manager comment lives on the row below; caller handles via rowIndex+1 lookup

      // Leadership Effectiveness items beyond the first leave column C
      // (objective) blank entirely, and even the first just repeats the
      // literal section name there - the real descriptive text for every
      // item lives in F (measures of success). Confirmed against all six
      // real tabs, not just one. Fall back to F as the objective title in
      // both cases, since it's the only informative text on the row.
      const cRaw = cellStr(row, 2)
      const fRaw = cellStr(row, 5)
      const useCAsObjective = cRaw && cRaw.toLowerCase() !== 'leadership effectiveness'
      const objective = useCAsObjective ? (cRaw as string) : (fRaw ?? cRaw ?? '')
      const measuresOfSuccess = useCAsObjective ? fRaw : null

      return {
        section,
        divisionSubObjective: cellStr(row, 1),
        objective,
        dueDate: typeof row[3] === 'number' ? excelSerialToISODate(row[3] as number) : null,
        weighting: finalWeighting,
        measuresOfSuccess,
        progress,
        finalRating,
        associateComment: associateRaw ? stripLabel(associateRaw, 'Associate Comment:') : null,
        managerComment: managerRaw,
      }
    })
}

export function parseConnect2Workbook(buffer: ArrayBuffer): ParsedPerson[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const people: ParsedPerson[] = []

  for (const sheetName of wb.SheetNames) {
    if (NON_PERSON_SHEETS.has(sheetName.trim().toLowerCase())) continue

    const ws = wb.Sheets[sheetName]
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (rows.length === 0) continue

    const name = cellStr(rows[3] ?? [], 1) // B4
    if (!name) continue // not a person tab

    const warnings: string[] = []
    const associateNo = cellStr(rows[3] ?? [], 6) // G4
    const roleTitle = cellStr(rows[4] ?? [], 1) // B5
    const division = cellStr(rows[4] ?? [], 6) // G5
    const team = cellStr(rows[5] ?? [], 1) // B6
    const yearRaw = cellStr(rows[5] ?? [], 6) // G6, e.g. "2026 (FY27)"
    const managerName = cellStr(rows[6] ?? [], 1) // B7

    const yearMatch = yearRaw?.match(/(\d{4})/)
    if (!yearMatch) {
      warnings.push(`Could not find a financial year in "${yearRaw ?? ''}" - skipped this tab.`)
      people.push({
        sheetName, name, associateNo, roleTitle, division, team, managerName,
        fyStartYear: 0, objectives: [], warnings,
      })
      continue
    }
    const fyStartYear = Number(yearMatch[1])

    // Find every "KPI DELIVERY" / "LEADERSHIP EFFECTIVENESS" section header
    // row in column A, then find the manager-comment row directly beneath
    // each objective row (needed since the comment layout spans two rows).
    const sectionStarts: { section: Section; row: number }[] = []
    for (let i = 0; i < rows.length; i++) {
      const a = cellStr(rows[i] ?? [], 0)
      if (!a) continue
      if (/^kpi delivery$/i.test(a)) sectionStarts.push({ section: 'kpi_delivery', row: i })
      else if (/^leadership effectiveness$/i.test(a)) sectionStarts.push({ section: 'leadership_effectiveness', row: i })
    }

    const objectives: ParsedObjective[] = []
    for (let s = 0; s < sectionStarts.length; s++) {
      const { section, row: startRow } = sectionStarts[s]
      const endRow = s + 1 < sectionStarts.length ? sectionStarts[s + 1].row : rows.length
      const sectionObjectives = parseSection(rows, section, startRow + 1, endRow, warnings)

      // Manager comment sits on the row directly below each objective row.
      // parseSection doesn't know the original row index once mapped, so
      // re-walk the same range to attach it by matching row order.
      let oi = 0
      for (let i = startRow + 1; i < endRow && oi < sectionObjectives.length; i++) {
        if (!cellStr(rows[i] ?? [], 4)) continue
        const managerRaw = cellStr(rows[i + 1] ?? [], 11)
        sectionObjectives[oi].managerComment = managerRaw ? stripLabel(managerRaw, 'Line Manager Comment:') : null
        oi++
      }

      objectives.push(...sectionObjectives)
    }

    people.push({ sheetName, name, associateNo, roleTitle, division, team, managerName, fyStartYear, objectives, warnings })
  }

  return people
}

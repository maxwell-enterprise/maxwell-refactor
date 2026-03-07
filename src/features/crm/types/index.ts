/** CRM-only filter state for member lists (event, lifecycle, program, join date range). */
export interface FilterCriteria {
  attendedEventId?: string;
  lifecycleStage?: string;
  program?: string;
  joinDateStart?: string;
  joinDateEnd?: string;
}

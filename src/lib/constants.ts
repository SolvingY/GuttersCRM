// Fiscal Year Configuration
// The fiscal year runs December 15 → December 14 of the following year.
// CURRENT_YEAR_START / CURRENT_YEAR_END are computed dynamically so they
// never need to be manually updated each year.
function computeFiscalYear() {
  const today = new Date();
  const year = today.getFullYear();
  const fiscalCutoff = new Date(year, 11, 15); // Dec 15 of the current calendar year

  // If today is before Dec 15 of this year, the fiscal year started on Dec 15 of last year.
  // If today is on or after Dec 15 of this year, the fiscal year started today's Dec 15.
  const startYear = today < fiscalCutoff ? year - 1 : year;
  return {
    start: new Date(startYear, 11, 15),       // Dec 15 of startYear
    end: new Date(startYear + 1, 11, 15),     // Dec 15 of the following year
  };
}

const _fy = computeFiscalYear();

export const FISCAL_YEAR = {
  START_MONTH: 11, // December (0-indexed)
  START_DAY: 15,
  END_MONTH: 11,
  END_DAY: 15,
  CURRENT_YEAR_START: _fy.start,
  CURRENT_YEAR_END: _fy.end,
};

// Sales Rank Options
export const RANK_OPTIONS = ['SR1', 'SR2', 'SR3', 'SR4', 'SR5', 'SR6', 'Y?', 'CEO', 'GM'];

// Canvasser Rank Options
export const CANVASSER_RANK_OPTIONS = ['C1', 'C2', 'C3'];

// Calculate fiscal year progress percentage
export const getFiscalYearProgress = (): number => {
  const now = new Date();
  const start = FISCAL_YEAR.CURRENT_YEAR_START;
  const end = FISCAL_YEAR.CURRENT_YEAR_END;
  
  if (now < start) return 0;
  if (now > end) return 100;
  
  const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const daysPassed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  
  return (daysPassed / totalDays) * 100;
};

// Get days remaining in fiscal year
export const getDaysRemainingInFiscalYear = (): number => {
  const now = new Date();
  const end = FISCAL_YEAR.CURRENT_YEAR_END;
  
  if (now > end) return 0;
  
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

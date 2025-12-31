// Fiscal Year Configuration
// The fiscal year runs from December 15 to December 15
export const FISCAL_YEAR = {
  START_MONTH: 11, // December (0-indexed)
  START_DAY: 15,
  END_MONTH: 11,
  END_DAY: 15,
  CURRENT_YEAR_START: new Date(2025, 11, 15), // December 15, 2025
  CURRENT_YEAR_END: new Date(2026, 11, 15),   // December 15, 2026
};

// Sales Rank Options
export const RANK_OPTIONS = ['SR1', 'SR2', 'SR3', 'SR4', 'SR5', 'SR6', 'Y?', 'CEO', 'GM'];

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

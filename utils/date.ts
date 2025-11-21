/**
 * Converts an epoch timestamp (in seconds) to a formatted date string
 * @param epochTime - Unix timestamp in seconds
 * @param includeTime - Whether to include time in the output
 * @returns Formatted date string
 */
export function formatEpochDate(
  epochTime: number | null | undefined,
  includeTime: boolean = false
): string {
  if (!epochTime) return "-";

  try {
    const date = new Date(epochTime * 1000);

    if (includeTime) {
      return date.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
}

/**
 * Converts a Date object to epoch timestamp (in seconds)
 * @param date - Date object
 * @returns Epoch timestamp in seconds
 */
export function dateToEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Gets the current date as epoch timestamp (in seconds)
 * @returns Current epoch timestamp in seconds
 */
export function getCurrentEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Gets the epoch timestamp for N days ago
 * @param days - Number of days to subtract
 * @returns Epoch timestamp in seconds
 */
export function getDaysAgoEpoch(days: number): number {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateToEpoch(date);
}

/**
 * Gets the current financial year start date (April 1st) as epoch timestamp
 * Financial year in India runs from April 1 to March 31
 * @returns Epoch timestamp in seconds for FY start date
 */
export function getCurrentFYStartEpoch(): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0 = January, 3 = April)

  // If current month is before April (0-2), FY started last year
  // Otherwise, FY started this year
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;

  // April 1st at 00:00:00
  const fyStartDate = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
  return dateToEpoch(fyStartDate);
}

/**
 * Gets the current financial year end date (March 31st) as epoch timestamp
 * Financial year in India runs from April 1 to March 31
 * @returns Epoch timestamp in seconds for FY end date
 */
export function getCurrentFYEndEpoch(): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // If current month is before April (0-2), FY ends this year
  // Otherwise, FY ends next year
  const fyEndYear = currentMonth < 3 ? currentYear : currentYear + 1;

  // March 31st at 23:59:59
  const fyEndDate = new Date(fyEndYear, 2, 31, 23, 59, 59, 999);
  return dateToEpoch(fyEndDate);
}

/**
 * Gets the financial year start date (April 1st) as epoch timestamp for a specific year
 * Financial year in India runs from April 1 to March 31
 * @param year - The year for which to get FY start date (e.g., 2024 returns April 1, 2024)
 * @returns Epoch timestamp in seconds for FY start date
 */
export function getFYStartEpochByYear(year: number): number {
  // April 1st at 00:00:00 for the specified year
  const fyStartDate = new Date(year, 3, 1, 0, 0, 0, 0);
  return dateToEpoch(fyStartDate);
}

/**
 * Gets the financial year end date (March 31st) as epoch timestamp for a specific year
 * Financial year in India runs from April 1 to March 31
 * @param year - The year for which to get FY start (e.g., 2024 returns March 31, 2025 for FY 2024-25)
 * @returns Epoch timestamp in seconds for FY end date
 */
export function getFYEndEpochByYear(year: number): number {
  // March 31st at 23:59:59 of the next year (FY 2024-25 ends March 31, 2025)
  const fyEndDate = new Date(year + 1, 2, 31, 23, 59, 59, 999);
  return dateToEpoch(fyEndDate);
}

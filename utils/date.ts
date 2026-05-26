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
        timeZone: "UTC",
      });
    }

    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
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
 * Converts a "YYYY-MM-DD" date string to a UTC midnight epoch (in seconds).
 * Always produces UTC midnight regardless of local timezone.
 * Use this instead of dateToEpoch(new Date(dateStr)) to avoid local-timezone drift.
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @returns Epoch timestamp in seconds for UTC midnight of the given date
 */
export function dateStringToUtcEpoch(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 1000);
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

/**
 * Sets the time component of an epoch date to 8:00 PM UTC (20:00:00 UTC).
 * The UTC date part is preserved; only the time is overridden.
 * Used for corporate action record dates.
 * @param epochSeconds - Unix timestamp in seconds
 * @returns Epoch timestamp in seconds with time set to 8:00 PM UTC
 */
export function setToEveningUTC(epochSeconds: number): number {
  const date = new Date(epochSeconds * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return Math.floor(Date.UTC(year, month, day, 20, 0, 0) / 1000);
}

/**
 * Sets the time component of an epoch date to 8:00 PM IST (20:00 IST = 14:30 UTC).
 * Used for corporate action ex dates — the date part (in IST) is preserved,
 * only the time is overridden to evening 8 PM IST.
 * @param epochSeconds - Unix timestamp in seconds
 * @returns Epoch timestamp in seconds with time set to 8:00 PM IST
 */
export function setToEveningIST(epochSeconds: number): number {
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
  const istDate = new Date(epochSeconds * 1000 + istOffsetMs);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();
  // 8:00 PM IST = 14:30 UTC
  return Math.floor(Date.UTC(year, month, day, 14, 30, 0) / 1000);
}

/**
 * Sets the time component of an epoch date to 8:00 AM UTC (08:00:00 UTC).
 * The UTC date part is preserved; only the time is overridden.
 * Used for corporate action allotment dates.
 * @param epochSeconds - Unix timestamp in seconds
 * @returns Epoch timestamp in seconds with time set to 8:00 AM UTC
 */
export function setToMorningUTC(epochSeconds: number): number {
  const date = new Date(epochSeconds * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return Math.floor(Date.UTC(year, month, day, 8, 0, 0) / 1000);
}

/**
 * Advances a UTC midnight epoch to the next Monday if it falls on Saturday or Sunday.
 * Saturday → +2 days (Monday), Sunday → +1 day (Monday), weekdays unchanged.
 * @param epochSeconds - UTC midnight epoch in seconds
 * @returns Epoch in seconds, guaranteed to be a weekday
 */
export function skipWeekend(epochSeconds: number): number {
  const day = new Date(epochSeconds * 1000).getUTCDay(); // 0=Sun, 6=Sat
  if (day === 6) return epochSeconds + 2 * 86400; // Sat → Mon
  if (day === 0) return epochSeconds + 86400;      // Sun → Mon
  return epochSeconds;
}

/**
 * Sets the time component of an epoch date to 8:00 AM IST (08:00 IST = 02:30 UTC).
 * Used for corporate action allotment dates — the date part (in IST) is preserved,
 * only the time is overridden to morning 8 AM IST.
 * @param epochSeconds - Unix timestamp in seconds
 * @returns Epoch timestamp in seconds with time set to 8:00 AM IST
 */
export function setToMorningIST(epochSeconds: number): number {
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
  const istDate = new Date(epochSeconds * 1000 + istOffsetMs);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();
  // 8:00 AM IST = 02:30 UTC
  return Math.floor(Date.UTC(year, month, day, 2, 30, 0) / 1000);
}

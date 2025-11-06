/**
 * Date Formatter Utility
 * Provides date formatting functions, especially for IST timezone
 */

/**
 * Format date in IST (Indian Standard Time, UTC+5:30)
 * @param date Optional date object, defaults to current date
 * @returns Formatted date string in IST timezone (YYYY-MM-DD HH:mm:ss)
 */
export function formatIST(date?: Date): string {
   const dateObj = date || new Date();

   // Get UTC time components
   const utcTime = dateObj.getTime();
   const utcDate = new Date(utcTime);

   // IST is UTC+5:30 (5 hours 30 minutes = 5.5 hours)
   const istOffsetMinutes = 5 * 60 + 30; // 330 minutes

   // Get UTC components
   let year = utcDate.getUTCFullYear();
   let month = utcDate.getUTCMonth();
   let day = utcDate.getUTCDate();
   let hours = utcDate.getUTCHours();
   let minutes = utcDate.getUTCMinutes();
   let seconds = utcDate.getUTCSeconds();

   // Add IST offset (5:30)
   minutes += istOffsetMinutes;
   hours += Math.floor(minutes / 60);
   minutes = minutes % 60;

   // Handle day rollover
   if (hours >= 24) {
      hours -= 24;
      day += 1;
   }

   // Handle month rollover
   const daysInMonth = new Date(year, month + 1, 0).getDate();
   if (day > daysInMonth) {
      day = 1;
      month += 1;
   }

   // Handle year rollover
   if (month >= 12) {
      month = 0;
      year += 1;
   }

   // Format as YYYY-MM-DD HH:mm:ss
   const formattedMonth = String(month + 1).padStart(2, '0');
   const formattedDay = String(day).padStart(2, '0');
   const formattedHours = String(hours).padStart(2, '0');
   const formattedMinutes = String(minutes).padStart(2, '0');
   const formattedSeconds = String(seconds).padStart(2, '0');

   return `${year}-${formattedMonth}-${formattedDay} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

/**
 * Get current date/time in IST format
 * @returns Formatted date string in IST timezone
 */
export function getCurrentIST(): string {
   return formatIST();
}


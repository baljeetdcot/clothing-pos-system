/**
 * Utility functions for safe date formatting
 */

/**
 * Safely formats a date string to IST timezone with 12-hour format (dd/mm/yyyy hh:mm AM/PM)
 * @param dateString - The date string to format
 * @param fallback - Fallback string if date is invalid (default: current date)
 * @returns Formatted date string in IST with 12-hour format
 */
export function safeFormatDate(dateString: string | undefined | null, fallback?: string): string {
  if (!dateString) {
    return fallback || formatDateToIST12Hour(new Date());
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return fallback || formatDateToIST12Hour(new Date());
    }
    return formatDateToIST12Hour(date);
  } catch (error) {
    return fallback || formatDateToIST12Hour(new Date());
  }
}

/**
 * Helper function to format a Date object to IST with 12-hour format (dd/mm/yyyy hh:mm AM/PM)
 * @param date - The Date object to format
 * @returns Formatted date string in IST
 */
function formatDateToIST12Hour(date: Date): string {
  // Convert to IST (UTC + 5:30)
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  
  const day = istDate.getDate().toString().padStart(2, '0');
  const month = (istDate.getMonth() + 1).toString().padStart(2, '0');
  const year = istDate.getFullYear();
  
  let hours = istDate.getHours();
  const minutes = istDate.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const hoursStr = hours.toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Safely formats a date string to IST timezone with date only (dd/mm/yyyy)
 * @param dateString - The date string to format
 * @param fallback - Fallback string if date is invalid (default: current date)
 * @returns Formatted date string in IST (date only)
 */
export function safeFormatDateOnly(dateString: string | undefined | null, fallback?: string): string {
  if (!dateString) {
    return fallback || formatDateOnlyToIST(new Date());
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return fallback || formatDateOnlyToIST(new Date());
    }
    return formatDateOnlyToIST(date);
  } catch (error) {
    return fallback || formatDateOnlyToIST(new Date());
  }
}

/**
 * Helper function to format a Date object to IST date only (dd/mm/yyyy)
 * @param date - The Date object to format
 * @returns Formatted date string in IST
 */
function formatDateOnlyToIST(date: Date): string {
  // Convert to IST (UTC + 5:30)
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  
  const day = istDate.getDate().toString().padStart(2, '0');
  const month = (istDate.getMonth() + 1).toString().padStart(2, '0');
  const year = istDate.getFullYear();
  
  return `${day}/${month}/${year}`;
}

import { SCHOOL_TIMEZONE } from "@common/constants";

// Returns YYYY-MM-DD for the current date in the school's timezone.
export const getTodayInSchoolTimezone = (): string => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: SCHOOL_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    return formatter.format(new Date());
};

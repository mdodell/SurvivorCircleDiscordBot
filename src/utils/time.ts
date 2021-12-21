import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

// Timezone configuration
dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault("America/New_York");

export const cannotOpenChat = () => dayjs().hour() < 8 || dayjs().hour() > 22;

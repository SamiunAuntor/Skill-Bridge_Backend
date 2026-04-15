import app from "./app";
import { env } from "./config/env";
import { startBookingLifecycleWorker } from "./modules/booking/booking.lifecycle";
import { isMailConfigured } from "./services/email";

app.listen(env.PORT, () => {
    console.log(`Server running on port http://localhost:${env.PORT}`);

    if (isMailConfigured()) {
        console.log(
            "[mail] SMTP env looks configured - outbound email (auth + sendMail*) will use your provider."
        );
    } else {
        console.warn(
            "[mail] SMTP not configured - emails only print to this console. See .env.example."
        );
    }

    startBookingLifecycleWorker();
    console.log("[booking-lifecycle] worker started.");
});

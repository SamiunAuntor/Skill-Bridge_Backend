import express, { Request, Response } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error.middleware";
import { auth } from "./modules/auth/auth.core";
import authRouter from "./modules/auth/auth.router";
import availabilityRouter from "./modules/availability/availability.router";
import bookingRouter from "./modules/booking/booking.router";
import publicRouter from "./modules/public/public.router";
import reviewRouter from "./modules/review/review.router";
import studentRouter from "./modules/student/student.router";
import tutorRouter from "./modules/tutor/tutor.router";
import uploadRouter from "./modules/upload/upload.router";

const app: express.Application = express();

app.use(
    cors({
        origin: env.FRONTEND_URL ?? true,
        credentials: true,
    })
);

// Better Auth reads the raw body; keep it isolated from app-auth JWT routes.
app.all("/api/auth/core/{*any}", toNodeHandler(auth));

app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/students", studentRouter);
app.use("/api/tutors", tutorRouter);
app.use("/api/uploads", uploadRouter);

app.get("/", (req: Request, res: Response) => {
    res.send("SkillBridge API running 🚀");
});

app.use(errorHandler);

export default app;

import express from "express";
import cors from "cors";

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// health check route
app.get("/", (req, res) => {
    res.send("SkillBridge API running 🚀");
});

export default app;
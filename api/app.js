require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const app = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(helmet());

app.use(cors());
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));

// Root route only
app.get("/", (req, res) => {
  // res.send("King Mansa backend is working!");

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection?.remoteAddress;

  console.log("Real IP:", ip);
  console.log("Real IP:", req.headers["X-User-IP"]);
  // res.json(`King Mansa backend is working! on ip: ${req.ip},`});
  res.json({
    message: "King Mansa backend is working!",
    ip: req.ip,
    realip: ip,
  });
});

app.use(
  "/api/uploads",
  express.static(path.join(__dirname, "../public/uploads"))
);

// Routes

app.use("/static", express.static("public"));

// Error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(400).json({ message: err.message });
});

module.exports = app;

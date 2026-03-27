const express = require("express");
const cors = require("cors");
const locationIntelRouter = require("./locationIntel");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", locationIntelRouter);

app.get("/", (req, res) => {
  res.send("Backend läuft");
});

const PORT = 5174;

app.listen(PORT, () => {
  console.log(`API läuft auf http://localhost:${PORT}`);
});
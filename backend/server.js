import express from "express";
import cors from "cors";
import db from "./db.js";
import authMiddleware from "./middleware.js";
import jwt from "jsonwebtoken";
import { encodePassword, verifyPassword } from "./password.js";
import bcrypt from "bcrypt";
import "dotenv/config";
import GetDate from "./date.js";

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

app.post('/createUser', (req, res) => {
    
})

app.get("/test", (req, res) => {
  res.status(200).send("result");
});

app.listen(port, () => {
  console.log(`App listening on port http://localhost:${port}/`);
});
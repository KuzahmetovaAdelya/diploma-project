import express from "express";
import cors from "cors";
import db from "./db.js";
import authMiddleware from "./middleware.js";
import jwt from "jsonwebtoken";
import { encodePassword, verifyPassword } from "./password.js";
import bcrypt from "bcrypt";
import "dotenv/config";
import GetDate from "./date.js";
import pool from "./dbpost.js";
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import transporter from "./mailer.js";

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

// IMG UPLOADING SETTINGS
const uploadDir = path.resolve('photos')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = uuidv4() + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// METHODS
app.post('/createUser', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }

  if (req.body.password !== req.body.passwordRepeat) {
    return res.status(400).send("Passwords aren't same");
  }

  const hashedPassword = encodePassword(req.body.password);

  const role = req.body.role || 'user';

  try {
    await pool.query(
      'INSERT INTO "Users" ("fullName", login, password, role) VALUES ($1, $2, $3, $4)',
      [req.body.fullname, req.body.login, hashedPassword, role]
    );

    res.status(201).send('Created');
  } catch (err) {
    console.error(err.message);
    res.status(409).send(err.message);
  }
});

app.post("/auth", async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, password FROM "Users" WHERE login = $1',
      [req.body.login]
    );

    if (result.rows.length === 0) {
      return res.status(403).send("User not found");
    }

    const { id, password: passwordHash } = result.rows[0];
    const userPassword = req.body.password;

    const isPasswordCorrect = verifyPassword(userPassword, passwordHash);

    if (!isPasswordCorrect) {
      return res.status(403).send("Wrong password");
    }

    const token = jwt.sign(
      { userId: id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.send({ token });
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(500).send("Login failed");
  }
});

app.get("/getUsers", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Forbidden");
  }

  try {
    const result = await pool.query('SELECT * FROM "Users"');

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Ошибка при получении пользователей:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.get("/getMe", authMiddleware, (req, res) => {
  const userData = {
    fullname: req.user.fullName,
    login: req.user.login
  };
  res.status(200).send(userData);
});

app.delete("/deleteUser", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Forbidden");
  }

  try {
    const result = await pool.query(
      'DELETE FROM "Users" WHERE id = $1',
      [req.body.userId]
    );

    res.status(200).json({ error: "none" });
  } catch (err) {
    console.error("Ошибка при удалении пользователя:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.put("/updateUser", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Forbidden");
  }

  if (req.body.password !== req.body.passwordRepeat) {
    return res.status(403).send("Wrong password");
  }

  const hashedPassword = encodePassword(req.body.password);

  const role = req.body.role || "user";

  try {
    const result = await pool.query(
      `UPDATE "Users"
       SET login = $1,
           fullName = $2,
           password = $3,
           role = $4
       WHERE id = $5`,
      [
        req.body.login,
        req.body.fullname,
        hashedPassword,
        role,
        req.body.id
      ]
    );

    res.status(200).send("Updated");
  } catch (err) {
    console.error("Ошибка при обновлении пользователя:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.post('/createTeacher', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }

  try {
    await pool.query(
      `INSERT INTO "Teachers" ("fullName", unit, pmo, post, cabinet, "modelId")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.body.fullname,
        req.body.unit,
        req.body.pmo,
        req.body.post,
        req.body.cabinet,
        req.body.modelId
      ]
    );

    res.status(201).send('Created');
  } catch (err) {
    console.error('Error in teacher creation:', err.message);
    res.status(500).send(err.message);
  }
});

app.get("/getAllTeachers", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Teachers"');

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Ошибка при получении преподавателей:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.get("/getTeachersByUnit", async (req, res) => {
  try {
    const { unit } = req.query;
    if (!unit) return res.status(400).send("unit is required");

    const result = await pool.query(
      `SELECT t.*, m."model" AS "modelUrl"
       FROM "Teachers" t
       LEFT JOIN "Models" m ON t."modelId" = m."id"
       WHERE t.unit = $1`,
      [unit]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Ошибка при получении преподавателей по unit:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.put("/updateTeacher", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Forbidden");
  }

  try {
    await pool.query(
      `UPDATE "Teachers" 
       SET "fullName" = $1, 
           "unit" = $2, 
           "pmo" = $3, 
           "post" = $4, 
           "cabinet" = $5, 
           "modelId" = $6 
       WHERE "id" = $7`,
      [
        req.body.fullname,
        req.body.unit,
        req.body.pmo,
        req.body.post,
        req.body.cabinet,
        req.body.modelId,
        req.body.id
      ]
    );
    res.status(200).send("Updated");
  } catch (err) {
    console.error("Ошибка при обновлении преподавателя:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.delete('/deleteTeacher', authMiddleware, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Forbidden");
  }

  try {
    await pool.query(
      'DELETE FROM "Teachers" WHERE id = $1',
      [req.body.id]
    );
    res.status(200).json({ error: "none" });
  } catch (err) {
    console.error("Ошибка при удалении преподавателя:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.post('/uploadPhoto', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Файл не загружен');
  }

  const teacherId = req.body.teacherId;
  if (!teacherId) {
    fs.unlinkSync(req.file.path);
    return res.status(400).send('Не указан teacherId');
  }

  const photoName = req.file.filename; // содержит UUID + расширение

  try {
    const result = await pool.query(
      `INSERT INTO "Photos" ("photoName", "teacherId", "createdAt") 
       VALUES ($1, $2, NOW()) RETURNING "id"`,
      [photoName, teacherId]
    );

    const newId = result.rows[0].id; // получаем id

    res.status(201).json({
      message: 'Фото сохранено',
      id: newId,              // <-- теперь клиент получит id
      photoName,
      filePath: req.file.path
    });
  } catch (err) {
    fs.unlinkSync(req.file.path);
    console.error('Ошибка сохранения в БД:', err.message);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/photos/:photoName', (req, res) => {
  const filePath = path.join(uploadDir, req.params.photoName);
  res.sendFile(filePath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') return res.status(404).send('Not found');
      res.status(500).send('Error');
    }
  });
});

app.post('/sendPhotos', async (req, res) => {
  try {
    const { email, photos } = req.body;
    // photos = array of ids

    if (!email || !photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'Не указаны email и/или фотографии (массив id)' });
    }

    const attachments = [];

    for (const photoId of photos) {
      const result = await pool.query(
        'SELECT "photoName" FROM "Photos" WHERE "id" = $1',
        [photoId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Фото с id ${photoId} не найдено в базе` });
      }

      const photoName = result.rows[0].photoName;
      const filePath = path.resolve('photos', photoName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `Файл ${photoName} отсутствует на сервере` });
      }

      attachments.push({
        filename: photoName,
        path: filePath         
      });
    }

    const mailText = 'Поздравляем с удачным кадром! Приложение «Отражение» дарит вам возможность запомнить встречу с преподавателем в необычном формате.';

    const info = await transporter.sendMail({
      from: `"Ваше приложение" «Отражение»`,
      to: email,
      subject: 'Ваши фотографии «Отражения»',
      text: mailText,
      html: `<p>${mailText}</p>`,
      attachments
    });

    console.log('Письмо отправлено:', info.messageId);

    await pool.query(
      `INSERT INTO "UsersSendings" ("email", "photoIds", "sendDate", "emailName")
       VALUES ($1, $2::integer[], NOW(), $3)`,
      [email, photos, info.messageId]
    );

    res.json({ message: 'Письмо успешно отправлено', messageId: info.messageId });
  } catch (err) {
    console.error('Ошибка отправки письма:', err);
    res.status(500).json({ error: 'Ошибка отправки письма' });
  }
});

app.get("/test", (req, res) => {
  res.status(200).send("test success");
});

app.listen(port, () => {
  console.log(`App listening on port http://localhost:${port}/`);
});
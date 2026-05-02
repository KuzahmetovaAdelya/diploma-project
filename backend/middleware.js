import jwt from "jsonwebtoken";
import db from "./db.js";

export default function authMiddleware(req, res, next) {
  try {
    // Получаем токен из заголовка Authorization
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Верифицируем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    db.all("SELECT * FROM Users WHERE id = ?", [decoded.userId], (err, row) => {
      if (err) {
        res.status(500).send(err);
        return console.log(err.message);
      } else {
        // Добавляем данные пользователя в объект запроса
        req.user = row[0];
        next();
      }
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).send({ message: "Invalid token" });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).send({ message: "Token expired" });
    }
    return res.status(500).send({ message: "Internal server error" });
  }
}
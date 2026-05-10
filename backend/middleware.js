import jwt from "jsonwebtoken";
import pool from "./dbpost.js";

export default function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    pool.query(
      'SELECT * FROM "Users" WHERE id = $1',
      [decoded.userId],
      (err, result) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Ошибка сервера');
        }
        if (result.rows.length === 0) {
          return res.status(404).send('Пользователь не найден');
        }
        req.user = result.rows[0];
        next();
      }
    );
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


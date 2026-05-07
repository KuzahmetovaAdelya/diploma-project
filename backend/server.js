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

app.post('/createUser', authMiddleware, (req, res) => {
  let userRole = req.user.role;
  if (userRole === 'admin') {
    if (req.body.password === req.body.passwordRepeat) {
      const hashedPassword = encodePassword(req.body.password);
      let role = "user"
      if (req.body.role) {
        role = req.body.role;
      }
      db.run(
        "INSERT INTO Users(fullName, login, password, role) VALUES (?, ?, ?, ?)",
        [
          req.body.fullname,
          req.body.login,
          hashedPassword,
          role
        ],
        (err) => {
          if (err) {
            res.status(409).send(err.message)
            return console.log(err)
          }
          res.status(201).send("Created")
        }
      )
    } else {
      res.status(400).send("Passwords aren't same")
    }
  } else {
      res.status(403).send("Forbidden")
  }
})

app.post("/auth", (req, res) => {
  db.all(
    "SELECT id, password FROM Users WHERE login=?",
    [req.body.login],
    (err, rows) => {
      if (err) {
        res.status(409).send(err);
        return console.log(err.message);
      }
      if (!rows || rows.length === 0) {
        return res.status(403).send("User not found");
      }
      let passwordHash = rows[0].password;
      let userPassword = req.body.password;

      const isPasswordCorrect = verifyPassword(userPassword, passwordHash);
      if (isPasswordCorrect) {
        try {
          const id = rows[0].id;
          const token = jwt.sign(
            {
              userId: id,
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
          );
          res.send({ token });
        } catch (error) {
          res.status(500).send("Login failed");
          console.log(error);
        }
      } else {
        res.status(403).send("Wrong password");
      }
    }
  );
});

app.get("/getUsers", authMiddleware, (req, res) => {
  if (req.user.role === "admin") {
    db.all("SELECT * from users", (err, row) => {
      if (err) {
        res.status(500).send(err);
        console.log(err.message);
      } else {
        try {
          res.status(200).send(row);
        } catch (error) {
          res.status(500).send(error);
        }
      }
    });
  } else {
    res.status(403).send("Forbidden");
  }
});

app.get("/getMe", authMiddleware, (req, res) => {
  const userData = {
    fullname: req.user.fullName,
    login: req.user.login
  };
  res.status(200).send(userData);
});

app.delete("/deleteUser", authMiddleware, (req, res) => {
  if (req.user.role === "admin") {
    db.run("DELETE FROM users WHERE id = ?", [req.body.userId], (err, row) => {
      if (err) {
        res.status(500).send(err);
        return console.log(err.message);
      }
      let result = {
        error: "none",
      };
      res.status(200).send(result);
    });
  } else {
    res.status(403).send("Forbidden");
  }
});

app.put("/updateUser", authMiddleware, (req, res) => {
  if (req.user.role === "admin") {
    if (req.body.password === req.body.passwordRepeat) {
      const hashedPassword = encodePassword(req.body.password);

      let role = "user"
      if (req.body.role) {
        role = req.body.role;
      }

      db.run(
        "UPDATE users SET login = ?, fullName = ?, password = ?, role = ? WHERE id = ?",
        [
          req.body.login,
          req.body.fullname,
          hashedPassword,
          role,
          req.body.id,
        ],
        (err, row) => {
          if (err) {
            res.status(500).send(err);
            return console.log(err.message);
          }
          res.status(200).send("Updated");
        }
      );
    } else {
      res.status(403).send("Wrong password");
    }
  } else {
    res.status(403).send("Forbidden");
  }
});

app.post('/createTeacher', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    db.run("INSERT INTO Teachers(fullName, unit, pmo, post, cabinet, modelId) VALUES (?, ?, ?, ?, ?, ?)",
      [
        req.body.fullname,
        req.body.unit,
        req.body.pmo,
        req.body.post,
        req.body.cabinet,
        req.body.modelId
      ],
      (err) => {
        if (err) {
          res.status(500).send(err.message)
          return console.log(err)
        }
        res.status(201).send("Created")
      }
    )
  } else {
    res.status(403).send("Forbidden");
  }
})

app.get("/getAllTeachers", (req, res) => {
  db.all("SELECT * FROM Teachers", (err, row) => {
    if (err) {
      res.status(500).send(err);
      console.log(err.message);
    } else {
      try {
        res.status(200).send(row);
      } catch (error) {
        res.status(500).send(error);
      }
    }
  });
});

app.get("/getTeachersByUnit", (req, res) => {
  db.all("SELECT * FROM Teachers WHERE unit = ?",
    [
      req.body.unit
    ],
    (err, row) => {
      if (err) {
        res.status(500).send(err);
        console.log(err.message);
      } else {
        try {
          res.status(200).send(row);
        } catch (error) {
          res.status(500).send(error);
        }
      }
  });
});

app.put("/updateTeacher", authMiddleware, (req, res) => {
  if (req.user.role === "admin") {
    db.run(
      "UPDATE Teachers SET fullName = ?, unit = ?, pmo = ?, post = ?, cabinet = ?, modelId = ? WHERE id = ?",
      [
        req.body.fullname,
        req.body.unit,
        req.body.pmo,
        req.body.post,
        req.body.cabinet,
        req.body.modelId,
        req.body.id,
      ],
      (err, row) => {
        if (err) {
          res.status(500).send(err);
          return console.log(err.message);
        }
        res.status(200).send("Updated");
      }
    );
  } else {
    res.status(403).send("Forbidden");
  }
})

app.delete('/deleteTeacher', authMiddleware, (req, res) => {
  if (req.user.role === "admin") {
    db.run("DELETE FROM Teachers WHERE id = ?", [req.body.id], (err, row) => {
      if (err) {
        res.status(500).send(err);
        return console.log(err.message);
      }
      let result = {
        error: "none",
      };
      res.status(200).send(result);
    });
  } else {
    res.status(403).send("Forbidden");
  }
})

app.get("/test", (req, res) => {
  res.status(200).send("test success");
});

app.listen(port, () => {
  console.log(`App listening on port http://localhost:${port}/`);
});
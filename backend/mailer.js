import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',          // или 'Yandex', 'Mail.ru' и т.д.
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// Проверка подключения (опционально)
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});

export default transporter;
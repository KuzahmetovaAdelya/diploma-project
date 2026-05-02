// const bcrypt = require('bcrypt');
import bcrypt from "bcrypt";

// Number of salt rounds for bcrypt
const saltRounds = 10;

// Function to encode/hash a password
async function encodePassword(plainTextPassword) {
  try {
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(plainTextPassword, salt);
    return hashedPassword;
  } catch (error) {
    console.error("Error encoding password:", error.message);
    throw error;
  }
}

function verifyPassword(plainTextPassword, storedHashedPassword) {
  try {
    if (!plainTextPassword || !storedHashedPassword) {
      throw new Error('Both password and hash are required');
    }
    const isMatch = bcrypt.compare(plainTextPassword, storedHashedPassword);
    return isMatch;
  } catch (error) {
    console.error("Error verifying password:", error.message);
    throw error;
  }
}

export { encodePassword, verifyPassword };
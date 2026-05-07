import bcrypt from "bcrypt";

const saltRounds = 10;

async function encodePassword(plainTextPassword) {
  try {
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
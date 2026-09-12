import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("password hashing", () => {
  it("hashes a password and verifies the correct password against it", async () => {
    const hash = await bcrypt.hash("ChangeMe123!", 12);
    expect(hash).not.toBe("ChangeMe123!");
    await expect(bcrypt.compare("ChangeMe123!", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password against a hash", async () => {
    const hash = await bcrypt.hash("ChangeMe123!", 12);
    await expect(bcrypt.compare("WrongPassword", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time (salted)", async () => {
    const hashA = await bcrypt.hash("SamePassword1!", 12);
    const hashB = await bcrypt.hash("SamePassword1!", 12);
    expect(hashA).not.toBe(hashB);
  });
});

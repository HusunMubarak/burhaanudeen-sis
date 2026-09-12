import { describe, it, expect } from "vitest";
import { contactMessageSchema, schoolSettingsSchema, loginSchema } from "@/lib/validation";

describe("contactMessageSchema", () => {
  it("accepts a valid contact message", () => {
    const result = contactMessageSchema.safeParse({
      name: "Aisha Mohammed",
      email: "aisha@example.com",
      phone: "0244000000",
      subject: "Admission enquiry",
      message: "I would like to know more about JHS admission requirements.",
    });
    expect(result.success).toBe(true);
  });

  it("defaults phone to an empty string when omitted", () => {
    const result = contactMessageSchema.safeParse({
      name: "Aisha Mohammed",
      email: "aisha@example.com",
      subject: "Admission enquiry",
      message: "I would like to know more about JHS admission requirements.",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe("");
  });

  it("rejects an invalid email", () => {
    const result = contactMessageSchema.safeParse({
      name: "Aisha Mohammed",
      email: "not-an-email",
      subject: "Admission enquiry",
      message: "I would like to know more about JHS admission requirements.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short message", () => {
    const result = contactMessageSchema.safeParse({
      name: "Aisha Mohammed",
      email: "aisha@example.com",
      subject: "Hi",
      message: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing name", () => {
    const result = contactMessageSchema.safeParse({
      email: "aisha@example.com",
      subject: "Admission enquiry",
      message: "I would like to know more about JHS admission requirements.",
    });
    expect(result.success).toBe(false);
  });
});

describe("schoolSettingsSchema", () => {
  const valid = {
    name: "Burhaanudeen Islamic School",
    motto: "Knowledge, Faith, Excellence",
    logoUrl: null,
    description: "A great school",
    vision: "Vision statement",
    mission: "Mission statement",
    history: "",
    coreValues: "Faith,Excellence",
    address: "Sang, Mion District",
    town: "Sang",
    district: "Mion District",
    region: "Northern Region",
    country: "Ghana",
    phone: "024 000 0000",
    altPhone: "",
    email: "info@school.edu.gh",
    website: "",
    mapEmbedUrl: "",
    admissionFormFee: 50,
    momoNumber: "024 000 0000",
    momoNetwork: "MTN",
    momoAccountName: "Burhaanudeen Islamic School",
    facebookUrl: "",
    twitterUrl: "",
    instagramUrl: "",
  };

  it("accepts a complete valid settings object", () => {
    expect(schoolSettingsSchema.safeParse(valid).success).toBe(true);
  });

  it("allows an empty email string (email is optional)", () => {
    const result = schoolSettingsSchema.safeParse({ ...valid, email: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed non-empty email", () => {
    const result = schoolSettingsSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative admission form fee", () => {
    const result = schoolSettingsSchema.safeParse({ ...valid, admissionFormFee: -10 });
    expect(result.success).toBe(false);
  });

  it("coerces a numeric string fee to a number", () => {
    const result = schoolSettingsSchema.safeParse({ ...valid, admissionFormFee: "75.5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.admissionFormFee).toBe(75.5);
  });

  it("supports partial updates via .partial()", () => {
    const result = schoolSettingsSchema.partial().safeParse({ phone: "024 111 1111" });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials shape", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "secret" }).success).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "secret" }).success).toBe(false);
  });
});

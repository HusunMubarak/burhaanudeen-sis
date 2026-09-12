import { describe, it, expect } from "vitest";
import { formatSequenceId } from "@/lib/id-format";

describe("formatSequenceId", () => {
  it("pads the sequence number to 5 digits", () => {
    expect(formatSequenceId("BIS", 2027, 1)).toBe("BIS-2027-00001");
    expect(formatSequenceId("BIS", 2027, 125)).toBe("BIS-2027-00125");
  });

  it("does not truncate sequence numbers longer than 5 digits", () => {
    expect(formatSequenceId("BIS", 2027, 123456)).toBe("BIS-2027-123456");
  });

  it("uses the given prefix exactly", () => {
    expect(formatSequenceId("STF", 2027, 1)).toBe("STF-2027-00001");
  });

  it("embeds the given year", () => {
    expect(formatSequenceId("BIS", 2030, 1)).toBe("BIS-2030-00001");
  });

  it("rejects a sequence number below 1", () => {
    expect(() => formatSequenceId("BIS", 2027, 0)).toThrow();
    expect(() => formatSequenceId("BIS", 2027, -1)).toThrow();
  });

  it("produces distinct IDs for consecutive sequence numbers", () => {
    const a = formatSequenceId("BIS", 2027, 41);
    const b = formatSequenceId("BIS", 2027, 42);
    expect(a).not.toBe(b);
  });
});

import { describe, it, expect } from "vitest";
import { slugify, withUniqueSuffix } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Mid-Term Break Announcement")).toBe("mid-term-break-announcement");
  });

  it("strips punctuation that isn't a hyphen", () => {
    expect(slugify("Parents' Day: What to Expect!")).toBe("parents-day-what-to-expect");
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(slugify("  -- Extra   Spaces -- ")).toBe("extra-spaces");
  });

  it("falls back to a placeholder for an empty/unsafe input", () => {
    expect(slugify("")).toBe("item");
    expect(slugify("!!!")).toBe("item");
  });

  it("truncates very long titles to a sane slug length", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

describe("withUniqueSuffix", () => {
  it("appends a suffix to the given slug", () => {
    const result = withUniqueSuffix("mid-term-break");
    expect(result.startsWith("mid-term-break-")).toBe(true);
    expect(result.length).toBeGreaterThan("mid-term-break-".length);
  });

  it("produces different suffixes across calls", () => {
    const a = withUniqueSuffix("event");
    const b = withUniqueSuffix("event");
    // Extremely unlikely to collide — not a hard guarantee, just a smoke test.
    expect(a).not.toBe(b);
  });
});

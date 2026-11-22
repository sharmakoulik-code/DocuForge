import { describe, expect, it } from "vitest";
import { formatBytes, formatPercent, jsonBody } from "./api";

describe("local UI formatting", () => {
  it("formats measured bytes without inventing precision", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(8 * 1024 ** 3)).toBe("8.0 GB");
    expect(formatBytes(undefined)).toBe("—");
  });

  it("formats measured percentages", () => {
    expect(formatPercent(61.6)).toBe("62%");
    expect(formatPercent(null)).toBe("—");
  });

  it("keeps non-ASCII and CRLF data in JSON requests", () => {
    const value = "Café কলকাতা\r\nLine two";
    expect(JSON.parse(jsonBody({ topic: value })).topic).toBe(value);
  });
});

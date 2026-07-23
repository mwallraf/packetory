import { describe, expect, it } from "vitest";
import { EXPORT_FILE, serializeUuids, toCsv, toJson, toPlainText } from "./export";

const FIXTURE = ["a", "b"];

describe("toPlainText (UUID-05, D-08)", () => {
  it("newline-joins the values with no header", () => {
    expect(toPlainText(FIXTURE)).toBe("a\nb");
  });

  it("serializes a single-element array with no trailing newline (count=1, UUID-05)", () => {
    expect(toPlainText(["only"])).toBe("only");
  });
});

describe("toCsv (UUID-05, D-08)", () => {
  it("prefixes a single `uuid` header row then the newline-joined values", () => {
    expect(toCsv(FIXTURE)).toBe("uuid\na\nb");
  });

  it("serializes a single-element array as header + one value (count=1, UUID-05)", () => {
    expect(toCsv(["only"])).toBe("uuid\nonly");
  });
});

describe("toJson (UUID-05, D-08)", () => {
  it("produces a 2-space-indented bare array of raw strings, no wrapper object or metadata", () => {
    expect(toJson(FIXTURE)).toBe(JSON.stringify(FIXTURE, null, 2));
    expect(toJson(FIXTURE).startsWith("[")).toBe(true);
  });

  it("serializes a single-element array as a one-element JSON array (count=1, UUID-05)", () => {
    expect(toJson(["only"])).toBe('[\n  "only"\n]');
  });
});

describe("serializeUuids dispatcher (D-07)", () => {
  it("delegates to toPlainText for format 'text'", () => {
    expect(serializeUuids(FIXTURE, "text")).toBe(toPlainText(FIXTURE));
  });

  it("delegates to toCsv for format 'csv'", () => {
    expect(serializeUuids(FIXTURE, "csv")).toBe(toCsv(FIXTURE));
  });

  it("delegates to toJson for format 'json'", () => {
    expect(serializeUuids(FIXTURE, "json")).toBe(toJson(FIXTURE));
  });
});

describe("EXPORT_FILE metadata map (Assumption A3)", () => {
  it("maps text -> uuids.txt / text/plain", () => {
    expect(EXPORT_FILE.text).toEqual({
      filename: "uuids.txt",
      mime: "text/plain",
    });
  });

  it("maps csv -> uuids.csv / text/csv", () => {
    expect(EXPORT_FILE.csv).toEqual({
      filename: "uuids.csv",
      mime: "text/csv",
    });
  });

  it("maps json -> uuids.json / application/json", () => {
    expect(EXPORT_FILE.json).toEqual({
      filename: "uuids.json",
      mime: "application/json",
    });
  });
});

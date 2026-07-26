import type { Honorific } from "./types";
import { normalizeEmployeeCode } from "./employees";
import type { CellValue } from "read-excel-file/browser";

type ExcelCell = CellValue | null;

export type ImportedEmployee = {
  rowNumber: number;
  code: string;
  name: string;
  days: number;
  title: Honorific;
  wish: string;
  error: string | null;
};

const HEADER_ALIASES = {
  code: ["code", "ma", "ma nhan vien", "ma so nhan vien", "msnv"],
  name: ["name", "ten", "ho ten", "ho va ten", "ten nhan vien"],
  days: [
    "days",
    "so ngay",
    "so ngay dong hanh",
    "ngay dong hanh",
    "tham nien",
  ],
  title: ["title", "danh xung", "xung ho", "anh chi"],
  wish: ["wish", "loi chuc", "cau chuc", "loi chuc rieng", "cau chuc rieng"],
} as const;

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findColumn(headers: ExcelCell[], aliases: readonly string[]): number {
  return headers.findIndex((header) =>
    aliases.includes(normalizeText(header))
  );
}

function employeeCode(value: ExcelCell): string {
  const raw =
    typeof value === "number" && Number.isFinite(value)
      ? String(Math.trunc(value))
      : String(value ?? "").trim();

  return normalizeEmployeeCode(raw);
}

function honorific(value: ExcelCell): Honorific | null {
  const normalized = normalizeText(value);
  if (normalized === "anh") return "Anh";
  if (normalized === "chi") return "Chị";
  if (normalized === "mr" || normalized === "mister" || normalized === "mr.")
    return "Mr";
  if (
    normalized === "ms" ||
    normalized === "miss" ||
    normalized === "ms." ||
    normalized === "mrs" ||
    normalized === "mrs."
  )
    return "Ms";
  return null;
}

export async function readEmployeeExcel(
  file: File
): Promise<ImportedEmployee[]> {
  const { readSheet } = await import("read-excel-file/browser");
  const rows = await readSheet(file);

  if (rows.length < 2) {
    throw new Error("File Excel không có dữ liệu nhân viên.");
  }

  const headers = rows[0];
  const columns = {
    code: findColumn(headers, HEADER_ALIASES.code),
    name: findColumn(headers, HEADER_ALIASES.name),
    days: findColumn(headers, HEADER_ALIASES.days),
    title: findColumn(headers, HEADER_ALIASES.title),
    wish: findColumn(headers, HEADER_ALIASES.wish),
  };

  const missing = (Object.keys(columns) as (keyof typeof columns)[]).filter(
    (key) => columns[key] === -1
  );

  if (missing.length > 0) {
    throw new Error(
      "Thiếu cột bắt buộc. File cần có: Mã nhân viên, Họ tên, Số ngày, Danh xưng, Câu chúc."
    );
  }

  const seenCodes = new Set<string>();

  return rows
    .slice(1)
    .map((row, index): ImportedEmployee | null => {
      const values = {
        code: employeeCode(row[columns.code]),
        name: String(row[columns.name] ?? "").trim(),
        days: Number(row[columns.days]),
        title: honorific(row[columns.title]),
        wish: String(row[columns.wish] ?? "").trim(),
      };

      if (!values.code && !values.name && !row[columns.days]) return null;

      let error: string | null = null;
      if (!values.code) error = "Thiếu mã nhân viên";
      else if (!values.name) error = "Thiếu họ tên";
      else if (!Number.isInteger(values.days) || values.days < 0)
        error = "Số ngày không hợp lệ";
      else if (!values.title)
        error = "Danh xưng phải là Anh, Chị, Mr hoặc Ms";
      else if (!values.wish) error = "Thiếu câu chúc riêng";
      else if (seenCodes.has(values.code)) error = "Mã bị trùng trong file";

      seenCodes.add(values.code);

      return {
        rowNumber: index + 2,
        code: values.code,
        name: values.name,
        days: Number.isFinite(values.days) ? values.days : 0,
        title: values.title ?? "Chị",
        wish: values.wish,
        error,
      };
    })
    .filter((row): row is ImportedEmployee => row !== null);
}

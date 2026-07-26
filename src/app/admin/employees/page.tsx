"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { readEmployeeExcel, type ImportedEmployee } from "@/lib/employee-import";
import {
  normalizeEmployeeCode,
  numericCodeKey,
} from "@/lib/employees";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Employee, Honorific } from "@/lib/types";

type EmployeeDraft = Omit<Employee, "id">;
type Feedback = { type: "success" | "error"; text: string } | null;

const EMPTY_DRAFT: EmployeeDraft = {
  code: "",
  name: "",
  days: 0,
  title: "Chị",
  wish: "",
};

function normalizedDraft(draft: EmployeeDraft): EmployeeDraft {
  return {
    ...draft,
    code: normalizeEmployeeCode(draft.code),
    name: draft.name.trim().replace(/\s+/g, " "),
    days: Math.max(0, Math.trunc(Number(draft.days) || 0)),
    wish: draft.wish.trim(),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

export default function EmployeeAdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmployeeDraft>(EMPTY_DRAFT);
  const [showCreate, setShowCreate] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [importRows, setImportRows] = useState<ImportedEmployee[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [parsingFile, setParsingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("employees")
        .select("id, code, name, days, title, wish")
        .order("code");

      if (error) throw error;

      const rows = (data as Employee[]) ?? [];

      for (const row of rows) {
        const nextCode = normalizeEmployeeCode(row.code);
        if (nextCode === row.code) continue;

        const conflict = rows.find(
          (other) => other.id !== row.id && other.code === nextCode
        );

        if (conflict) {
          // Keep the already-normalized row; drop the padded duplicate.
          const { error: deleteError } = await supabase
            .from("employees")
            .delete()
            .eq("id", row.id);
          if (deleteError) throw deleteError;
          continue;
        }

        const { error: updateError } = await supabase
          .from("employees")
          .update({ code: nextCode })
          .eq("id", row.id);
        if (updateError) throw updateError;
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from("employees")
        .select("id, code, name, days, title, wish")
        .order("code");
      if (refreshError) throw refreshError;
      setEmployees((refreshed as Employee[]) ?? []);
    } catch (error) {
      setFeedback({
        type: "error",
        text: `Không tải được dữ liệu: ${errorMessage(error)}. Kiểm tra biến môi trường Supabase.`,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadEmployees();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadEmployees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    if (!query) return employees;

    return employees.filter(
      (employee) =>
        employee.code.toLocaleLowerCase("vi").includes(query) ||
        employee.name.toLocaleLowerCase("vi").includes(query) ||
        employee.title.toLocaleLowerCase("vi").includes(query)
    );
  }, [employees, search]);

  const existingCodes = useMemo(
    () => new Set(employees.map((employee) => employee.code)),
    [employees]
  );
  const validImportRows = importRows.filter((row) => !row.error);
  const invalidImportRows = importRows.length - validImportRows.length;

  const startEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setDraft({
      code: employee.code,
      name: employee.name,
      days: employee.days,
      title: employee.title,
      wish: employee.wish,
    });
    setShowCreate(false);
    setFeedback(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreate(false);
    setDraft(EMPTY_DRAFT);
  };

  const saveEmployee = async (event: FormEvent) => {
    event.preventDefault();
    const payload = normalizedDraft(draft);

    if (!payload.code || !payload.name || !payload.wish) {
      setFeedback({
        type: "error",
        text: "Mã nhân viên, họ tên và câu chúc riêng không được để trống.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    let saveError: string | null = null;
    try {
      const supabase = createBrowserClient();
      const query = editingId
        ? supabase.from("employees").update(payload).eq("id", editingId)
        : supabase.from("employees").insert(payload);
      const { error } = await query;
      if (error) saveError = error.message;
    } catch (error) {
      saveError = errorMessage(error);
    }

    if (saveError) {
      setFeedback({
        type: "error",
        text: `Không thể lưu: ${saveError}. Kiểm tra biến môi trường và migration CRUD.`,
      });
    } else {
      setFeedback({
        type: "success",
        text: editingId
          ? "Đã cập nhật nhân viên."
          : "Đã thêm nhân viên mới.",
      });
      cancelEdit();
      await loadEmployees();
    }
    setSaving(false);
  };

  const deleteEmployee = async (employee: Employee) => {
    const confirmed = window.confirm(
      `Xóa ${employee.title} ${employee.name} (${employee.code})?`
    );
    if (!confirmed) return;

    setFeedback(null);
    let deleteError: string | null = null;
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employee.id);
      if (error) deleteError = error.message;
    } catch (error) {
      deleteError = errorMessage(error);
    }

    if (deleteError) {
      setFeedback({
        type: "error",
        text: `Không thể xóa: ${deleteError}.`,
      });
      return;
    }

    setFeedback({ type: "success", text: "Đã xóa nhân viên." });
    await loadEmployees();
  };

  const handleExcelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsingFile(true);
    setImportRows([]);
    setImportFileName(file.name);
    setFeedback(null);

    try {
      const rows = await readEmployeeExcel(file);
      setImportRows(rows);
      if (rows.length === 0) {
        setFeedback({
          type: "error",
          text: "Không tìm thấy dòng dữ liệu nào trong file.",
        });
      }
    } catch (error) {
      setImportFileName("");
      setFeedback({
        type: "error",
        text:
          error instanceof Error ? error.message : "Không đọc được file Excel.",
      });
    } finally {
      setParsingFile(false);
      event.target.value = "";
    }
  };

  const importEmployees = async () => {
    if (validImportRows.length === 0) return;
    setImporting(true);
    setFeedback(null);

    let importError: string | null = null;
    let importedCount = 0;

    try {
      const supabase = createBrowserClient();
      const { data: existingRows, error: loadError } = await supabase
        .from("employees")
        .select("id, code");

      if (loadError) throw loadError;

      const existing = (existingRows as Pick<Employee, "id" | "code">[]) ?? [];

      for (const row of validImportRows) {
        const code = normalizeEmployeeCode(row.code);
        const rowKey = numericCodeKey(code);
        const match =
          existing.find((employee) => employee.code === code) ??
          (rowKey == null
            ? undefined
            : existing.find(
                (employee) => numericCodeKey(employee.code) === rowKey
              ));

        const payload = {
          code,
          name: row.name,
          days: row.days,
          title: row.title,
          wish: row.wish,
        };

        if (match) {
          const { error } = await supabase
            .from("employees")
            .update(payload)
            .eq("id", match.id);
          if (error) {
            importError = error.message;
            break;
          }
          match.code = code;
        } else {
          const { data, error } = await supabase
            .from("employees")
            .insert(payload)
            .select("id, code")
            .single();
          if (error) {
            importError = error.message;
            break;
          }
          if (data) existing.push(data as Pick<Employee, "id" | "code">);
        }

        importedCount += 1;
      }
    } catch (error) {
      importError = errorMessage(error);
    }

    if (importError) {
      setFeedback({
        type: "error",
        text: `Import thất bại: ${importError}. Kiểm tra mã trùng và migration.`,
      });
    } else {
      setFeedback({
        type: "success",
        text: `Đã import ${importedCount} nhân viên thành công.`,
      });
      setImportRows([]);
      setImportFileName("");
      await loadEmployees();
    }
    setImporting(false);
  };

  const renderFields = (prefix: string) => (
    <>
      <label className="grid gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Mã nhân viên
        </span>
        <input
          aria-label={`${prefix} mã nhân viên`}
          value={draft.code}
          onChange={(event) =>
            setDraft((current) => ({ ...current, code: event.target.value }))
          }
          className="rounded-xl border border-white/10 bg-[#07101d] px-3 py-2.5 font-mono text-sm text-[#f0cc69] outline-none transition focus:border-[#d5ae45]/60"
          placeholder="001"
        />
      </label>
      <label className="grid gap-1.5 md:col-span-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Họ và tên
        </span>
        <input
          aria-label={`${prefix} họ và tên`}
          value={draft.name}
          onChange={(event) =>
            setDraft((current) => ({ ...current, name: event.target.value }))
          }
          className="rounded-xl border border-white/10 bg-[#07101d] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#d5ae45]/60"
          placeholder="Nguyễn Văn A"
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Số ngày
        </span>
        <input
          aria-label={`${prefix} số ngày`}
          type="number"
          min={0}
          value={draft.days}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              days: Number(event.target.value),
            }))
          }
          className="rounded-xl border border-white/10 bg-[#07101d] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#d5ae45]/60"
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Danh xưng
        </span>
        <select
          aria-label={`${prefix} danh xưng`}
          value={draft.title}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              title: event.target.value as Honorific,
            }))
          }
          className="rounded-xl border border-white/10 bg-[#07101d] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#d5ae45]/60"
        >
          <option>Anh</option>
          <option>Chị</option>
          <option>Mr</option>
          <option>Ms</option>
        </select>
      </label>
      <label className="grid gap-1.5 md:col-span-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Câu chúc riêng
        </span>
        <textarea
          aria-label={`${prefix} câu chúc riêng`}
          value={draft.wish}
          onChange={(event) =>
            setDraft((current) => ({ ...current, wish: event.target.value }))
          }
          rows={2}
          className="resize-none rounded-xl border border-white/10 bg-[#07101d] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#d5ae45]/60"
          placeholder="luôn vững bước, lan tỏa giá trị và cùng MB Life tiến bước rực rỡ, vạn dặm thăng hoa."
        />
      </label>
    </>
  );

  return (
    <main className="min-h-dvh bg-[#050a14] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(32,72,120,0.2),transparent_34%),radial-gradient(circle_at_90%_20%,rgba(202,164,70,0.08),transparent_28%)]" />

      <header className="relative border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/50 transition hover:border-white/25 hover:text-white"
              aria-label="Về trang chủ"
            >
              ←
            </Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#d5ae45]">
                MB Life Operations
              </p>
              <h1 className="mt-1 text-xl font-semibold md:text-2xl">
                Quản lý nhân viên
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-white/40 sm:flex">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Chế độ demo công khai
          </div>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-7xl gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/45">
                {employees.length} hồ sơ · đồng bộ trực tiếp với Supabase
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none placeholder:text-white/25 focus:border-[#d5ae45]/50 sm:w-64"
                placeholder="Tìm mã hoặc họ tên…"
              />
              <button
                type="button"
                onClick={() => {
                  setShowCreate(true);
                  setEditingId(null);
                  setDraft(EMPTY_DRAFT);
                  setFeedback(null);
                }}
                className="shrink-0 rounded-xl bg-[#d5ae45] px-4 py-2.5 text-sm font-semibold text-[#07101d] transition hover:bg-[#ebca6b]"
              >
                + Thêm mới
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                feedback.type === "error"
                  ? "border-red-400/25 bg-red-400/10 text-red-200"
                  : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
              }`}
            >
              {feedback.text}
            </div>
          )}

          {showCreate && (
            <form
              onSubmit={saveEmployee}
              className="mt-4 rounded-2xl border border-[#d5ae45]/25 bg-[#0b1526] p-4 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-[#efd276]">
                  Thêm nhân viên mới
                </h2>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-xs text-white/40 hover:text-white"
                >
                  Hủy
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                {renderFields("Thêm")}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-4 rounded-xl bg-[#d5ae45] px-5 py-2.5 text-sm font-semibold text-[#07101d] disabled:opacity-50"
              >
                {saving ? "Đang lưu…" : "Lưu nhân viên"}
              </button>
            </form>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#091322]/80 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.025] text-[10px] uppercase tracking-[0.16em] text-white/35">
                    <th className="px-5 py-4 font-medium">Mã</th>
                    <th className="px-5 py-4 font-medium">Danh xưng</th>
                    <th className="px-5 py-4 font-medium">Họ và tên</th>
                    <th className="px-5 py-4 text-center font-medium">
                      Số ngày
                    </th>
                    <th className="px-5 py-4 font-medium">Câu chúc riêng</th>
                    <th className="px-5 py-4 text-right font-medium">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-16 text-center text-sm text-white/35"
                      >
                        Đang tải dữ liệu…
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-16 text-center text-sm text-white/35"
                      >
                        Không tìm thấy nhân viên.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) =>
                      editingId === employee.id ? (
                        <tr
                          key={employee.id}
                          className="border-b border-[#d5ae45]/20 bg-[#d5ae45]/[0.06]"
                        >
                          <td colSpan={6} className="p-4">
                            <form
                              onSubmit={saveEmployee}
                              className="grid items-end gap-3 md:grid-cols-5"
                            >
                              {renderFields("Sửa")}
                              <div className="flex gap-2 md:col-span-5">
                                <button
                                  type="submit"
                                  disabled={saving}
                                  className="rounded-lg bg-[#d5ae45] px-4 py-2 text-xs font-semibold text-[#07101d] disabled:opacity-50"
                                >
                                  {saving ? "Đang lưu…" : "Lưu thay đổi"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/60 hover:bg-white/5"
                                >
                                  Hủy
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={employee.id}
                          className="border-b border-white/[0.06] transition last:border-0 hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4 font-mono text-sm font-semibold text-[#e5c45f]">
                            {employee.code}
                          </td>
                          <td className="px-5 py-4 text-sm text-white/45">
                            {employee.title}
                          </td>
                          <td className="px-5 py-4 text-sm font-medium">
                            {employee.name}
                          </td>
                          <td className="px-5 py-4 text-center text-sm text-white/60">
                            {employee.days}
                          </td>
                          <td className="max-w-[240px] truncate px-5 py-4 text-sm text-white/50">
                            {employee.wish}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEdit(employee)}
                                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/55 transition hover:border-white/25 hover:text-white"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteEmployee(employee)}
                                className="rounded-lg border border-red-400/10 px-3 py-1.5 text-xs text-red-300/55 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-200"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="self-start rounded-2xl border border-white/10 bg-[#091322]/90 p-5 shadow-2xl lg:sticky lg:top-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d5ae45]">
                Import dữ liệu
              </p>
              <h2 className="mt-1 text-lg font-semibold">Upload Excel</h2>
            </div>
            <span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-white/35">
              .XLSX
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-white/40">
            Cột bắt buộc: <strong className="text-white/65">Mã nhân viên</strong>
            , <strong className="text-white/65">Họ tên</strong>,{" "}
            <strong className="text-white/65">Số ngày</strong>,{" "}
            <strong className="text-white/65">Danh xưng</strong> và{" "}
            <strong className="text-white/65">Câu chúc riêng</strong>. Mã
            trùng sẽ được cập nhật.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleExcelFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsingFile || importing}
            className="mt-5 w-full rounded-xl border border-dashed border-[#d5ae45]/35 bg-[#d5ae45]/[0.06] px-4 py-6 text-sm text-[#e9cb70] transition hover:border-[#d5ae45]/65 hover:bg-[#d5ae45]/10 disabled:opacity-50"
          >
            {parsingFile ? "Đang đọc file…" : "Chọn file Excel"}
          </button>

          {importRows.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {importFileName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/35">
                    {validImportRows.length} hợp lệ
                    {invalidImportRows > 0
                      ? ` · ${invalidImportRows} lỗi`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImportRows([]);
                    setImportFileName("");
                  }}
                  className="text-xs text-white/35 hover:text-white"
                >
                  Xóa
                </button>
              </div>

              <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {importRows.map((row) => (
                  <div
                    key={`${row.rowNumber}-${row.code}`}
                    className={`rounded-lg border px-3 py-2 ${
                      row.error
                        ? "border-red-400/20 bg-red-400/[0.06]"
                        : "border-white/[0.07] bg-white/[0.025]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[#e3c35f]">
                        {row.code || `Dòng ${row.rowNumber}`}
                      </span>
                      {!row.error && (
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/35">
                          {existingCodes.has(row.code)
                            ? "Cập nhật"
                            : "Thêm mới"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-white/70">
                      {row.title} {row.name} · {row.days} ngày
                    </p>
                    {row.error && (
                      <p className="mt-1 text-[10px] text-red-300">
                        Dòng {row.rowNumber}: {row.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void importEmployees()}
                disabled={importing || validImportRows.length === 0}
                className="mt-4 w-full rounded-xl bg-[#d5ae45] px-4 py-3 text-sm font-semibold text-[#07101d] transition hover:bg-[#ebca6b] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importing
                  ? "Đang import…"
                  : `Import ${validImportRows.length} nhân viên`}
              </button>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300/70">
              Lưu ý bảo mật
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
              Trang đang dùng quyền ghi công khai theo cấu hình demo. Không dùng
              cho production khi chưa thêm đăng nhập admin.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

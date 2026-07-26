import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#050a14] px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.45em] text-[#c9a84c]/80">
        MB Life Event
      </p>
      <h1 className="mt-4 text-4xl font-semibold text-white md:text-5xl">
        Photobooth
      </h1>
      <p className="mt-3 max-w-md text-white/50">

      </p>

      <div className="mt-12 flex w-full max-w-md flex-col gap-4">
        <Link
          href="/input"
          className="rounded-2xl border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-8 py-5 text-lg font-medium text-[#e8c96a] transition hover:bg-[#c9a84c]/20"
        >
          iPad — Nhập mã nhân viên
        </Link>
        <Link
          href="/display"
          className="rounded-2xl border border-white/15 bg-white/5 px-8 py-5 text-lg font-medium text-white transition hover:bg-white/10"
        >
          LED — Màn hình sân khấu
        </Link>
        <Link
          href="/admin/employees"
          className="rounded-2xl border border-white/10 px-8 py-4 text-sm font-medium text-white/55 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
        >
          Quản trị — Danh sách nhân viên
        </Link>
      </div>
    </main>
  );
}

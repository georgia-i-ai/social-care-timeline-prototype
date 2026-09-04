"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { CaseSummary, createCase, listCases } from "@/lib/api";

export function Sidebar() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  function refresh() {
    listCases()
      .then(setCases)
      .catch(() => {});
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const created = await createCase(name.trim());
      setName("");
      refresh();
      router.push(`/cases/${created.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 p-4 space-y-4">
      <div>
        <h1 className="font-semibold text-gray-800">Case Timeline Prototype</h1>
        <p className="text-xs text-gray-500 mt-1">
          Tinkering demo - synthetic data only, no real case system.
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">Cases</h2>
        <ul className="space-y-1">
          {cases.map((c) => {
            const active = pathname === `/cases/${c.id}`;
            return (
              <li key={c.id}>
                <Link
                  href={`/cases/${c.id}`}
                  className={`block rounded px-2 py-1 text-sm ${
                    active ? "bg-blue-100 font-medium text-blue-900" : "hover:bg-gray-100"
                  }`}
                >
                  {c.name}
                </Link>
              </li>
            );
          })}
          {cases.length === 0 && <li className="text-sm text-gray-400">No cases yet.</li>}
        </ul>
      </div>

      <div className="space-y-2 border-t border-gray-200 pt-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New case name"
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          disabled={!name.trim() || creating}
          onClick={handleCreate}
          className="w-full rounded bg-blue-600 text-white px-2 py-1 text-sm disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create case"}
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CaseSummary, listCases } from "@/lib/api";
import { IMPORTANCE_DOT, flaggedSummary, topImportance } from "@/lib/importance";

export default function Home() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCases()
      .then(setCases)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Cases</h1>
        <p className="text-sm text-gray-600">
          All cases and the items each has flagged for reviewer attention. These are
          reviewer-priority counts, not a risk score. Tinkering demo - synthetic data only.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {cases === null && !error && <p className="text-sm text-gray-500">Loading...</p>}

      {cases !== null && cases.length === 0 && (
        <p className="text-gray-600">
          No cases yet. Create one in the sidebar to get started.
        </p>
      )}

      {cases !== null && cases.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cases.map((c) => {
            const top = topImportance(c);
            return (
              <li key={c.id}>
                <Link
                  href={`/cases/${c.id}`}
                  className="flex items-start gap-3 rounded border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <span
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                      top ? IMPORTANCE_DOT[top] : "bg-gray-300"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">{c.name}</span>
                    <span className="block text-sm text-gray-500">{flaggedSummary(c)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

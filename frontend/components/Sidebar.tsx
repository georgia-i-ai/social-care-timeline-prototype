"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button, Input } from "@i-dot-ai-npm/component-library-react";
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

  // The kit's side-nav components ship no CSS and render plain <a> (full page
  // reloads), so this is a GOV.UK list of next/link links instead.
  const item = (href: string, label: string, current: boolean) => (
    <li
      key={href}
      style={{
        borderLeft: `4px solid ${current ? "#1d70b8" : "transparent"}`,
        paddingLeft: 10,
      }}
    >
      <Link
        className={`govuk-link govuk-link--no-visited-state govuk-link--no-underline ${
          current ? "govuk-!-font-weight-bold" : ""
        }`}
        href={href}
        aria-current={current ? "page" : undefined}
      >
        {label}
      </Link>
    </li>
  );

  return (
    <aside style={{ width: 260, flexShrink: 0 }} className="govuk-!-padding-top-6 govuk-!-padding-right-4">
      <div className="govuk-!-margin-bottom-6">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New case name"
          aria-label="New case name"
        />
        <div className="govuk-!-margin-top-2">
          <Button small type="button" disabled={!name.trim() || creating} onClick={handleCreate}>
            {creating ? "Creating..." : "Create case"}
          </Button>
        </div>
      </div>

      <nav aria-label="Cases">
        <ul className="govuk-list govuk-list--spaced">
          {item("/", "All cases", pathname === "/")}
          {cases.map((c) => item(`/cases/${c.id}`, c.name, pathname === `/cases/${c.id}`))}
        </ul>
      </nav>
      {cases.length === 0 && <p className="govuk-hint">No cases yet.</p>}
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button, Input, ServiceNavigation } from "@i-dot-ai-npm/component-library-react";
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

  // next/link rather than the kit's ServiceNavigationItem (a plain <a>), to keep
  // client-side navigation; the kit's CSS classes still style it.
  const item = (href: string, label: string, current: boolean) => (
    <li
      key={href}
      className={`govuk-service-navigation__item ${
        current ? "govuk-service-navigation__item--active" : ""
      }`}
    >
      <Link
        className="govuk-service-navigation__link"
        href={href}
        aria-current={current ? "page" : undefined}
      >
        {current ? <strong className="govuk-service-navigation__active-fallback">{label}</strong> : label}
      </Link>
    </li>
  );

  return (
    <aside style={{ width: 260, flexShrink: 0 }} className="govuk-!-padding-top-6 govuk-!-padding-right-4">
      <ServiceNavigation sideNav navigationId="case-navigation" ariaLabel="Cases">
        {item("/", "All cases", pathname === "/")}
        {cases.map((c) => item(`/cases/${c.id}`, c.name, pathname === `/cases/${c.id}`))}
      </ServiceNavigation>
      {cases.length === 0 && <p className="govuk-hint">No cases yet.</p>}

      <div className="govuk-!-margin-top-6">
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
    </aside>
  );
}

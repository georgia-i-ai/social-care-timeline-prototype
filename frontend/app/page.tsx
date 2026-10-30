"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardGroup, CardHeading } from "@i-dot-ai-npm/component-library-react";
import { CaseSummary, listCases } from "@/lib/api";
import { IMPORTANCE_DOT, IMPORTANCE_LEVELS, IMPORTANCE_TEXT } from "@/lib/importance";

const LEVEL_LABEL: Record<string, string> = { high: "high", medium: "med", low: "low" };

/** One equal-width segment per event, oldest left, so a case turning red shows at the right. */
function PriorityBar({ timeline }: { timeline: string[] }) {
  if (timeline.length === 0) {
    return <div className="h-2.5 rounded bg-gray-200" aria-hidden />;
  }
  return (
    <div
      className="flex h-2.5 overflow-hidden rounded"
      role="img"
      aria-label={`Flagged items, oldest to newest: ${timeline.join(", ")}`}
    >
      {timeline.map((importance, i) => (
        <span key={i} className={`flex-1 ${IMPORTANCE_DOT[importance] ?? "bg-gray-300"}`} />
      ))}
    </div>
  );
}

function PriorityCounts({ c }: { c: CaseSummary }) {
  const total = c.high + c.medium + c.low;
  if (total === 0) return <p className="govuk-hint govuk-!-margin-bottom-0">No items flagged</p>;
  return (
    <p className="govuk-body-s govuk-!-margin-bottom-0 govuk-!-margin-top-2">
      {IMPORTANCE_LEVELS.filter((level) => c[level] > 0).map((level, i) => (
        <span key={level} className={`${IMPORTANCE_TEXT[level]} govuk-!-font-weight-bold`}>
          {i > 0 && <span className="text-gray-400"> · </span>}
          {c[level]} {LEVEL_LABEL[level]} ({Math.round((c[level] / total) * 100)}%)
        </span>
      ))}
    </p>
  );
}

export default function Home() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCases()
      .then(setCases)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <>
      <h1 className="govuk-heading-l">Cases</h1>
      <p className="govuk-body">
        All cases and the items each has flagged for reviewer attention. Each bar runs from
        the oldest flagged item (left) to the newest (right). These are reviewer-priority
        counts, not a risk score. Tinkering demo - synthetic data only.
      </p>

      {error && <p className="govuk-error-message">{error}</p>}
      {cases === null && !error && <p className="govuk-body">Loading...</p>}

      {cases !== null && cases.length === 0 && (
        <p className="govuk-body">No cases yet. Create one in the sidebar to get started.</p>
      )}

      {cases !== null && cases.length > 0 && (
        <CardGroup>
          {cases.map((c) => (
            <Card key={c.id}>
              <CardHeading>
                <h2 className="govuk-heading-m">
                  <Link className="iai-card__link" href={`/cases/${c.id}`}>
                    {c.name}
                  </Link>
                </h2>
              </CardHeading>
              <CardContent>
                <PriorityBar timeline={c.timeline} />
                <PriorityCounts c={c} />
              </CardContent>
            </Card>
          ))}
        </CardGroup>
      )}
    </>
  );
}

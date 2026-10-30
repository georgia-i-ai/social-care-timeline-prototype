"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardGroup,
  CardHeading,
  Tag,
} from "@i-dot-ai-npm/component-library-react";
import { CaseSummary, listCases } from "@/lib/api";
import { IMPORTANCE_TAG, flaggedSummary, topImportance } from "@/lib/importance";

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
        All cases and the items each has flagged for reviewer attention. These are
        reviewer-priority counts, not a risk score. Tinkering demo - synthetic data only.
      </p>

      {error && <p className="govuk-error-message">{error}</p>}
      {cases === null && !error && <p className="govuk-body">Loading...</p>}

      {cases !== null && cases.length === 0 && (
        <p className="govuk-body">No cases yet. Create one in the sidebar to get started.</p>
      )}

      {cases !== null && cases.length > 0 && (
        <CardGroup>
          {cases.map((c) => {
            const top = topImportance(c);
            return (
              <Card key={c.id}>
                <CardHeading>
                  <h2 className="govuk-heading-m">
                    <Link className="iai-card__link" href={`/cases/${c.id}`}>
                      {c.name}
                    </Link>
                  </h2>
                </CardHeading>
                <CardContent>
                  <Tag colour={top ? IMPORTANCE_TAG[top] : "grey"}>{flaggedSummary(c)}</Tag>
                </CardContent>
              </Card>
            );
          })}
        </CardGroup>
      )}
    </>
  );
}

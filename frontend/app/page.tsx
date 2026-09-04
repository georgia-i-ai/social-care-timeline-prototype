"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listCases } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    listCases()
      .then((cases) => {
        if (cases.length > 0) {
          router.replace(`/cases/${cases[0].id}`);
        } else {
          setChecked(true);
        }
      })
      .catch(() => setChecked(true));
  }, [router]);

  if (!checked) return null;

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Case Timeline Prototype</h1>
      <p className="text-gray-600">
        Create a case in the sidebar to get started. Tinkering demo - not connected to any
        real case system; use synthetic data only.
      </p>
    </div>
  );
}

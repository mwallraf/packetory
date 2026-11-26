import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiffSmoke } from "./DiffSmoke";

export const metadata: Metadata = {
  title: "Text diff worker smoke harness",
  robots: { index: false, follow: false },
};

export default function DiffSmokePage() {
  if (process.env.DIFF_SMOKE !== "1") notFound();
  return <DiffSmoke />;
}

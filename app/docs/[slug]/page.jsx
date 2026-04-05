// app/docs/[slug]/page.jsx
// Reads .md files from /content and renders them with Markdoc.

import fs from "fs";
import path from "path";
import Markdoc from "@markdoc/markdoc";
import React from "react";
import { Callout } from "../../../components/Callout";
import { callout } from "../../../markdoc.config";

const CONTENT_DIR = path.join(process.cwd(), "content");

// Tell Next.js which slugs to pre-render at build time
export async function generateStaticParams() {
  const files = fs.readdirSync(CONTENT_DIR);
  return files
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, "") }));
}

export default function DocPage({ params }) {
  const filePath = path.join(CONTENT_DIR, `${params.slug}.md`);
  const source = fs.readFileSync(filePath, "utf8");

  const ast = Markdoc.parse(source);
  const content = Markdoc.transform(ast, {
    tags: { callout },
  });

  const rendered = Markdoc.renderers.react(content, React, {
    components: { Callout },
  });

  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 1rem" }}>
      {rendered}
    </main>
  );
}
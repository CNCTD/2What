// markdoc.config.js
// Register custom Markdoc tags here. Each tag maps to a React component.

import { Tag } from "@markdoc/markdoc";

export const callout = {
  render: "Callout",
  description: "A callout block for notes, warnings, and tips.",
  children: ["paragraph", "tag", "list"],
  attributes: {
    type: {
      type: String,
      default: "note",
      matches: ["note", "warning", "tip", "danger"],
      errorLevel: "critical",
    },
  },
};
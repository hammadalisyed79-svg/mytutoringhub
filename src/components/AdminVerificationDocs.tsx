"use client";

import { useState } from "react";
import {
  formatVerifySlotLabel,
  parseVerificationDocs,
  type ParsedVerifyFile,
} from "@/lib/verification-docs";

function docKind(url: string): "image" | "pdf" {
  return /\.pdf(\?|$)/i.test(url) ? "pdf" : "image";
}

function VerifyDocPreview({ doc }: { doc: ParsedVerifyFile }) {
  const [failed, setFailed] = useState(false);
  const label = formatVerifySlotLabel(doc.slot, doc.side, doc.idType);
  const kind = docKind(doc.url);

  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noreferrer"
      className="admin-verify-doc-card"
      title={`Open ${label}`}
    >
      <div className="admin-verify-doc-preview">
        {kind === "pdf" || failed ? (
          <div className="admin-verify-doc-file">
            <span className="admin-verify-doc-file-icon" aria-hidden>
              📄
            </span>
            <span>{kind === "pdf" ? "PDF document" : "View document"}</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.url}
            alt={label}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="admin-verify-doc-meta">
        <strong>{label}</strong>
        <span>Open full size ↗</span>
      </div>
    </a>
  );
}

export function AdminVerificationDocs({
  docUrls,
  notes,
}: {
  docUrls?: string | null;
  notes?: string | null;
}) {
  const docs = parseVerificationDocs(docUrls);

  if (!docs.length) {
    if (!docUrls?.trim()) return <p className="muted">No documents attached.</p>;
    return (
      <div className="admin-verify-docs-fallback">
        <p className="muted">Could not parse document list. Raw submission:</p>
        <pre>{docUrls}</pre>
      </div>
    );
  }

  return (
    <div className="admin-verify-docs">
      <p className="admin-verify-docs-count">
        <strong>{docs.length}</strong> document{docs.length === 1 ? "" : "s"} attached
      </p>
      <div className="admin-verify-docs-grid">
        {docs.map((doc) => (
          <VerifyDocPreview key={`${doc.slot}-${doc.side}-${doc.url}`} doc={doc} />
        ))}
      </div>
      {notes?.trim() ? (
        <p className="admin-verify-notes">
          <strong>Tutor note:</strong> {notes}
        </p>
      ) : null}
    </div>
  );
}

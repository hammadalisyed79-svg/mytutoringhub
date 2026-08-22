import { PastPaperBuyButton } from "@/components/PastPaperBuyButton";
import { documentTypeLabel } from "@/lib/past-papers/stored-filename";
import {
  documentTypeShortLabel,
  groupPapersByYearSessionComponent,
  type GroupablePaper,
} from "@/lib/past-papers/group-papers";

type PaperRow = GroupablePaper & {
  subject: string;
  board: string;
  syllabusCode?: string | null;
  session: string | null;
};

export function PastPaperResultList({
  papers,
  ownedKeys,
  feeLabel,
  signedIn,
  isAdmin,
}: {
  papers: PaperRow[];
  ownedKeys: Set<string>;
  feeLabel: string;
  signedIn: boolean;
  isAdmin?: boolean;
}) {
  if (papers.length === 0) {
    return (
      <p className="muted">No uploaded papers matched. Catalog listings without files stay “Coming soon”.</p>
    );
  }

  const groups = groupPapersByYearSessionComponent(papers);

  return (
    <div className="paper-results-grouped">
      {groups.map((yearGroup) => (
        <section key={yearGroup.year} className="paper-year-block">
          <h3 className="paper-year-heading">{yearGroup.year}</h3>
          {yearGroup.sessions.map((sessionGroup) => (
            <div key={`${yearGroup.year}-${sessionGroup.session}`} className="paper-session">
              <h4 className="paper-session-heading">{sessionGroup.session}</h4>
              {sessionGroup.components.map((component) => (
                <div
                  key={`${yearGroup.year}-${sessionGroup.session}-${component.componentCode}`}
                  className="paper-component-block"
                >
                  <p className="paper-component-label">
                    {component.componentCode === "other"
                      ? "Supporting documents"
                      : `Paper ${component.componentCode}`}
                  </p>
                  <div className="paper-rows">
                    {component.papers.map((paper) => {
                      const row = paper as PaperRow;
                      return (
                        <article key={row.id} className="paper-row">
                          <div>
                            <h3>
                              {row.subject} · {documentTypeShortLabel(row.documentType, row.paperType)}
                            </h3>
                            <p className="muted">
                              {row.board}
                              {row.syllabusCode ? ` · ${row.syllabusCode}` : ""}
                              {documentTypeLabel(row.documentType)
                                ? ` · ${documentTypeLabel(row.documentType)}`
                                : ""}
                            </p>
                          </div>
                          <PastPaperBuyButton
                            catalogKey={row.catalogKey}
                            available
                            owned={ownedKeys.has(row.catalogKey) || Boolean(isAdmin)}
                            feeLabel={feeLabel}
                            signedIn={signedIn}
                          />
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

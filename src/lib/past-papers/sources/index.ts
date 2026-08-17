import { manualUploadAdapter } from "./manual-upload";
import { urlListAdapter } from "./url-list";
import {
  aqaAdapter,
  cambridgeBoardAdapter,
  cbseAdapter,
  fbiseAdapter,
  pearsonAdapter,
  SourceNotEnabledError,
} from "./stubs";
import type { PastPaperSourceId, SourceAdapter } from "../types";

export { SourceNotEnabledError };

const ADAPTERS: SourceAdapter[] = [
  manualUploadAdapter,
  urlListAdapter,
  cambridgeBoardAdapter,
  aqaAdapter,
  pearsonAdapter,
  cbseAdapter,
  fbiseAdapter,
];

export function listSourceAdapters() {
  return ADAPTERS.map((adapter) => ({
    id: adapter.id,
    label: adapter.label,
    enabled: adapter.enabled,
  }));
}

export function getSourceAdapter(id: PastPaperSourceId | string): SourceAdapter {
  const adapter = ADAPTERS.find((row) => row.id === id);
  if (!adapter) throw new Error(`Unknown source: ${id}`);
  return adapter;
}

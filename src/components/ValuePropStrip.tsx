import { VALUE_PROPOSITION_SHORT } from "@/lib/marketing-copy";

export function ValuePropStrip({ className }: { className?: string }) {
  return (
    <p className={`value-prop-strip${className ? ` ${className}` : ""}`}>
      {VALUE_PROPOSITION_SHORT}
    </p>
  );
}

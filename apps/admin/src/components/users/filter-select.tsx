"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * A labelled dropdown filter.
 *
 * The label is visible and tied to the trigger by `htmlFor`/`id` rather than
 * being a placeholder: five adjacent dropdowns reading "All" tell nobody what
 * they filter, and a placeholder disappears the moment a value is chosen.
 */
export function FilterSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  className = "w-40",
}: {
  id: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {/* Base UI hands back `string | null`; these filters always have a value,
          so a null selection falls back to the first option. */}
      <Select value={value} onValueChange={(next) => onChange((next ?? options[0].value) as T)}>
        <SelectTrigger id={id} className={className}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

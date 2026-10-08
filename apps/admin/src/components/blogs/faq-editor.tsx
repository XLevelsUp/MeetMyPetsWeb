"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { BLOG_LIMITS, type BlogFaqItem } from "@/lib/blog-contract";

const f = copy.blogs.editor.fields;

export function FaqEditor({ value, onChange }: { value: BlogFaqItem[]; onChange: (items: BlogFaqItem[]) => void }) {
  function update(index: number, patch: Partial<BlogFaqItem>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">{f.faqHint}</p>
      {value.map((item, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`faq-q-${index}`}>
              {f.faqQuestion} {index + 1}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${f.faqRemove} ${index + 1}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <Input
            id={`faq-q-${index}`}
            value={item.q}
            maxLength={BLOG_LIMITS.faqQuestion}
            onChange={(event) => update(index, { q: event.target.value })}
          />
          <Label htmlFor={`faq-a-${index}`} className="sr-only">
            {f.faqAnswer} {index + 1}
          </Label>
          <Textarea
            id={`faq-a-${index}`}
            rows={2}
            placeholder={f.faqAnswer}
            value={item.a}
            maxLength={BLOG_LIMITS.faqAnswer}
            onChange={(event) => update(index, { a: event.target.value })}
          />
        </div>
      ))}
      {value.length < BLOG_LIMITS.faq ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...value, { q: "", a: "" }])}
        >
          <Plus className="mr-1 size-3.5" aria-hidden="true" />
          {f.faqAdd}
        </Button>
      ) : null}
    </div>
  );
}

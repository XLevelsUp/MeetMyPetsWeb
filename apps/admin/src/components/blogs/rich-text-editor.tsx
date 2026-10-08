"use client";

import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, mergeAttributes, Node, useEditor, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  Bold,
  Columns3,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  MousePointerClick,
  Pilcrow,
  Quote,
  Redo2,
  Rows3,
  Table as TableIcon,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { copy } from "@/config/admin";
import { isSafeHref, type BlogDoc } from "@/lib/blog-content";
import { IMAGE_UPLOAD } from "@/lib/blog-contract";
import { cn } from "@/lib/utils";

const t = copy.blogs.editor.toolbar;

/**
 * Call-to-action button block — the `cta` block the original static posts
 * used ("Join the MeetMyPets Waitlist" → /#waitlist). An atom: its label and
 * link are attributes, edited through the toolbar, not typed inline.
 */
const CallToAction = Node.create({
  name: "cta",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return { label: { default: "" }, href: { default: "/#waitlist" } };
  },
  parseHTML() {
    return [
      {
        tag: "a[data-cta]",
        getAttrs: (element) => {
          const href = element.getAttribute("href");
          return isSafeHref(href) ? { label: element.textContent ?? "", href } : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes({ "data-cta": "", class: "blog-editor-cta", href: HTMLAttributes.href }),
      HTMLAttributes.label,
    ];
  },
});

/**
 * Only what the public renderer understands is switchable here: H2–H4 (H1 is
 * the page title), bold, italic, links, lists, quotes, images, tables, CTA
 * blocks. Underline, strike and code are disabled rather than silently
 * stripped on save, so what an editor sees is what gets published.
 */
function extensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        isAllowedUri: (url) => isSafeHref(url),
      },
    }),
    Image.configure({ inline: false, allowBase64: false }),
    TableKit.configure({ table: { resizable: false } }),
    CallToAction,
  ];
}

function ToolButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  );
}

function Toolbar({ editor, onPickImage, uploading }: { editor: Editor; onPickImage: () => void; uploading: boolean }) {
  const chain = () => editor.chain().focus();
  const inTable = editor.isActive("table");

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt(t.linkPrompt, previous ?? "https://");
    if (href === null) return;
    if (href.trim() === "") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!isSafeHref(href)) {
      toast.error(t.linkInvalid);
      return;
    }
    chain().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  function insertCta() {
    const label = window.prompt(t.ctaLabelPrompt, "Join the MeetMyPets Waitlist");
    if (!label?.trim()) return;
    const href = window.prompt(t.ctaHrefPrompt, "/#waitlist");
    if (href === null) return;
    if (!isSafeHref(href)) {
      toast.error(t.linkInvalid);
      return;
    }
    chain().insertContent({ type: "cta", attrs: { label: label.trim(), href: href.trim() } }).run();
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-background/95 p-1 backdrop-blur"
    >
      <ToolButton icon={Pilcrow} label={t.paragraph} active={editor.isActive("paragraph")} onClick={() => chain().setParagraph().run()} />
      <ToolButton icon={Heading2} label={t.h2} active={editor.isActive("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <ToolButton icon={Heading3} label={t.h3} active={editor.isActive("heading", { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <ToolButton icon={Heading4} label={t.h4} active={editor.isActive("heading", { level: 4 })} onClick={() => chain().toggleHeading({ level: 4 }).run()} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolButton icon={Bold} label={t.bold} active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()} />
      <ToolButton icon={Italic} label={t.italic} active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()} />
      <ToolButton icon={Link2} label={t.link} active={editor.isActive("link")} onClick={setLink} />
      <ToolButton icon={Link2Off} label={t.unlink} disabled={!editor.isActive("link")} onClick={() => chain().unsetLink().run()} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolButton icon={List} label={t.bulletList} active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()} />
      <ToolButton icon={ListOrdered} label={t.orderedList} active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()} />
      <ToolButton icon={Quote} label={t.blockquote} active={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()} />
      <ToolButton icon={Minus} label={t.rule} onClick={() => chain().setHorizontalRule().run()} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolButton icon={ImagePlus} label={t.image} disabled={uploading} onClick={onPickImage} />
      <ToolButton icon={MousePointerClick} label={t.cta} onClick={insertCta} />
      <ToolButton
        icon={TableIcon}
        label={t.table}
        disabled={inTable}
        onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      />
      {inTable ? (
        <>
          <ToolButton icon={Rows3} label={t.addRow} onClick={() => chain().addRowAfter().run()} />
          <ToolButton icon={Columns3} label={t.addColumn} onClick={() => chain().addColumnAfter().run()} />
          <ToolButton icon={Trash2} label={t.deleteTable} onClick={() => chain().deleteTable().run()} />
        </>
      ) : null}
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolButton icon={Undo2} label={t.undo} disabled={!editor.can().undo()} onClick={() => chain().undo().run()} />
      <ToolButton icon={Redo2} label={t.redo} disabled={!editor.can().redo()} onClick={() => chain().redo().run()} />
    </div>
  );
}

/**
 * The article body editor. Emits TipTap JSON; the server re-sanitises it
 * against the same whitelist (lib/blog-content.ts) before storing, so nothing
 * here is trusted.
 *
 * Uncontrolled after mount: `initialContent` seeds it once, and the parent
 * hears about changes through `onChange`. Re-feeding content on every
 * keystroke would reset the cursor.
 */
export function RichTextEditor({
  id,
  initialContent,
  onChange,
  onUploadImage,
  labelledBy,
}: {
  id: string;
  initialContent: BlogDoc;
  onChange: (doc: BlogDoc) => void;
  onUploadImage: (file: File) => Promise<string>;
  labelledBy: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: extensions(),
    content: initialContent,
    // SSR-rendered page: let the client create the editor after hydration.
    immediatelyRender: false,
    // The toolbar reflects the selection (active marks, undo availability).
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        id,
        "aria-labelledby": labelledBy,
        "aria-multiline": "true",
        role: "textbox",
        class: "blog-editor-content min-h-96 px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as BlogDoc),
  });

  async function handleFile(file: File | undefined) {
    if (!file || !editor) return;
    setUploading(true);
    try {
      const src = await onUploadImage(file);
      const alt = window.prompt(t.imageAltPrompt, "") ?? "";
      editor.chain().focus().setImage({ src, alt: alt.trim() }).run();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-background", !editor && "animate-pulse")}>
      {editor ? (
        <Toolbar editor={editor} uploading={uploading} onPickImage={() => fileInput.current?.click()} />
      ) : null}
      <EditorContent editor={editor} />
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_UPLOAD.types.join(",")}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}

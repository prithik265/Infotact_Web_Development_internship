import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { ASTNode } from "../types/ast";

interface Props {
  node: ASTNode;
  activeNodeId: string | null;
  remoteNodeId?: string;
  onTextChange: (node: ASTNode, value: string) => void;
  onFocus: (node: ASTNode) => void;
  onDelete: (node: ASTNode) => void;
  editable?: boolean;
}

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  placeholder: string;
  disabled: boolean;
  className: string;
  multiline?: boolean;
}

function EditableText({
  value,
  onChange,
  onFocus,
  placeholder,
  disabled,
  className,
  multiline = false
}: EditableTextProps) {
  const [draft, setDraft] = useState(value);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Do not replace a user's in-progress local input when a remote Yjs
    // update arrives. When the field is not focused, mirror the shared value.
    const active = document.activeElement;

    if (
      active !== inputRef.current &&
      active !== textareaRef.current
    ) {
      setDraft(value);
    }
  }, [value]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const next = event.target.value;

    setDraft(next);
    onChange(next);
  };

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        className={className}
        value={draft}
        onFocus={onFocus}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      className={className}
      value={draft}
      onFocus={onFocus}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

/**
 * Returns editable text only for nodes that actually contain content.
 *
 * Some AST nodes such as lists, list items and dividers do not have
 * a `content` object. Optional chaining prevents the renderer from
 * crashing when those nodes are encountered.
 */
function editableText(node: ASTNode): string {
  return typeof node.content?.text === "string"
    ? node.content.text
    : "";
}

export function BlockRenderer({
  node,
  activeNodeId,
  remoteNodeId,
  onTextChange,
  onFocus,
  onDelete,
  editable = true
}: Props) {
  /*
   * Document is the root AST node.
   * It does not render editable content itself; it simply renders
   * its children recursively.
   */
  if (node.type === "document") {
    return (
      <>
        {node.children.map((child) => (
          <BlockRenderer
            key={child.id}
            node={child}
            activeNodeId={activeNodeId}
            remoteNodeId={remoteNodeId}
            onTextChange={onTextChange}
            onFocus={onFocus}
            onDelete={onDelete}
            editable={editable}
          />
        ))}
      </>
    );
  }

  const active = activeNodeId === node.id;
  const remote = remoteNodeId === node.id;

  const className = `block ${active ? "active" : ""} ${
    remote ? "remote-active" : ""
  }`;

  const controls = (
    <div className="block-controls">
      <span className="drag-handle">⋮⋮</span>

      <button
        onClick={() => onDelete(node)}
        title="Delete block"
      >
        ×
      </button>
    </div>
  );

  /*
   * Safe for structural nodes because editableText() now handles
   * missing content.
   */
  const value = editableText(node);

  /*
   * =========================
   * HEADING
   * =========================
   */
  if (node.type === "heading") {
    const level = Number(node.attributes?.level || 1);

    return (
      <div className="block-shell">
        {controls}

        <EditableText
          value={value}
          onFocus={() => onFocus(node)}
          onChange={(next) => onTextChange(node, next)}
          placeholder="Heading"
          disabled={!editable}
          className={`${className} heading-input h${Math.min(
            level,
            3
          )}`}
        />
      </div>
    );
  }

  /*
   * =========================
   * PARAGRAPH
   * =========================
   */
  if (node.type === "paragraph") {
    return (
      <div className="block-shell">
        {controls}

        <EditableText
          value={value}
          onFocus={() => onFocus(node)}
          onChange={(next) => onTextChange(node, next)}
          placeholder="Start writing..."
          disabled={!editable}
          className={`${className} paragraph-input`}
          multiline
        />
      </div>
    );
  }

  /*
   * =========================
   * CODE BLOCK
   * =========================
   */
  if (node.type === "code") {
    return (
      <div className="block-shell">
        {controls}

        <div className={`${className} code-block`}>
          <div className="code-label">
            {String(node.attributes?.language || "text")}
          </div>

          <EditableText
            value={value}
            onFocus={() => onFocus(node)}
            onChange={(next) => onTextChange(node, next)}
            placeholder="Write code..."
            disabled={!editable}
            className=""
            multiline
          />
        </div>
      </div>
    );
  }

  /*
   * =========================
   * QUOTE
   * =========================
   *
   * Quote itself does not need text content.
   * Its children contain the actual blocks.
   */
  if (node.type === "quote") {
    return (
      <div className="block-shell">
        {controls}

        <blockquote className={className}>
          {node.children.map((child) => (
            <BlockRenderer
              key={child.id}
              node={child}
              activeNodeId={activeNodeId}
              remoteNodeId={remoteNodeId}
              onTextChange={onTextChange}
              onFocus={onFocus}
              onDelete={onDelete}
              editable={editable}
            />
          ))}
        </blockquote>
      </div>
    );
  }

  /*
   * =========================
   * BULLET / ORDERED LIST
   * =========================
   *
   * Lists have children but normally do not have content.text.
   */
  if (
    node.type === "bulletList" ||
    node.type === "orderedList"
  ) {
    const ListTag =
      node.type === "bulletList" ? "ul" : "ol";

    return (
      <div className="block-shell">
        {controls}

        <ListTag className={className}>
          {node.children.map((child) => (
            <BlockRenderer
              key={child.id}
              node={child}
              activeNodeId={activeNodeId}
              remoteNodeId={remoteNodeId}
              onTextChange={onTextChange}
              onFocus={onFocus}
              onDelete={onDelete}
              editable={editable}
            />
          ))}
        </ListTag>
      </div>
    );
  }

  /*
   * =========================
   * LIST ITEM
   * =========================
   *
   * ListItem contains child blocks, usually a paragraph.
   */
  if (node.type === "listItem") {
    return (
      <li className={className}>
        {node.children.map((child) => (
          <BlockRenderer
            key={child.id}
            node={child}
            activeNodeId={activeNodeId}
            remoteNodeId={remoteNodeId}
            onTextChange={onTextChange}
            onFocus={onFocus}
            onDelete={onDelete}
            editable={editable}
          />
        ))}
      </li>
    );
  }

  /*
   * =========================
   * DIVIDER
   * =========================
   *
   * Divider has neither content nor children.
   */
  if (node.type === "divider") {
    return (
      <div className="block-shell">
        {controls}

        <hr className={className} />
      </div>
    );
  }

  return null;
}
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { ASTNode } from "../types/ast";

interface Props {
  node: ASTNode;
  activeNodeId: string | null;
  remoteNodeId?: string;

  onTextChange: (
    node: ASTNode,
    previousValue: string,
    value: string
  ) => void;

  onFocus: (node: ASTNode) => void;
  onDelete: (node: ASTNode) => void;
  editable?: boolean;
}

interface EditableTextProps {
  value: string;

  onChange: (
    previousValue: string,
    value: string
  ) => void;

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
  /*
   * `draft` represents what THIS USER currently sees
   * inside the input.
   *
   * This is intentionally separate from the shared AST value.
   * Otherwise, a remote Yjs update could reset the input while
   * the user is typing.
   */
  const [draft, setDraft] = useState(value);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    /*
     * If the user is not currently typing in this field,
     * synchronize the local draft with the latest shared value.
     *
     * If the field is focused, preserve the user's local draft.
     */
    const active = document.activeElement;

    if (
      active !== inputRef.current &&
      active !== textareaRef.current
    ) {
      setDraft(value);
    }
  }, [value]);

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    /*
     * IMPORTANT:
     *
     * We send BOTH values:
     *
     * previous = what this user was editing
     * next     = what this user just typed
     *
     * This lets the collaboration layer calculate the
     * actual local operation instead of treating the entire
     * field as a replacement.
     */
    const previous = draft;
    const next = event.target.value;

    setDraft(next);

    onChange(previous, next);
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
 * Returns editable text only for nodes that actually
 * contain text content.
 *
 * Structural AST nodes such as lists, list items and
 * dividers may not have a content object.
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
   * =========================
   * DOCUMENT ROOT
   * =========================
   *
   * The document node itself is not editable.
   * It recursively renders its children.
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

  const value = editableText(node);

  /*
   * =========================
   * HEADING
   * =========================
   */
  if (node.type === "heading") {
    const level = Number(
      node.attributes?.level || 1
    );

    return (
      <div className="block-shell">
        {controls}

        <EditableText
          value={value}
          onFocus={() => onFocus(node)}
          onChange={(previous, next) =>
            onTextChange(
              node,
              previous,
              next
            )
          }
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
          onChange={(previous, next) =>
            onTextChange(
              node,
              previous,
              next
            )
          }
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

        <div
          className={`${className} code-block`}
        >
          <div className="code-label">
            {String(
              node.attributes?.language ||
                "text"
            )}
          </div>

          <EditableText
            value={value}
            onFocus={() => onFocus(node)}
            onChange={(previous, next) =>
              onTextChange(
                node,
                previous,
                next
              )
            }
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
   */
  if (
    node.type === "bulletList" ||
    node.type === "orderedList"
  ) {
    const ListTag =
      node.type === "bulletList"
        ? "ul"
        : "ol";

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
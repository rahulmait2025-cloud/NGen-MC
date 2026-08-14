'use client';

import React, { Suspense, lazy, useMemo } from 'react';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import { Info, HelpCircle, AlertCircle, AlertTriangle, Octagon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ReactMarkdown = lazy(() => import('react-markdown'));

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

type ReactChildProps = { children?: React.ReactNode };

function removeAlertPrefix(node: React.ReactNode, pattern: RegExp): React.ReactNode {
  if (!node) return node;
  if (typeof node === 'string') {
    return node.replace(pattern, '').trimStart();
  }
  if (Array.isArray(node)) {
    let found = false;
    return node.map((child) => {
      if (!found && typeof child === 'string') {
        const cleaned = child.replace(pattern, '');
        if (cleaned !== child) {
          found = true;
          return cleaned.trimStart();
        }
      }
      if (!found && React.isValidElement(child)) {
        const props = child.props as ReactChildProps;
        if (props.children) {
          const cleanedChildren = removeAlertPrefix(props.children, pattern);
          if (cleanedChildren !== props.children) {
            found = true;
            return React.cloneElement(child, {
              ...props,
              children: cleanedChildren,
            } as ReactChildProps);
          }
        }
      }
      return child;
    });
  }
  if (React.isValidElement(node)) {
    const props = node.props as ReactChildProps;
    if (props.children) {
      const cleanedChildren = removeAlertPrefix(props.children, pattern);
      return React.cloneElement(node, {
        ...props,
        children: cleanedChildren,
      } as ReactChildProps);
    }
  }
  return node;
}

const sanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': ['className', 'style', 'id'],
    'input': ['type', 'checked', 'disabled', 'className', 'readOnly'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'svg', 'path', 'g', 'circle', 'line', 'rect', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'foreignObject',
  ],
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const customComponents = useMemo<Components>(() => {
    return {
      h1: ({ children, ...props }) => (
        <h1 className="mb-4 mt-6 text-2xl font-bold tracking-tight text-foreground" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2 className="mb-3 mt-5 text-xl font-semibold tracking-tight text-foreground" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3 className="mb-2 mt-4 text-lg font-semibold text-foreground" {...props}>
          {children}
        </h3>
      ),
      p: ({ children, ...props }) => (
        <p className="mb-3 text-sm leading-relaxed text-foreground/90" {...props}>
          {children}
        </p>
      ),
      ul: ({ children, ...props }) => {
        const hasCheckbox = React.Children.toArray(children).some((child) => {
          if (React.isValidElement(child)) {
            const innerChildren = (child.props as ReactChildProps).children;
            return React.Children.toArray(innerChildren).some(
              (inner) => React.isValidElement(inner) && (inner.props as { type?: string }).type === 'checkbox',
            );
          }
          return false;
        });

        return (
          <ul
            className={cn('mb-3 space-y-1 text-sm text-foreground/90', hasCheckbox ? 'list-none ml-1' : 'list-disc ml-6')}
            {...props}
          >
            {children}
          </ul>
        );
      },
      ol: ({ children, ...props }) => (
        <ol className="mb-3 ml-6 list-decimal space-y-1 text-sm text-foreground/90" {...props}>
          {children}
        </ol>
      ),
      li: ({ children, ...props }) => (
        <li className="leading-relaxed py-0.5 text-foreground/90" {...props}>
          {children}
        </li>
      ),
      blockquote: ({ children, ...props }) => {
        const alertPattern = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:\r?\n)?/i;

        const getText = (node: React.ReactNode): string => {
          if (!node) return '';
          if (typeof node === 'string') return node;
          if (typeof node === 'number') return String(node);
          if (React.isValidElement(node)) {
            const props = node.props as ReactChildProps;
            if (props.children) {
              if (Array.isArray(props.children)) {
                return props.children.map(getText).join('');
              }
              return getText(props.children);
            }
          }
          return '';
        };

        let fullText = '';
        if (Array.isArray(children)) {
          fullText = children.map(getText).join('');
        } else {
          fullText = getText(children);
        }

        const match = fullText.trim().match(alertPattern);
        if (match) {
          const type = match[1].toUpperCase() as 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';
          const cleanChildren = removeAlertPrefix(children, alertPattern);

          const config = {
            NOTE: { border: 'border-blue-500/30', bg: 'bg-blue-500/[0.04]', text: 'text-blue-700 dark:text-blue-400', title: 'Note', icon: Info },
            TIP: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/[0.04]', text: 'text-emerald-700 dark:text-emerald-400', title: 'Tip', icon: HelpCircle },
            IMPORTANT: { border: 'border-purple-500/30', bg: 'bg-purple-500/[0.04]', text: 'text-purple-700 dark:text-purple-400', title: 'Important', icon: AlertCircle },
            WARNING: { border: 'border-amber-500/30', bg: 'bg-amber-500/[0.04]', text: 'text-amber-700 dark:text-amber-400', title: 'Warning', icon: AlertTriangle },
            CAUTION: { border: 'border-red-500/30', bg: 'bg-red-500/[0.04]', text: 'text-red-700 dark:text-red-400', title: 'Caution', icon: Octagon },
          };

          const cfg = config[type];
          const Icon = cfg.icon;

          return (
            <div className={cn('my-4 rounded-xl border p-4 shadow-sm', cfg.border, cfg.bg)}>
              <div className={cn('flex items-center gap-2 font-semibold text-sm mb-1.5', cfg.text)}>
                <Icon className="size-4" />
                <span>{cfg.title}</span>
              </div>
              <div className="text-sm text-foreground/80 leading-relaxed [&>p]:mb-0">{cleanChildren}</div>
            </div>
          );
        }

        return (
          <blockquote className="mb-3 border-l-4 border-primary/30 bg-primary/5 py-2 pl-4 text-sm italic text-foreground/80" {...props}>
            {children}
          </blockquote>
        );
      },
      code: ({ className, children, ...props }) => {
        const isInline = !className;
        if (isInline) {
          return (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground" {...props}>
              {children}
            </code>
          );
        }
        return (
          <code className={cn('font-mono text-sm', className)} {...props}>
            {children}
          </code>
        );
      },
      pre: ({ children, ...props }) => (
        <pre className="mb-4 overflow-x-auto rounded-xl border border-border bg-background p-4 text-sm text-foreground" {...props}>
          {children}
        </pre>
      ),
      table: ({ children, ...props }) => (
        <div className="mb-6 overflow-hidden rounded-xl border border-border/40 shadow-sm bg-card">
          <table className="min-w-full border-collapse text-sm" {...props}>
            {children}
          </table>
        </div>
      ),
      thead: ({ children, ...props }) => (
        <thead className="bg-muted/40 border-b border-border/50" {...props}>
          {children}
        </thead>
      ),
      tr: ({ children, ...props }) => (
        <tr className="border-b border-border/30 last:border-0 even:bg-muted/10 transition-colors hover:bg-muted/5" {...props}>
          {children}
        </tr>
      ),
      th: ({ children, ...props }) => (
        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider" {...props}>
          {children}
        </th>
      ),
      td: ({ children, ...props }) => (
        <td className="px-4 py-2.5 text-sm text-foreground/80" {...props}>
          {children}
        </td>
      ),
      a: ({ href, children, ...props }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80" {...props}>
          {children}
        </a>
      ),
      hr: (props) => <hr className="my-6 border-border/50" {...props} />,
      input: (props) => {
        if (props.type === 'checkbox') {
          return (
            <input
              type="checkbox"
              className="mr-2 size-4 rounded border-border text-primary focus:ring-0 accent-primary inline-block align-middle mb-0.5 cursor-default"
              readOnly
              checked={props.checked}
              {...props}
            />
          );
        }
        return <input {...props} />;
      },
    };
  }, []);

  return (
    <div className={className ?? 'prose prose-sm max-w-none'}>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading content...</div>}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeSanitize, sanitizeOptions]]}
          skipHtml
          components={customComponents}
        >
          {content}
        </ReactMarkdown>
      </Suspense>
    </div>
  );
}

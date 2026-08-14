'use client';

import React, { Suspense, lazy, useEffect, useState, useMemo } from 'react';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import { useTheme } from 'next-themes';
import { 
  Info, 
  HelpCircle, 
  AlertCircle, 
  AlertTriangle, 
  Octagon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import PrismJS core only — language grammars loaded on demand
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';

const ReactMarkdown = lazy(() => import('react-markdown'));

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Client-only dynamic loader for Mermaid to prevent SSR compilation crashes
type MermaidModule = typeof import('mermaid').default;
let mermaidModule: MermaidModule | null = null;
async function getMermaidInstance() {
  if (typeof window === 'undefined') return null;
  if (mermaidModule) return mermaidModule;
  
  const mod = await import('mermaid');
  mermaidModule = mod.default;
  mermaidModule.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'strict',
  });
  return mermaidModule;
}

// Client-side component for rendering Mermaid diagrams
function MermaidRenderer({ chart, theme }: { chart: string; theme: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function renderChart() {
      try {
        const m = await getMermaidInstance();
        if (!m) return;
        
        // Dynamically adjust theme based on system/LMS active theme state
        m.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'neutral',
          securityLevel: 'strict',
        });
        
        const id = `mermaid-${Math.floor(Math.random() * 1000000)}`;
        const { svg: renderedSvg } = await m.render(id, chart);
        
        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: unknown) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      }
    }
    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart, theme]);

  if (error) {
    return (
      <pre className="p-4 bg-destructive/10 text-destructive rounded-lg text-xs overflow-x-auto font-mono my-3 border border-destructive/20">
        {error}
        {"\n\nOriginal Code:\n"}
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/20 border border-border/30 rounded-xl my-4 animate-pulse">
        <span className="text-xs text-muted-foreground">Generating diagram...</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex justify-center my-6 border rounded-xl p-6 overflow-x-auto shadow-sm transition-colors duration-200",
        theme === 'dark'
          ? "bg-muted/40 border-border/80"
          : "bg-muted/50 border-border/60"
      )}
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
}

// Dynamic grammar loader — only loads the language needed
const GRAMMAR_MODULES: Record<string, () => Promise<unknown>> = {
  // @ts-expect-error - prismjs component submodule has no type declaration
  c: () => import('prismjs/components/prism-c'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  cpp: () => import('prismjs/components/prism-cpp'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  json: () => import('prismjs/components/prism-json'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  bash: () => import('prismjs/components/prism-bash'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  python: () => import('prismjs/components/prism-python'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  javascript: () => import('prismjs/components/prism-javascript'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  typescript: () => import('prismjs/components/prism-typescript'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  jsx: () => import('prismjs/components/prism-jsx'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  tsx: () => import('prismjs/components/prism-tsx'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  css: () => import('prismjs/components/prism-css'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  html: () => import('prismjs/components/prism-markup'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  sql: () => import('prismjs/components/prism-sql'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  java: () => import('prismjs/components/prism-java'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  rust: () => import('prismjs/components/prism-rust'),
  // @ts-expect-error - prismjs component submodule has no type declaration
  go: () => import('prismjs/components/prism-go'),
};


const loadedGrammars = new Set<string>();

async function ensureGrammar(lang: string): Promise<void> {
  if (loadedGrammars.has(lang)) return;
  const loader = GRAMMAR_MODULES[lang];
  if (loader) {
    await loader();
    loadedGrammars.add(lang);
  }
}

// Client-side component for Prism syntax highlighting
function CodeHighlighter({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function highlight() {
      let lang = language.toLowerCase();
      if (lang === 'c++') lang = 'cpp';
      await ensureGrammar(lang);
      if (cancelled) return;
      const grammar = Prism.languages[lang] || Prism.languages.clike || Prism.languages.markup;
      const result = Prism.highlight(code, grammar, lang);
      if (!cancelled) setHtml(result);
    }
    highlight();
    return () => { cancelled = true; };
  }, [code, language]);

  if (!html) {
    return (
      <code className={cn("language-" + language, "font-mono text-sm")}>
        {code}
      </code>
    );
  }

  return (
    <code 
      className={cn("language-" + language, "font-mono text-sm")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// Helper to remove the prefix tag "[!NOTE]" etc. from cloned node trees
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
    'svg', 'path', 'g', 'circle', 'line', 'rect', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'foreignObject'
  ]
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const { resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || 'dark';

  // Toggle active Prism syntax theme stylesheet based on current light/dark layout
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const linkId = 'prism-theme-style';
    let link = document.getElementById(linkId) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    
    link.href = currentTheme === 'dark'
      ? 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css';
  }, [currentTheme]);

  // Memoize customComponents object to bind currentTheme dynamics cleanly
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
        // Automatically scan if this is a task-list with checkboxes
        const hasCheckbox = React.Children.toArray(children).some((child) => {
          if (React.isValidElement(child)) {
            const innerChildren = (child.props as ReactChildProps).children;
            return React.Children.toArray(innerChildren).some((inner) =>
              React.isValidElement(inner) &&
              (inner.props as { type?: string }).type === 'checkbox'
            );
          }
          return false;
        });

        return (
          <ul 
            className={cn(
              "mb-3 space-y-1 text-sm text-foreground/90", 
              hasCheckbox ? "list-none ml-1" : "list-disc ml-6"
            )} 
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
            NOTE: {
              border: 'border-blue-500/30 dark:border-blue-500/20',
              bg: 'bg-blue-500/[0.04]',
              text: 'text-blue-700 dark:text-blue-400',
              title: 'Note',
              icon: Info,
            },
            TIP: {
              border: 'border-success/30 dark:border-success/20',
              bg: 'bg-success/[0.04]',
              text: 'text-success dark:text-success',
              title: 'Tip',
              icon: HelpCircle,
            },
            IMPORTANT: {
              border: 'border-purple-500/30 dark:border-purple-500/20',
              bg: 'bg-purple-500/[0.04]',
              text: 'text-purple-700 dark:text-purple-400',
              title: 'Important',
              icon: AlertCircle,
            },
            WARNING: {
              border: 'border-amber-500/30 dark:border-amber-500/20',
              bg: 'bg-amber-500/[0.04]',
              text: 'text-amber-700 dark:text-amber-400',
              title: 'Warning',
              icon: AlertTriangle,
            },
            CAUTION: {
              border: 'border-destructive/30 dark:border-destructive/20',
              bg: 'bg-destructive/[0.04]',
              text: 'text-destructive dark:text-destructive',
              title: 'Caution',
              icon: Octagon,
            },
          };

          const cfg = config[type];
          const Icon = cfg.icon;

          return (
            <div className={cn("my-4 rounded-xl border p-4 shadow-sm", cfg.border, cfg.bg)}>
              <div className={cn("flex items-center gap-2 font-semibold text-sm mb-1.5", cfg.text)}>
                <Icon className="size-4" />
                <span>{cfg.title}</span>
              </div>
              <div className="text-sm text-foreground/80 leading-relaxed [&>p]:mb-0">
                {cleanChildren}
              </div>
            </div>
          );
        }

        return (
          <blockquote
            className="mb-3 border-l-4 border-primary/30 bg-primary/5 py-2 pl-4 text-sm italic text-foreground/80"
            {...props}
          >
            {children}
          </blockquote>
        );
      },
      code: ({ className, children, ...props }) => {
        const isInline = !className;
        if (isInline) {
          return (
            <code
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-xs transition-colors duration-200",
                currentTheme === 'dark'
                  ? "bg-muted text-foreground"
                  : "bg-muted text-foreground"
              )}
              {...props}
            >
              {children}
            </code>
          );
        }

        if (className === 'language-mermaid') {
          const codeString = String(children).replace(/\n$/, '');
          return <MermaidRenderer chart={codeString} theme={currentTheme} />;
        }

        const lang = className.replace('language-', '');
        const codeString = String(children).replace(/\n$/, '');
        return <CodeHighlighter code={codeString} language={lang} />;
      },
      pre: ({ children, ...props }) => {
        // Intercept Mermaid blocks to bypass the standard dark preformatted box wrapping
        const isMermaid = React.Children.toArray(children).some((child) => {
          return React.isValidElement(child) &&
                 (child.props as { className?: string }).className === 'language-mermaid';
        });

        if (isMermaid) {
          return <>{children}</>;
        }

        return (
          <pre
            className={cn(
              "mb-4 overflow-x-auto rounded-xl p-4 text-sm transition-colors duration-200 border",
              currentTheme === 'dark'
                ? "bg-background text-foreground border-border"
                : "bg-background text-foreground border-border/80"
            )}
            {...props}
          >
            {children}
          </pre>
        );
      },
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
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
          {...props}
        >
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
  }, [currentTheme]);

  return (
    <div className={className ?? 'prose prose-sm max-w-none'}>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading content…</div>}>
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

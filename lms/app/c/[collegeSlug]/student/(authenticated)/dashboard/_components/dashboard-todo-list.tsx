'use client';

import { useRef, useCallback, useTransition, useReducer } from 'react';
import { Check, Plus, X, ListTodo, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  addTodoAction,
  toggleTodoAction,
  deleteTodoAction,
  type Todo,
} from '@/lib/actions/student-todos';
import { TodoCelebration } from '@/components/todo-celebration';

interface TodoWithState extends Todo {
  completing?: boolean;
}

interface DashboardTodoListProps {
  collegeSlug: string;
  initialTodos: Record<string, Todo[]>;
}

const MAX_TODOS = 5;
const MAX_CHARS = 30;

const TAB_KEYS = ['daily', 'weekly', 'monthly'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

// Reducer for todo-related state to reduce re-renders
type TodoAction =
  | { type: 'SET_TODOS'; todos: Record<TabKey, TodoWithState[]> }
  | { type: 'SET_TAB'; tab: TabKey }
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SET_REMOVING'; id: string | null }
  | { type: 'SET_CELEBRATING'; id: string | null }
  | { type: 'ADD_TODO_OPTIMISTIC'; tab: TabKey; todo: TodoWithState }
  | { type: 'REPLACE_TODO'; tab: TabKey; tempId: string; todo: TodoWithState }
  | { type: 'REMOVE_TODO'; tab: TabKey; tempId: string }
  | { type: 'TOGGLE_TODO'; tab: TabKey; id: string; completing: boolean; completed: boolean }
  | { type: 'REVERT_TOGGLE'; tab: TabKey; id: string; completed: boolean }
  | { type: 'DELETE_TODO'; tab: TabKey; id: string }
  | { type: 'RESTORE_TODO'; tab: TabKey; todo: TodoWithState };

interface TodoListState {
  todos: Record<TabKey, TodoWithState[]>;
  activeTab: TabKey;
  inputValue: string;
  removingId: string | null;
  celebratingId: string | null;
}

function todoReducer(state: TodoListState, action: TodoAction): TodoListState {
  switch (action.type) {
    case 'SET_TODOS':
      return { ...state, todos: action.todos };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_INPUT':
      return { ...state, inputValue: action.value };
    case 'SET_REMOVING':
      return { ...state, removingId: action.id };
    case 'SET_CELEBRATING':
      return { ...state, celebratingId: action.id };
    case 'ADD_TODO_OPTIMISTIC':
      return {
        ...state,
        todos: {
          ...state.todos,
          [action.tab]: [...state.todos[action.tab], action.todo],
        },
        inputValue: '',
      };
    case 'REPLACE_TODO':
      return {
        ...state,
        todos: {
          ...state.todos,
          [action.tab]: state.todos[action.tab].map((t) =>
            t.id === action.tempId ? action.todo : t
          ),
        },
      };
    case 'REMOVE_TODO':
      return {
        ...state,
        todos: {
          ...state.todos,
          [action.tab]: state.todos[action.tab].filter((t) => t.id !== action.tempId),
        },
      };
    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: {
          ...state.todos,
          [action.tab]: state.todos[action.tab].map((t) =>
            t.id === action.id ? { ...t, completing: action.completing, completed: action.completed } : t
          ),
        },
      };
    case 'REVERT_TOGGLE':
      return {
        ...state,
        todos: {
          ...state.todos,
          [action.tab]: state.todos[action.tab].map((t) =>
            t.id === action.id ? { ...t, completed: action.completed } : t
          ),
        },
      };
    case 'DELETE_TODO':
      return {
        ...state,
        todos: {
          ...state.todos,
          [action.tab]: state.todos[action.tab].filter((t) => t.id !== action.id),
        },
      };
    case 'RESTORE_TODO':
      return {
        ...state,
        todos: {
          ...state.todos,
          [action.tab]: [...state.todos[action.tab], action.todo],
        },
      };
    default:
      return state;
  }
}

export function DashboardTodoList({ collegeSlug, initialTodos }: DashboardTodoListProps) {
  const [state, dispatch] = useReducer(todoReducer, {
    todos: {
      daily: (initialTodos.daily as TodoWithState[]) ?? [],
      weekly: (initialTodos.weekly as TodoWithState[]) ?? [],
      monthly: (initialTodos.monthly as TodoWithState[]) ?? [],
    },
    activeTab: 'daily' as TabKey,
    inputValue: '',
    removingId: null,
    celebratingId: null,
  });
  const [isPending, _startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const checkboxRefs = useRef<Map<string, HTMLButtonElement>>(null!);
  if (!checkboxRefs.current) checkboxRefs.current = new Map();
  const gsapRef = useRef<typeof import('gsap') | null>(null);

  const currentTodos = state.todos[state.activeTab];
  const isAtLimit = currentTodos.length >= MAX_TODOS;
  const charsRemaining = MAX_CHARS - state.inputValue.length;

  const animateCheckbox = useCallback(async (id: string) => {
    const el = checkboxRefs.current.get(id);
    if (!el) return;

    if (!gsapRef.current) {
      gsapRef.current = await import('gsap');
    }
    const { default: gsap } = gsapRef.current;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    gsap.fromTo(
      el,
      { scale: 1, boxShadow: '0 0 0 0 oklch(0.72 0.19 45 / 0)' },
      {
        scale: 1.4,
        boxShadow: '0 0 20px 6px oklch(0.72 0.19 45 / 0.3)',
        duration: 0.2,
        ease: 'back.out(2.5)',
        yoyo: true,
        repeat: 1,
      }
    );
  }, []);

  const addTodo = useCallback(async () => {
    const text = state.inputValue.trim();
    if (!text || isAtLimit) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticTodo: TodoWithState = {
      id: tempId,
      text,
      completed: false,
      sort_order: currentTodos.length,
      created_at: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_TODO_OPTIMISTIC', tab: state.activeTab, todo: optimisticTodo });
    inputRef.current?.focus();

    const result = await addTodoAction(collegeSlug, state.activeTab, text);

    if (result.ok && result.todos?.[0]) {
      dispatch({ type: 'REPLACE_TODO', tab: state.activeTab, tempId, todo: result.todos![0] });
    } else {
      dispatch({ type: 'REMOVE_TODO', tab: state.activeTab, tempId });
      toast.error(result.error || 'Failed to add todo');
    }
  }, [state.inputValue, isAtLimit, state.activeTab, currentTodos.length, collegeSlug]);

  const toggleTodo = useCallback(async (id: string) => {
    const todo = state.todos[state.activeTab].find((t) => t.id === id);
    const wasCompleted = todo?.completed ?? false;
    const willBeCompleted = !wasCompleted;

    dispatch({ type: 'TOGGLE_TODO', tab: state.activeTab, id, completing: true, completed: willBeCompleted });

    if (willBeCompleted) {
      animateCheckbox(id);
      dispatch({ type: 'SET_CELEBRATING', id });
    }

    setTimeout(() => {
      dispatch({ type: 'TOGGLE_TODO', tab: state.activeTab, id, completing: false, completed: willBeCompleted });
    }, 300);

    const result = await toggleTodoAction(collegeSlug, id);
    if (!result.ok) {
      dispatch({ type: 'REVERT_TOGGLE', tab: state.activeTab, id, completed: wasCompleted });
      toast.error(result.error || 'Failed to update todo');
    }
  }, [state.activeTab, collegeSlug, state.todos, animateCheckbox]);

  const removeTodo = useCallback(async (id: string) => {
    dispatch({ type: 'SET_REMOVING', id });
    const todoToRestore = state.todos[state.activeTab].find((t) => t.id === id);

    setTimeout(async () => {
      dispatch({ type: 'DELETE_TODO', tab: state.activeTab, id });
      dispatch({ type: 'SET_REMOVING', id: null });

      const result = await deleteTodoAction(collegeSlug, id);
      if (!result.ok) {
        if (todoToRestore) {
          dispatch({ type: 'RESTORE_TODO', tab: state.activeTab, todo: todoToRestore });
        }
        toast.error(result.error || 'Failed to delete todo');
      }
    }, 200);
  }, [state.activeTab, collegeSlug, state.todos]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTodo();
    }
  };

  const completedCount = currentTodos.filter((t) => t.completed).length;

  return (
    <StaggerReveal stagger={0.06} delay={0.2}>
      <StaggerChild>
        <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                <ListTodo className="size-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">My Todos</h2>
              {isPending && (
                <div className="animate-spin"><Loader2 className="size-3.5 text-muted-foreground ml-1" /></div>
              )}
            </div>
            {currentTodos.length > 0 && (
              <p className="text-xs text-muted-foreground ml-[42px] mt-0.5">
                {completedCount} of {currentTodos.length} completed
              </p>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={state.activeTab} onValueChange={(v) => dispatch({ type: 'SET_TAB', tab: v as TabKey })}>
            <div className="px-5 sm:px-6">
              <TabsList variant="line" className="w-full justify-start gap-4">
                {TAB_KEYS.map((key) => (
                  <TabsTrigger key={key} value={key} className="text-xs px-1 py-1.5">
                    {TAB_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab content */}
            {TAB_KEYS.map((key) => (
              <TabsContent key={key} value={key} className="px-5 sm:px-6 pb-5 sm:pb-6">
                {/* Input */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={state.inputValue}
                      onChange={(e) => dispatch({ type: 'SET_INPUT', value: e.target.value.slice(0, MAX_CHARS) })}
                      onKeyDown={handleKeyDown}
                      placeholder={isAtLimit ? 'Max 5 todos reached' : 'Add a todo...'}
                      disabled={isAtLimit}
                      className={cn(
                        'w-full h-11 rounded-xl border border-border/50 bg-muted/30 px-4 pr-14 text-sm',
                        'placeholder:text-muted-foreground/60',
                        'focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 focus:bg-muted/50',
                        'transition duration-200',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                      )}
                      aria-label="New todo text"
                    />
                    <span
                      className={cn(
                        'absolute right-4 top-1/2 -translate-y-1/2 text-[10px] tabular-nums font-medium',
                        charsRemaining <= 5 ? 'text-destructive' : 'text-muted-foreground/40',
                      )}
                    >
                      {state.inputValue.length}/{MAX_CHARS}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addTodo}
                    disabled={!state.inputValue.trim() || isAtLimit}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-xl',
                      'bg-primary text-primary-foreground shadow-sm shadow-primary/20',
                      'hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 active:scale-95',
                      'transition duration-200',
                      'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none',
                    )}
                    aria-label="Add todo"
                  >
                    <Plus className="size-4.5" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Todo list */}
                {state.todos[key].length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-muted-foreground font-medium">
                      No {TAB_LABELS[key].toLowerCase()} todos yet
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1.5">
                      Add up to {MAX_TODOS} items above
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-0.5" aria-label={`${TAB_LABELS[key]} todos`}>
                    {state.todos[key].map((todo) => (
                      <li
                        key={todo.id}
                        className={cn(
                          'group relative flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl',
                          'hover:bg-muted/50 transition duration-200',
                          state.removingId === todo.id && 'todo-item-exit',
                          !state.removingId && !todo.completing && 'todo-item-enter',
                        )}
                      >
                        {/* Celebration particles */}
                        {state.celebratingId === todo.id && (
                          <TodoCelebration
                            trigger={state.celebratingId === todo.id}
                            onComplete={() => dispatch({ type: 'SET_CELEBRATING', id: null })}
                          />
                        )}

                        {/* Checkbox */}
                        <button
                          type="button"
                          ref={(el) => {
                            if (el) checkboxRefs.current.set(todo.id, el);
                            else checkboxRefs.current.delete(todo.id);
                          }}
                          onClick={() => toggleTodo(todo.id)}
                          className={cn(
                            'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
                            'border-[1.5px] transition duration-200',
                            todo.completed
                              ? 'bg-primary border-primary text-white shadow-sm shadow-primary/30'
                              : 'border-border/70 hover:border-primary/50 hover:bg-primary/5',
                          )}
                          aria-label={todo.completed ? `Mark "${todo.text}" as incomplete` : `Mark "${todo.text}" as complete`}
                          aria-checked={todo.completed}
                          role="checkbox"
                        >
                          {todo.completed && (
                            <Check className="size-2.5" strokeWidth={3.5} />
                          )}
                        </button>

                        {/* Text */}
                        <span
                          className={cn(
                            'flex-1 text-[13px] font-medium leading-relaxed',
                            todo.completed
                              ? 'text-muted-foreground/60 line-through todo-strikethrough-line decoration-muted-foreground/30'
                              : 'text-foreground/90',
                            todo.completing && 'todo-text-completing',
                          )}
                        >
                          {todo.text}
                        </span>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => removeTodo(todo.id)}
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                            'text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10',
                            'opacity-0 group-hover:opacity-100 hover:opacity-100',
                            'max-md:opacity-40',
                            'transition duration-200',
                          )}
                          aria-label={`Delete "${todo.text}"`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </StaggerChild>
    </StaggerReveal>
  );
}

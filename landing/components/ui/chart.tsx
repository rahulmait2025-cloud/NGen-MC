"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

// Local type for recharts payload items (recharts does not export this cleanly)
interface PayloadItem {
    dataKey?: string | number;
    name?: string;
    value?: string | number;
    color?: string;
    payload?: Record<string, unknown>;
    [key: string]: unknown;
}

// ─── Types ───────────────────────────────────────────────────────────────────
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode;
        icon?: React.ComponentType;
        color?: string;
        theme?: Partial<Record<keyof typeof THEMES, string>>;
    }
>;

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart(): ChartContextProps {
    const ctx = React.useContext(ChartContext);
    if (!ctx) throw new Error("useChart must be used within <ChartContainer />");
    return ctx;
}

// ─── ChartContainer ──────────────────────────────────────────────────────────
export const ChartContainer = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
        config: ChartConfig;
        children: React.ReactElement;
    }
>(({ id, className, children, config, ...props }, ref) => {
    const uid = React.useId();
    const chartId = `chart-${id ?? uid.replace(/:/g, "")}`;
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [size, setSize] = React.useState<{ width: number; height: number } | null>(null);

    React.useImperativeHandle(ref, () => containerRef.current!);

    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                setSize((prev) => {
                    if (prev && prev.width === Math.round(width) && prev.height === Math.round(height)) return prev;
                    return { width: Math.round(width), height: Math.round(height) };
                });
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-chart={chartId}
                ref={containerRef}
                className={cn("text-xs w-full [&>style]:hidden", className)}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                {size && size.width > 0 && size.height > 0
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? React.cloneElement(children as React.ReactElement<any>, { width: size.width, height: size.height })
                    : null}
            </div>
        </ChartContext.Provider>
    );
});
ChartContainer.displayName = "ChartContainer";

// ─── ChartStyle ───────────────────────────────────────────────────────────────
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
    const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme ?? cfg.color);
    if (!colorConfig.length) return null;

    return (
        <style>
            {Object.entries(THEMES)
                .map(([theme, prefix]) =>
                    `${prefix} [data-chart=${id}] {\n${colorConfig
                        .map(([key, item]) => {
                            const color =
                                item.theme?.[theme as keyof typeof THEMES] ?? item.color;
                            return color ? `  --color-${key}: ${color};` : null;
                        })
                        .filter(Boolean)
                        .join("\n")}\n}`,
                )
                .join("\n")}
        </style>
    );
}

// ─── ChartTooltip ─────────────────────────────────────────────────────────────
export const ChartTooltip = RechartsPrimitive.Tooltip;

// We avoid importing from recharts internal paths — use ComponentProps instead.
type TooltipContentProps = React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
        hideLabel?: boolean;
        hideIndicator?: boolean;
        indicator?: "line" | "dot" | "dashed";
        nameKey?: string;
        labelKey?: string;
        payload?: PayloadItem[];
        active?: boolean;
        label?: React.ReactNode;
    };

export const ChartTooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
    (
        {
            active,
            payload,
            className,
            indicator = "dot",
            hideLabel = false,
            hideIndicator = false,
            label,
            labelFormatter,
            labelClassName,
            formatter,
            color,
            nameKey,
            labelKey,
        },
        ref,
    ) => {
        const { config } = useChart();

        const tooltipLabel = React.useMemo(() => {
            if (hideLabel || !payload?.length) return null;
            const item = payload[0];
            const key = String(labelKey ?? item.dataKey ?? item.name ?? "value");
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const value =
                !labelKey && typeof label === "string"
                    ? (config[label]?.label ?? label)
                    : itemConfig?.label;

            if (labelFormatter)
                return (
                    <div className={cn("font-medium", labelClassName)}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {labelFormatter(value, payload as any)}
                    </div>
                );
            return value ? (
                <div className={cn("font-medium", labelClassName)}>{value}</div>
            ) : null;
        }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

        if (!active || !payload?.length) return null;

        const nestLabel = payload.length === 1 && indicator !== "dot";

        return (
            <div
                ref={ref}
                className={cn(
                    "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
                    className,
                )}
            >
                {!nestLabel ? tooltipLabel : null}
                <div className="grid gap-1.5">
                    {(payload as PayloadItem[]).map((item: PayloadItem, idx: number) => {
                        const key = String(nameKey ?? item.name ?? item.dataKey ?? "value");
                        const itemConfig = getPayloadConfigFromPayload(config, item, key);
                        const indicatorColor =
                            color ??
                            (item.payload as Record<string, string> | undefined)?.fill ??
                            item.color;

                        return (
                            <div
                                key={String(item.dataKey ?? idx)}
                                className={cn(
                                    "flex w-full flex-wrap items-stretch gap-2",
                                    nestLabel && "items-end",
                                )}
                            >
                                {!hideIndicator && (
                                    <>
                                        {indicator === "dot" && (
                                            <div
                                                className="h-2.5 w-2.5 shrink-0 rounded-[2px] mt-0.5"
                                                style={{ background: indicatorColor }}
                                            />
                                        )}
                                        {indicator === "line" && (
                                            <div
                                                className="w-1 shrink-0 rounded-full"
                                                style={{ background: indicatorColor }}
                                            />
                                        )}
                                        {indicator === "dashed" && (
                                            <div
                                                className="w-0 border-[1.5px] border-dashed shrink-0"
                                                style={{ borderColor: indicatorColor }}
                                            />
                                        )}
                                    </>
                                )}
                                <div
                                    className={cn(
                                        "flex flex-1 justify-between leading-none",
                                        nestLabel ? "items-end" : "items-center",
                                    )}
                                >
                                    <div className="grid gap-1.5">
                                        {nestLabel ? tooltipLabel : null}
                                        <span className="text-muted-foreground">
                                            {itemConfig?.label ?? item.name}
                                        </span>
                                    </div>
                                    {item.value !== undefined && (
                                        <span className="font-mono font-medium tabular-nums text-foreground">
                                            {formatter
                                                ? (formatter as (...args: unknown[]) => React.ReactNode)(
                                                    item.value,
                                                    item.name ?? "",
                                                    item,
                                                    idx,
                                                    payload,
                                                )
                                                : String(item.value)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

// ─── ChartLegend ─────────────────────────────────────────────────────────────
export const ChartLegend = RechartsPrimitive.Legend;

type LegendContentProps = React.ComponentProps<"div"> & {
        payload?: PayloadItem[];
        verticalAlign?: "top" | "middle" | "bottom";
        hideIcon?: boolean;
        nameKey?: string;
    };

export const ChartLegendContent = React.forwardRef<HTMLDivElement, LegendContentProps>(
    ({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
        const { config } = useChart();
        if (!payload?.length) return null;

        return (
            <div
                ref={ref}
                className={cn(
                    "flex items-center justify-center gap-4",
                    verticalAlign === "top" ? "pb-3" : "pt-3",
                    className,
                )}
            >
                {(payload as PayloadItem[]).map((item: PayloadItem, idx: number) => {
                    const key = String(nameKey ?? item.dataKey ?? "value");
                    const itemConfig = getPayloadConfigFromPayload(config, item, key);
                    return (
                        <div key={String(item.value ?? idx)} className="flex items-center gap-1.5">
                            {!hideIcon && itemConfig?.icon ? (
                                <itemConfig.icon />
                            ) : (
                                <div
                                    className="h-2 w-2 shrink-0 rounded-[2px]"
                                    style={{ background: item.color }}
                                />
                            )}
                            <span>{itemConfig?.label}</span>
                        </div>
                    );
                })}
            </div>
        );
    },
);
ChartLegendContent.displayName = "ChartLegendContent";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPayloadConfigFromPayload(
    config: ChartConfig,
    payload: unknown,
    key: string,
): ChartConfig[string] | undefined {
    if (typeof payload !== "object" || payload === null) return undefined;

    const rec = payload as Record<string, unknown>;
    const nested =
        "payload" in rec && typeof rec.payload === "object"
            ? (rec.payload as Record<string, unknown>)
            : undefined;

    let configKey = key;
    if (!(key in config) && nested && key in nested) {
        const val = nested[key];
        if (typeof val === "string") configKey = val;
    }

    return config[configKey] ?? config[key];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const LineChartPrimitive = RechartsPrimitive.LineChart as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BarChartPrimitive = RechartsPrimitive.BarChart as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PieChartPrimitive = RechartsPrimitive.PieChart as any;
export const Line = RechartsPrimitive.Line;
export const Bar = RechartsPrimitive.Bar;
export const XAxis = RechartsPrimitive.XAxis;
export const YAxis = RechartsPrimitive.YAxis;
export const CartesianGrid = RechartsPrimitive.CartesianGrid;
export const Pie = RechartsPrimitive.Pie;
export const Cell = RechartsPrimitive.Cell;

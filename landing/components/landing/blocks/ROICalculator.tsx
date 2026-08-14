"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { m, useMotionValue, useSpring } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AreaChart, Area } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  BarChartPrimitive as BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "@/components/ui/chart";
import {
  Calculator,
  TrendingUp,
  IndianRupee,
  Users,
  GraduationCap,
  ArrowDownRight,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString()}`;
}

function AnimatedValue({
  value,
  format: formatFn,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const fmtRef = useRef(formatFn);
  fmtRef.current = formatFn;
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 60, damping: 15 });
  const [display, setDisplay] = useState(formatFn(value));

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  useEffect(
    () => spring.on("change", (v) => setDisplay(fmtRef.current(Math.round(v)))),
    [spring],
  );

  return <>{display}</>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarLabel(props: any) {
  const { x = 0, y = 0, width = 0, value = 0 } = props;
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 10}
      textAnchor="middle"
      className="fill-foreground"
      style={{ fontSize: 12, fontWeight: 700 }}
    >
      {fmt(value)}
    </text>
  );
}

const barConfig = {
  investment: { label: "Total Investment", color: "#10b981" },
  returns: { label: "Est. Return", color: "#4ade80" },
} satisfies ChartConfig;

const projectionConfig = {
  investment: { label: "Cumulative Investment", color: "#10b981" },
  returns: { label: "Cumulative Return", color: "#4ade80" },
} satisfies ChartConfig;

export function ROICalculator() {
  const [students, setStudents] = useState([200]);
  const [costPerStu, setCostPerStu] = useState(4999);
  const [placePct, setPlacePct] = useState([15]);
  const [pkgUplift, setPkgUplift] = useState([4]);

  const calc = useMemo(() => {
    const n = students[0];
    const c = costPerStu;
    const pct = placePct[0] / 100;
    const uplift = pkgUplift[0] * 100_000;

    const totalInvestment = n * c;
    const expectedAdditionalPlacements = Math.round(n * pct);
    const estimatedReturn = expectedAdditionalPlacements * uplift;
    const roiPct =
      totalInvestment > 0
        ? ((estimatedReturn - totalInvestment) / totalInvestment) * 100
        : 0;
    const returnPerStudent = n > 0 ? Math.round(estimatedReturn / n) : 0;
    const returnPerRupee =
      totalInvestment > 0 ? estimatedReturn / totalInvestment : 0;

    const growthFactors = [1, 1.15, 1.3];
    let cumInv = 0;
    let cumRet = 0;
    const projection = [{ year: "Start", investment: 0, returns: 0 }];
    growthFactors.forEach((g, i) => {
      const batchN = Math.round(n * g);
      const batchInv = batchN * c;
      const batchPlaced = Math.round(batchN * pct);
      const batchRet = batchPlaced * uplift;
      cumInv += batchInv;
      cumRet += batchRet;
      projection.push({ year: `Year ${i + 1}`, investment: cumInv, returns: cumRet });
    });

    return {
      n,
      totalInvestment,
      expectedAdditionalPlacements,
      estimatedReturn,
      roiPct,
      returnPerStudent,
      returnPerRupee,
      projection,
    };
  }, [students, costPerStu, placePct, pkgUplift]);

  const barData = [
    { name: "Investment", investment: calc.totalInvestment, returns: 0 },
    { name: "Est. Return", investment: 0, returns: calc.estimatedReturn },
  ];

  const roiCardClass =
    calc.roiPct > 300
      ? "border-green-500/50 shadow-lg shadow-green-500/10"
      : calc.roiPct > 100
        ? "border-primary/50 shadow-md shadow-primary/10"
        : "";

  const roiTextClass =
    calc.roiPct > 300 ? "text-green-500" : "text-primary";

  return (
    <section
      className="py-14 md:py-16 px-6 bg-transparent relative overflow-hidden"
      id="roi"
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-16">
          <Badge
            variant="outline"
            className="mb-4 text-primary border-primary/20 bg-primary/10"
          >
            <Calculator className="h-3 w-3 mr-1" /> ROI Analysis
          </Badge>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            The Mathematics of Success.
          </h2>
          <p className="text-muted-foreground max-w-lg">
            Strategic investment in talent always yields exponential returns.
            Calculate your institution&apos;s growth potential.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
          <Card className="bg-card border border-border shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-sans font-bold uppercase tracking-wider text-primary">
                <Users className="h-4 w-4" /> Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <Label>Batch Size</Label>
                  <span className="font-display font-bold tabular-nums text-primary text-sm">
                    {students[0]}
                  </span>
                </div>
                <Slider
                  value={students}
                  onValueChange={setStudents}
                  min={50}
                  max={1000}
                  step={10}
                />
              </div>

              <div>
                <Label className="text-sm">Fee per Student (₹)</Label>
                <div className="relative mt-2">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={costPerStu}
                    onChange={(e) =>
                      setCostPerStu(Math.max(0, Number(e.target.value)))
                    }
                    className="pl-9 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <Label>Placement Uplift</Label>
                  <span className="font-display font-bold tabular-nums text-green-600 dark:text-green-400 text-sm">
                    +{placePct[0]}%
                  </span>
                </div>
                <Slider
                  value={placePct}
                  onValueChange={setPlacePct}
                  min={1}
                  max={60}
                  step={1}
                />
                <div className="flex justify-between mt-1.5 px-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    Conservative
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Moderate
                  </span>
                  <span className="text-[10px] text-primary font-medium">
                    Our Avg ~18%
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <Label>Avg. Pkg Uplift (LPA)</Label>
                  <span className="font-display font-bold tabular-nums text-green-600 dark:text-green-400 text-sm">
                    {pkgUplift[0]} LPA
                  </span>
                </div>
                <Slider
                  value={pkgUplift}
                  onValueChange={setPkgUplift}
                  min={0.5}
                  max={10}
                  step={0.5}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                  3-Year Projection
                </span>
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-0 text-[10px] font-bold">
                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                  {fmt(calc.projection[3].returns)} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={projectionConfig} className="h-[200px] w-full">
                <AreaChart data={calc.projection} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="proj-inv-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-investment)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--color-investment)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="proj-ret-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-returns)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--color-returns)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 9 }} className="fill-muted-foreground" axisLine={false} tickLine={false} width={55} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" formatter={(v) => fmt(Number(v))} />} />
                  <Area type="monotone" dataKey="investment" stroke="var(--color-investment)" fill="url(#proj-inv-grad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="returns" stroke="var(--color-returns)" fill="url(#proj-ret-grad)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Assumes 15% batch growth per year as program scales
              </p>
            </CardContent>
          </Card>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center rounded-2xl">
                <div className="text-xs uppercase text-muted-foreground tracking-wider">
                  Investment
                </div>
                <div className="text-lg font-display font-bold tabular-nums mt-2">
                  {fmt(calc.totalInvestment)}
                </div>
              </Card>
              <Card className="p-4 text-center rounded-2xl">
                <div className="text-xs uppercase text-muted-foreground tracking-wider">
                  Expected Return
                </div>
                <div className="text-lg font-display font-bold tabular-nums mt-2 text-green-600 dark:text-green-400">
                  {fmt(calc.estimatedReturn)}
                </div>
              </Card>
              <Card
                className={cn(
                  "p-4 text-center rounded-2xl transition-all duration-300",
                  roiCardClass,
                )}
              >
                <div className="text-xs uppercase text-muted-foreground tracking-wider">
                  ROI
                </div>
                <div
                  className={cn(
                    "text-lg font-bold mt-2 tabular-nums transition-colors duration-300",
                    roiTextClass,
                  )}
                >
                  {calc.roiPct.toFixed(0)}%
                </div>
              </Card>
              <Card className="p-4 text-center rounded-2xl">
                <div className="text-xs uppercase text-muted-foreground tracking-wider">
                  Placements Added
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="text-lg font-display font-bold tabular-nums">
                    {calc.expectedAdditionalPlacements}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  students
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3 rounded-xl flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ArrowDownRight className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                    Cost / Student
                  </div>
                  <div className="text-sm font-display font-bold tabular-nums">
                    ₹{costPerStu.toLocaleString()}
                  </div>
                </div>
              </Card>
              <Card className="p-3 rounded-xl flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                    Return / Student
                  </div>
                  <div className="text-sm font-display font-bold tabular-nums text-green-600 dark:text-green-400">
                    {fmt(calc.returnPerStudent)}
                  </div>
                </div>
              </Card>
            </div>

            <Card className="rounded-2xl flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-center">
                  Benefit vs Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={barConfig}
                  className="h-[280px] w-full"
                >
                  <BarChart
                    data={barData}
                    margin={{ top: 28, right: 12, left: -10, bottom: 0 }}
                    barSize={60}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => fmt(v as number)}
                      tick={{ fontSize: 9 }}
                      className="fill-muted-foreground"
                      axisLine={false}
                      tickLine={false}
                      width={60}
                      domain={[0, "auto"]}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          formatter={(v) => fmt(Number(v))}
                        />
                      }
                    />
                    <Bar
                      dataKey="investment"
                      fill="var(--color-investment)"
                      radius={[6, 6, 0, 0]}
                      label={BarLabel}
                    />
                    <Bar
                      dataKey="returns"
                      fill="var(--color-returns)"
                      radius={[6, 6, 0, 0]}
                      label={BarLabel}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8"
        >
          <Card className="rounded-2xl bg-primary/5 border-primary/20 overflow-hidden">
            <CardContent className="py-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-bold uppercase tracking-wider text-primary">
                  Impact Summary
                </span>
              </div>
              <p className="text-xl md:text-2xl font-display font-bold mb-2">
                Every <span className="text-primary">₹1</span> invested
                generates{" "}
                <span className="text-primary tabular-nums">
                  ₹
                  <AnimatedValue
                    value={calc.returnPerRupee}
                    format={(n) => n.toFixed(1)}
                  />
                </span>{" "}
                in placement value
              </p>
              <p className="text-muted-foreground text-sm md:text-base">
                That&apos;s{" "}
                <span className="font-bold text-foreground tabular-nums">
                  <AnimatedValue
                    value={calc.expectedAdditionalPlacements}
                    format={(n) => String(n)}
                  />
                </span>{" "}
                additional students placed for just{" "}
                <span className="font-bold text-foreground">
                  ₹{costPerStu.toLocaleString()}
                </span>
                /student
              </p>
            </CardContent>
          </Card>
        </m.div>
      </div>
    </section>
  );
}

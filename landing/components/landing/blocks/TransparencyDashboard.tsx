"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig, LineChartPrimitive as LineChart, BarChartPrimitive as BarChart, Line, Bar, XAxis, YAxis, CartesianGrid } from "@/components/ui/chart";
import { TrendingUp, BarChart2, Activity, ArrowUpRight, GraduationCap, Users, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { m } from "framer-motion";

const weeklyActiveData = [
    { week: "W1", students: 142 },
    { week: "W2", students: 158 },
    { week: "W3", students: 171 },
    { week: "W4", students: 165 },
    { week: "W5", students: 183 },
    { week: "W6", students: 196 },
    { week: "W7", students: 208 },
    { week: "W8", students: 224 },
];

const moduleCompletionData = [
    { module: "Python Basics", completion: 96 },
    { module: "Web Dev", completion: 88 },
    { module: "DSA - Arrays", completion: 82 },
    { module: "System Design", completion: 71 },
    { module: "Mock Interviews", completion: 64 },
    { module: "DevOps Intro", completion: 55 },
];

const lineConfig = {
    students: { label: "Active Students", color: "#10b981" },
} satisfies ChartConfig;

const barConfig = {
    completion: { label: "Completion %", color: "#34d399" },
} satisfies ChartConfig;

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5
        }
    }
};

export function TransparencyDashboard() {
    return (
        <section className="py-14 md:py-16 px-6 bg-transparent relative overflow-hidden" id="dashboard">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <m.div
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6"
                >
                    <div className="max-w-xl">
                        <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/10">
                            <Activity className="h-3 w-3 mr-1" /> Real-time Analytics
                        </Badge>
                        <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Empirical Excellence.</h2>
                        <p className="text-muted-foreground">
                            Complete transparency in student progress, engagement, and performance. Our dashboards provide the data you need to drive success.
                        </p>
                    </div>
                    <Button variant="outline" className="w-fit border-primary/20 hover:bg-primary/10">
                        View Sample Dataset <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                </m.div>

                <m.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
                >
                    {[
                        { label: "Enrolled", value: "240", detail: "Active learners", icon: Users },
                        { label: "Attendance", value: "94%", detail: "Weekly average", icon: Monitor },
                        { label: "Qualified", value: "185", detail: "Skills mastered", icon: GraduationCap },
                        { label: "Placed", value: "42", detail: "Recent hires", icon: BarChart2 },
                    ].map((stat) => (
                        <m.div key={stat.label} variants={itemVariants}>
                            <Card className="bg-card border border-border shadow-sm hover:border-primary/30 transition-colors duration-500 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                    <stat.icon className="w-12 h-12 text-primary" />
                                </div>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <stat.icon className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                                    </div>
                                    <CardTitle className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{stat.value}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">{stat.detail}</p>
                                </CardContent>
                            </Card>
                        </m.div>
                    ))}
                </m.div>

                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="bg-card border border-border shadow-sm overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                <div>
                                    <CardTitle className="text-lg font-display">Participation Velocity</CardTitle>
                                    <CardDescription className="text-xs">Live 8-week engagement trend</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={lineConfig} className="h-[260px] w-full">
                                <LineChart data={weeklyActiveData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Line
                                        type="monotone"
                                        dataKey="students"
                                        stroke="var(--color-students)"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: "var(--color-students)", strokeWidth: 0 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border border-border shadow-sm overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-primary" />
                                <div>
                                    <CardTitle className="text-lg font-display">Curriculum Proficiency</CardTitle>
                                    <CardDescription className="text-xs">Completion per learning module (%)</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={barConfig} className="h-[260px] w-full">
                                <BarChart data={moduleCompletionData} layout="vertical" margin={{ top: 4, right: 20, left: 24, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" />
                                    <YAxis
                                        type="category"
                                        dataKey="module"
                                        width={90}
                                        tick={{ fontSize: 11 }}
                                        className="fill-muted-foreground"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Bar
                                        dataKey="completion"
                                        fill="var(--color-completion)"
                                        radius={[0, 6, 6, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}

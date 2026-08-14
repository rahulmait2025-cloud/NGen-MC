"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, Trophy, Flame } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

const LEADERBOARD = [
    { rank: 1, name: "Priya Mehta", college: "VJTI Mumbai", points: 9840, streak: 42, trend: "up" },
    { rank: 2, name: "Rahul Singh", college: "NIT Trichy", points: 9620, streak: 38, trend: "up" },
    { rank: 3, name: "Ananya Das", college: "BITS Pilani", points: 9410, streak: 31, trend: "down" },
    { rank: 4, name: "Karthik R.", college: "SRM Chennai", points: 8980, streak: 27, trend: "up" },
    { rank: 5, name: "Sneha Patel", college: "Pune Inst.", points: 8750, streak: 24, trend: "flat" },
    { rank: 6, name: "Amit Kumar", college: "GFG Campus", points: 8340, streak: 19, trend: "down" },
    { rank: 7, name: "Divya Nair", college: "Cochin Univ.", points: 8120, streak: 17, trend: "up" },
    { rank: 8, name: "Rohan Joshi", college: "VIT Vellore", points: 7890, streak: 15, trend: "flat" },
];

const rankBadge: Partial<Record<number, { label: string; className: string }>> = {
    1: { label: "#1", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    2: { label: "#2", className: "bg-slate-400/20 text-slate-300 border-slate-400/30" },
    3: { label: "#3", className: "bg-primary/20 text-primary border-primary/30" },
};

function TrendIcon({ trend }: { trend: string }) {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function LeaderboardTable() {
    return (
        <section className="py-20 md:py-24 px-6 bg-transparent relative overflow-hidden" id="leaderboard">
            <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-yellow-500/5 blur-3xl rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <Reveal>
                    <div className="text-center mb-12">
                        <Badge variant="outline" className="mb-4 border-yellow-500/20 bg-yellow-500/10 text-yellow-400">
                            <Trophy className="h-3 w-3 mr-1" /> Live Rankings
                        </Badge>
                        <h2 className="font-display text-4xl font-bold mb-4">Student Leaderboard</h2>
                        <p className="text-muted-foreground">Updated weekly. Top performers earn referral bonuses and exclusive placement priority.</p>
                    </div>
                </Reveal>

                <Card className="bg-card/30 border-border/30 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-2 px-4 pt-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                            Top Performers
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 mt-2">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border">
                                    <TableHead className="w-12 text-center text-xs">#</TableHead>
                                    <TableHead className="text-sm">Student</TableHead>
                                    <TableHead className="text-right text-sm">Points</TableHead>
                                    <TableHead className="text-center text-xs hidden sm:table-cell">Streak</TableHead>
                                    <TableHead className="text-center text-xs hidden md:table-cell">Trend</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {LEADERBOARD.map((row) => (
                                    <TableRow key={row.rank} className="hover:bg-white/3">
                                        <TableCell className="text-center font-display font-semibold tabular-nums text-sm">
                                            {row.rank <= 3 ? (
                                                <Badge variant="secondary" className={`text-xs px-2 py-1 ${rankBadge[row.rank]?.className}`}>
                                                    #{row.rank}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs">#{row.rank}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{row.name}</div>
                                            <div className="text-xs text-muted-foreground">{row.college}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-display font-bold tabular-nums text-primary text-sm">
                                            {row.points.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center text-sm hidden sm:table-cell">
                                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                                                <Flame className="h-3 w-3" />{row.streak}d
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center text-sm hidden md:table-cell">
                                            <TrendIcon trend={row.trend} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}

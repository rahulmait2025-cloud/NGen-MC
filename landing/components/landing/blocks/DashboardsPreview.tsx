"use client";


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Trophy, Activity, Target, Briefcase } from "lucide-react";

export function DashboardsPreview() {
    return (
        <section className="py-20 md:py-24 px-6 bg-transparent relative overflow-hidden" id="dashboards">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="font-display text-4xl font-bold mb-4">Complete Transparency</h2>
                    <p className="text-muted-foreground">Real-time insights for college admins and students. No black boxes.</p>
                </div>

                <Tabs defaultValue="college" className="w-full">
                    <div className="flex justify-center mb-12">
                        <TabsList className="bg-muted p-1 rounded-full border border-border">
                            <TabsTrigger value="college" className="rounded-full px-8 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">College View</TabsTrigger>
                            <TabsTrigger value="student" className="rounded-full px-8 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Student View</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="college" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                        <div className="grid md:grid-cols-4 gap-4 mb-8">
                            <KpiCard icon={Users} label="Total Enrolled" value="240" trend="+12%" />
                            <KpiCard icon={Activity} label="Avg. Attendance" value="94%" trend="+2%" />
                            <KpiCard icon={Trophy} label="Skill Qualified" value="185" trend="+8%" />
                            <KpiCard icon={Briefcase} label="Placed So Far" value="42" trend="+5 this week" />
                        </div>
                        <MockTable type="college" />
                    </TabsContent>

                    <TabsContent value="student" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                        <div className="grid md:grid-cols-4 gap-4 mb-8">
                            <KpiCard icon={Target} label="Daily Goal" value="100%" trend="Completed" />
                            <KpiCard icon={BookOpen} label="Modules Done" value="12/24" trend="On Track" />
                            <KpiCard icon={Trophy} label="Global Rank" value="#42" trend="Top 5%" />
                            <KpiCard icon={Activity} label="Coding Streak" value="14 Days" trend="Keep it up!" />
                        </div>
                        <MockTable type="student" />
                    </TabsContent>
                </Tabs>
            </div>
        </section>
    );
}


interface KpiCardProps {
    icon: React.ElementType;
    label: string;
    value: string;
    trend: string;
}

function KpiCard({ icon: Icon, label, value, trend }: KpiCardProps) {
    return (
        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">{trend}</span>
                </div>
                <div className="text-2xl font-bold mb-1">{value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
            </CardContent>
        </Card>
    );
}

function MockTable({ type }: { type: 'college' | 'student' }) {
    const data = type === 'college' ? [
        { name: "Rahul S.", batch: "CS-A", attendance: "98%", status: "Interview Ready" },
        { name: "Priya M.", batch: "CS-B", attendance: "92%", status: "Project Phase" },
        { name: "Amit K.", batch: "IT-A", attendance: "85%", status: "Remedial" },
        { name: "Sneha R.", batch: "CS-A", attendance: "99%", status: "Placed 🚀" },
    ] : [
        { name: "System Design Pattern", batch: "Module 4", attendance: "Done", status: "98/100" },
        { name: "React Advanced Hooks", batch: "Module 5", attendance: "In Progress", status: "45%" },
        { name: "Mock Interview #2", batch: "Soft Skills", attendance: "Scheduled", status: "Pending" },
        { name: "DSA: Graphs", batch: "Module 6", attendance: "Locked", status: "-" },
    ];

    return (
        <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="bg-muted/50 border-b border-border py-4">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {type === 'college' ? 'Live Student Leaderboard' : 'My Learning Roadmap'}
                </CardTitle>
            </CardHeader>
            <div className="divide-y divide-white/5">
                {data.map((row) => (
                    <div key={row.name} className="grid grid-cols-4 p-4 text-sm hover:bg-white/5 transition-colors">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-muted-foreground">{row.batch}</div>
                        <div className="text-muted-foreground">{row.attendance}</div>
                        <div className={`font-medium ${row.status.includes('Placed') ? 'text-green-500' : ''}`}>{row.status}</div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

import { Card, CardContent } from "@/components/ui/Card";
import { TrendingUp, DollarSign, Activity } from "lucide-react";

const stats = [
  {
    label: "Total Balance",
    value: "$12,840.00",
    change: "+12.5%",
    trend: "up",
    icon: <DollarSign className="w-5 h-5" />,
    color: "primary"
  },
  {
    label: "Active Projects",
    value: "6",
    change: "+2 this month",
    trend: "up",
    icon: <Activity className="w-5 h-5" />,
    color: "secondary"
  },
  {
    label: "Average Rating",
    value: "4.9",
    change: "Top 5%",
    trend: "up",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "accent"
  }
];

export default function OverviewStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, i) => (
        <Card key={i} className="hover:border-primary-500/50">
          <CardContent className="pt-8">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600`}>
                {stat.icon}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                stat.trend === "up" ? "bg-success-50 text-success-600" : "bg-error-50 text-error-600"
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-bold font-outfit">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

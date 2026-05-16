import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CheckCircle2, Clock, XCircle, MoreVertical } from "lucide-react";

const activities = [
  {
    id: 1,
    service: "Web Development",
    status: "In Progress",
    date: "2 hours ago",
    amount: "$999.00",
    statusType: "pending"
  },
  {
    id: 2,
    service: "Mobile App Design",
    status: "Completed",
    date: "2 days ago",
    amount: "$799.00",
    statusType: "success"
  },
  {
    id: 3,
    service: "Cloud Infrastructure",
    status: "Cancelled",
    date: "1 week ago",
    amount: "$1,499.00",
    statusType: "error"
  }
];

export default function RecentActivity() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Recent Activity</CardTitle>
        <button className="text-gray-400 hover:text-foreground">
          <MoreVertical className="w-5 h-5" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <th className="pb-4">Service</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">Date</th>
                <th className="pb-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {activities.map((item) => (
                <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="py-4">
                    <span className="font-semibold">{item.service}</span>
                  </td>
                  <td className="py-4">
                    <StatusBadge type={item.statusType} label={item.status} />
                  </td>
                  <td className="py-4 text-sm text-gray-500">{item.date}</td>
                  <td className="py-4 text-right font-bold font-outfit">{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ type, label }: { type: string, label: string }) {
  const styleMap = {
    success: "bg-success-50 text-success-600 border-success-200 dark:bg-success-900/20 dark:border-success-800",
    pending: "bg-warning-50 text-warning-600 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800",
    error: "bg-error-50 text-error-600 border-error-200 dark:bg-error-900/20 dark:border-error-800",
  };

  const iconMap = {
    success: <CheckCircle2 className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    error: <XCircle className="w-3 h-3" />,
  };

  const key = type as keyof typeof styleMap;
  const styles = styleMap[key] ?? styleMap.pending;
  const icons = iconMap[key] ?? iconMap.pending;

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles}`}>
      {icons}
      <span>{label}</span>
    </span>
  );
}

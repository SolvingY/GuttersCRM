import { useNavigate } from "react-router-dom";
import { Calculator, FileText, Building2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const tools = [
  {
    title: "Gutter Estimator",
    description: "Calculate gutter protection, gutters, downspouts & add-ons with live commission tracking",
    icon: Calculator,
    path: "/dashboard/tools/estimator",
  },
  {
    title: "My Estimates",
    description: "View and edit your previously saved standalone estimates",
    icon: FileText,
    path: "/dashboard/tools/my-estimates",
  },
  {
    title: "Commercial Hail Assessment",
    description: "Structured inspection checklist with photo documentation",
    icon: Building2,
    path: "/dashboard/tools/hail-assessment",
  },
];

export default function ToolsHub() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1 text-foreground">Tools</h1>
      <p className="text-muted-foreground text-sm mb-6">Select a tool to get started.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Card
            key={tool.path}
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4"
            style={{ borderLeftColor: "#e53935" }}
            onClick={() => navigate(tool.path)}
          >
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="rounded-lg p-2" style={{ background: "#e5393515" }}>
                <tool.icon className="h-6 w-6" style={{ color: "#e53935" }} />
              </div>
              <CardTitle className="text-lg">{tool.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{tool.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

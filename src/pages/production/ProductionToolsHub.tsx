import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Calculator, Building2 } from "lucide-react";

const tools = [
  {
    title: "Production Checklists",
    description: "Complete pre-build, post-build, water test, and repair checklists",
    icon: ClipboardCheck,
    path: "/production/tools/checklists",
  },
  {
    title: "Gutter Estimator",
    description: "Calculate gutter measurements and pricing",
    icon: Calculator,
    path: "/dashboard/tools/estimator",
  },
  {
    title: "Commercial Hail Assessment",
    description: "Structured inspection checklist with photo documentation",
    icon: Building2,
    path: "/production/tools/hail-assessment",
  },
];

export default function ProductionToolsHub() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Tools</h1>
        <p className="text-sm text-muted-foreground">Production tools and utilities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <Card
            key={tool.path}
            className="cursor-pointer hover:border-amber-500/30 transition-colors"
            onClick={() => navigate(tool.path)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <tool.icon className="h-5 w-5 text-amber-500" />
                {tool.title}
              </CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

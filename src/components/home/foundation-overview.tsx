import { Database, Palette, Shield, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const foundationFeatures = [
  {
    icon: Palette,
    title: "Design System",
    description: "Tailwind CSS, shadcn/ui, and Gossips brand tokens with light and dark themes.",
  },
  {
    icon: Database,
    title: "Supabase Ready",
    description: "Client, server, and middleware helpers configured for auth and database access.",
  },
  {
    icon: Shield,
    title: "Migration Foundation",
    description: "Initial SQL migrations prepared for profiles and future messaging tables.",
  },
  {
    icon: Smartphone,
    title: "Responsive Layout",
    description: "Mobile-first shell with adaptive spacing and typography across breakpoints.",
  },
];

export function FoundationOverview() {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {foundationFeatures.map((feature) => (
        <Card key={feature.title} className="border-border/70 shadow-none">
          <CardHeader className="pb-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="bg-gossip/10 text-gossip flex size-9 items-center justify-center rounded-lg">
                <feature.icon className="size-4" />
              </span>
              <Badge variant="gossip">Phase 1</Badge>
            </div>
            <CardTitle className="text-base">{feature.title}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ))}
    </section>
  );
}

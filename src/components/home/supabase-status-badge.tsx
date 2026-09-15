import { isSupabaseConfigured } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

export function SupabaseStatusBadge() {
  const configured = isSupabaseConfigured();

  return (
    <Badge variant={configured ? "default" : "outline"}>
      Supabase {configured ? "configured" : "not configured"}
    </Badge>
  );
}

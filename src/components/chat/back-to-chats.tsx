import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function BackToChats() {
  return (
    <Button variant="ghost" size="sm" asChild className="gap-2">
      <Link href="/">
        <ArrowLeft className="size-4" />
        Back to chats
      </Link>
    </Button>
  );
}

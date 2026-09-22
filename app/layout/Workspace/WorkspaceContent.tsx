export interface WorkspaceContentProps {
  content: React.ReactNode;
}

import { ScrollArea } from "@/components/ui/scroll-area"

export function WorkspaceContent({ content }: WorkspaceContentProps) {
  return (
    <div className="flex-1 min-h-0">
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-4 pb-10">
          {content}
        </div>
      </ScrollArea>
    </div>
  );
} 
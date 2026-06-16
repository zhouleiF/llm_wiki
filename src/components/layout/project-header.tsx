import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { useWikiStore } from "@/stores/wiki-store"

// Top bar: current project (the app's "repo") name on the left, its
// stable UUID on the right. The id is how the local API / MCP server
// and background queues reference a project, so it's click-to-copy; the
// native title surfaces the full id when the bar truncates it.
export function ProjectHeader() {
  const project = useWikiStore((s) => s.project)
  const [copied, setCopied] = useState(false)
  if (!project) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(project.id)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <div className="flex h-8 shrink-0 items-center justify-between gap-3 border-b bg-background px-3">
      <span className="truncate text-sm font-medium" title={project.name}>
        {project.name}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title={project.id}
        className="flex shrink-0 items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-accent-foreground"
      >
        <span className="max-w-[220px] truncate">{project.id}</span>
        {copied ? (
          <Check className="h-3 w-3 text-emerald-500" />
        ) : (
          <Copy className="h-3 w-3 opacity-60" />
        )}
      </button>
    </div>
  )
}

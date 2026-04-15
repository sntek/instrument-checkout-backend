import React from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'

interface CopyableProps {
  text: string
  label?: string
  os?: string
}

export function Copyable(props: CopyableProps) {
  const { text, os, label = 'Copy' } = props
  const [copied, setCopied] = React.useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // Swallow copy errors; no-op
    }
  }

  return (
    <span className="inline-flex items-center gap-4">
      <span className="relative inline-flex items-center gap-1 group/ip">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-gray-300 hover:text-cyan-300 transition-colors"
          aria-label={copied ? 'Copied' : 'Click to copy'}
        >
          <span className="font-mono">{text}</span>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 opacity-60 group-hover/ip:opacity-100" />
          )}
        </button>
        <span className="pointer-events-none absolute -bottom-8 left-0 z-20 text-[10px] bg-slate-900/90 border border-slate-700/70 text-gray-200 px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/ip:opacity-100 transition-opacity">
          {copied ? 'Copied!' : label}
        </span>
      </span>
      {os === 'Linux' && (
        <>
          <span className="text-slate-600 select-none">|</span>
          <a
            href={`http://${text}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
            aria-label="Open LXI page"
          >
            LXI
            <ExternalLink className="h-3 w-3" />
          </a>
        </>
      )}
    </span>
  )
}

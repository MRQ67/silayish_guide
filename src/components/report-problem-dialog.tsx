"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AlertCircle, CheckCircle2, Flag, Loader2, X } from "lucide-react"
import { submitReportAction } from "@/app/actions/report"
import { Button } from "@/components/ui/button"

export interface ReportProblemDialogProps {
  locationId: string
  locationName: string
  className?: string
}

export function ReportProblemDialog({
  locationId,
  locationName,
  className = "",
}: ReportProblemDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [message, setMessage] = useState("")
  const [honeypot, setHoneypot] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const successButtonRef = useRef<HTMLButtonElement>(null)

  const titleId = useId()
  const descId = useId()
  const textareaId = useId()
  const honeypotId = useId()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Focus management: move focus in on open, return to trigger button on close
  useEffect(() => {
    if (!isOpen) return

    if (isSuccess) {
      successButtonRef.current?.focus()
    } else {
      // Focus the textarea when dialog opens
      textareaRef.current?.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        handleClose()
        return
      }

      // Trap focus within the dialog
      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isSuccess])

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(true)
    setErrorMessage(null)
  }

  const handleClose = () => {
    setIsOpen(false)
    // If completed successfully, reset form state for next time
    if (isSuccess) {
      setMessage("")
      setHoneypot("")
      setIsSuccess(false)
    }
    setErrorMessage(null)
    // Return focus to trigger button
    setTimeout(() => {
      triggerRef.current?.focus()
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await submitReportAction({
        location_id: locationId,
        message,
        website: honeypot,
      })

      if (result.success) {
        setIsSuccess(true)
        setMessage("")
        setHoneypot("")
      } else {
        setErrorMessage(
          result.error ||
            "We couldn't submit your report right now. Please try again later."
        )
      }
    } catch {
      setErrorMessage(
        "We couldn't submit your report right now. Please try again later."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const dialogContent = isOpen ? (
    <div
      role="presentation"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id={titleId}
              className="text-base font-semibold text-foreground leading-tight"
            >
              Report a problem
            </h3>
            <p id={descId} className="mt-1 text-xs text-muted-foreground">
              Help us improve accuracy for{" "}
              <span className="font-medium text-foreground">{locationName}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="mt-5 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-foreground">
              Thank you for your report!
            </h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Our campus administration team will review your feedback and update
              location details as needed.
            </p>
            <Button
              ref={successButtonRef}
              type="button"
              variant="default"
              size="sm"
              onClick={handleClose}
              className="mt-5 w-full"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Hidden honeypot field for bot protection */}
            <div
              className="hidden"
              aria-hidden="true"
              style={{ display: "none" }}
            >
              <label htmlFor={honeypotId}>Website</label>
              <input
                id={honeypotId}
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={textareaId}
                className="text-xs font-medium text-foreground"
              >
                Describe the problem
              </label>
              <textarea
                id={textareaId}
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={4}
                required
                placeholder="e.g. Building entrance is under renovation, incorrect room number, updated operating hours..."
                className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Max 1000 characters</span>
                <span
                  className={
                    message.length >= 1000
                      ? "font-semibold text-destructive"
                      : ""
                  }
                >
                  {message.length} / 1000
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmitting || message.trim().length === 0}
              >
                {isSubmitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>{isSubmitting ? "Submitting..." : "Submit report"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  ) : null

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Flag className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        <span>Report a problem</span>
      </button>

      {mounted && createPortal(dialogContent, document.body)}
    </div>
  )
}

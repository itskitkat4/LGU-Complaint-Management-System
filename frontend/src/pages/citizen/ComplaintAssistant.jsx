import { focusRing, primaryBtn, secondaryBtn } from "../../components/ui";
import { Glyph, ErrorBanner, PanelIconButton, TypingDots, EvidencePicker } from "./CreateComplaintComponents";

export default function ComplaintAssistant({
  assistantOpen, setAssistantOpen, assistantReadyForReview, assistantDraft,
  assistantExpanded, setAssistantExpanded, assistantLoading, handleAssistantReset,
  handleApplyDraft, handleAssistantConfirm, submitting, assistantError, assistantBusy,
  pendingAssistantMessage, handleRetryMessage, hasConversation, firstName, messages,
  chatLogRef, assistantEvidence, assistantEvidencePreviewUrl, handleAssistantEvidenceChange,
  form, setForm, assistantBlocked, quickOptions, quickOptionIcons, handleSendMessage,
  handleChatSubmit, chatInputRef, chatInput, setChatInput,
}) {
  return (
    <>
      {/* AI launcher */}
      {!assistantOpen && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          aria-haspopup="dialog"
          aria-label="Ask AI"
          title="Ask AI"
          className={`glass-icon group fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105 lg:bottom-6 lg:right-6 ${focusRing}`}
        >
          <Glyph name="bot" className="h-7 w-7" />

          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
            Ask AI
          </span>

          {assistantReadyForReview && assistantDraft && (
            <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-70" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-400 ring-2 ring-emerald-800" />
              <span className="sr-only">A complaint draft is ready</span>
            </span>
          )}
        </button>
      )}

      {/* AI assistant modal */}
      {assistantOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close AI assistant"
            onClick={() => setAssistantOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />

          <dialog
            open
            aria-labelledby="assistant-heading"
            aria-modal="true"
            className={`relative z-10 m-0 flex h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white p-0 shadow-2xl sm:rounded-3xl ${
              assistantExpanded
                ? "sm:h-[85vh] sm:max-w-3xl"
                : "sm:h-[36rem] sm:max-w-md"
            }`}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <span className="glass-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Glyph name="bot" className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <h2
                  id="assistant-heading"
                  className="text-sm font-semibold text-slate-900"
                >
                  Bantay AI Assistant 
                </h2>

                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      assistantLoading ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />

                  {assistantLoading ? "Thinking..." : "Ready"}
                </p>
              </div>

              <PanelIconButton
                label="Start a new chat"
                onClick={handleAssistantReset}
              >
                <Glyph name="refresh" className="h-4 w-4" />
              </PanelIconButton>

              <PanelIconButton
                label={
                  assistantExpanded
                    ? "Make panel smaller"
                    : "Make panel larger"
                }
                onClick={() =>
                  setAssistantExpanded((previous) => !previous)
                }
                className="hidden sm:flex"
              >
                <Glyph
                  name={assistantExpanded ? "shrink" : "expand"}
                  className="h-4 w-4"
                />
              </PanelIconButton>

              <PanelIconButton
                label="Close assistant"
                onClick={() => setAssistantOpen(false)}
              >
                <Glyph name="x" className="h-4 w-4" />
              </PanelIconButton>
            </div>

            {/* Chat messages */}
            <div
              ref={chatLogRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              className="flex-1 overflow-y-auto bg-slate-50/50"
            >
              {!hasConversation ? (
                <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                  <span className="glass-icon flex h-12 w-12 items-center justify-center rounded-full">
                    <Glyph name="bot" className="h-6 w-6" />
                  </span>

                  <p className="mt-4 text-sm font-medium text-slate-800">
                    Hello, {firstName}. What can I help with?
                  </p>

                  <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                    Describe your problem or pick a question below. I can help
                    you organize it into a complaint.
                  </p>

                  {assistantError && (
                    <div className="mt-4 w-full space-y-2 text-left">
                      <ErrorBanner>{assistantError}</ErrorBanner>

                      {pendingAssistantMessage && (
                        <button
                          type="button"
                          onClick={handleRetryMessage}
                          disabled={assistantBusy}
                          className={`${secondaryBtn} gap-2`}
                        >
                          <Glyph name="refresh" className="h-4 w-4" />
                          Retry sending message
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 p-4 sm:p-5">
                  {messages.slice(1).map((message) => {
                    const isCitizen = message.sender === "citizen";

                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 ${
                          isCitizen ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isCitizen && (
                          <span className="glass-icon mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                            <Glyph name="bot" className="h-3.5 w-3.5" />
                          </span>
                        )}

                        <p
                          className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${
                            isCitizen
                              ? "glass-icon rounded-br-md"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          {message.text}
                        </p>
                      </div>
                    );
                  })}

                  {assistantLoading && (
                    <div className="flex items-end gap-2">
                      <span className="glass-icon mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                        <Glyph name="bot" className="h-3.5 w-3.5" />
                      </span>

                      <output
                        aria-live="polite"
                        className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3.5"
                      >
                        <TypingDots />

                        <span className="sr-only">
                          BantaySerbisyo is preparing a response...
                        </span>
                      </output>
                    </div>
                  )}

                  {assistantError && (
                    <div className="space-y-2">
                      <ErrorBanner>{assistantError}</ErrorBanner>

                      {pendingAssistantMessage && (
                        <button
                          type="button"
                          onClick={handleRetryMessage}
                          disabled={assistantBusy}
                          className={`${secondaryBtn} gap-2`}
                        >
                          <Glyph name="refresh" className="h-4 w-4" />
                          Retry sending message
                        </button>
                      )}
                    </div>
                  )}

                  {/* AI complaint review */}
                  {assistantReadyForReview && assistantDraft && (
                    <section className="glass-soft space-y-4 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="glass-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                          <Glyph
                            name="shield"
                            className="h-[18px] w-[18px]"
                          />
                        </span>

                        <div>
                          <h3 className="font-semibold text-emerald-900">
                            Review your complaint
                          </h3>

                          <p className="mt-1 text-sm text-emerald-900">
                            Check these details. Your complaint is not
                            submitted until you confirm below.
                          </p>
                        </div>
                      </div>

                      <dl className="grid gap-4 rounded-xl border border-emerald-100 bg-white p-4 text-sm">
                        {[
                          {
                            icon: "type",
                            label: "Title",
                            value: assistantDraft.title,
                          },
                          {
                            icon: "tag",
                            label: "Category",
                            value: assistantDraft.category_name,
                          },
                          {
                            icon: "building",
                            label: "Incident barangay",
                            value: assistantDraft.barangay_name,
                          },
                          {
                            icon: "pin",
                            label: "Specific location",
                            value: assistantDraft.location,
                          },
                          {
                            icon: "file",
                            label: "Description",
                            value: assistantDraft.description,
                          },
                        ].map((row) => (
                          <div
                            key={row.label}
                            className="flex items-start gap-2.5"
                          >
                            <Glyph
                              name={row.icon}
                              className="mt-0.5 h-4 w-4 text-emerald-700"
                            />

                            <div className="min-w-0">
                              <dt className="font-medium text-slate-600">
                                {row.label}
                              </dt>

                              <dd className="mt-0.5 whitespace-pre-line break-words text-slate-900">
                                {row.value || "Not provided"}
                              </dd>
                            </div>
                          </div>
                        ))}
                      </dl>

                      <div>
                        <span className="mb-1.5 flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-700">
                          <Glyph
                            name="camera"
                            className="h-4 w-4 text-emerald-700"
                          />

                          Photo evidence

                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            Required to submit here
                          </span>
                        </span>

                        <EvidencePicker
                          id="assistant-evidence"
                          file={assistantEvidence}
                          previewUrl={assistantEvidencePreviewUrl}
                          onChange={handleAssistantEvidenceChange}
                        />
                      </div>

                      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={form.is_anonymous}
                          onChange={(event) => setForm((previous) => ({ ...previous, is_anonymous: event.target.checked }))}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                        />
                        <span>
                          <span className="block font-medium text-slate-900">Submit anonymously</span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-600">System Administrators can view your identity. Other personnel roles cannot.</span>
                        </span>
                      </label>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            void handleAssistantConfirm();
                          }}
                          disabled={submitting || assistantLoading}
                          className={`${primaryBtn} w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`}
                        >
                          <Glyph name="check" className="h-4 w-4" />

                          {submitting
                            ? "Submitting..."
                            : "Confirm and Submit Complaint"}
                        </button>

                        <button
                          type="button"
                          onClick={handleApplyDraft}
                          disabled={submitting || assistantLoading}
                          className={`${secondaryBtn} w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`}
                        >
                          <Glyph name="wand" className="h-4 w-4" />
                          Fill the form instead
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            {/* Chat composer */}
            <div className="space-y-3 border-t border-slate-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  Ask
                </span>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {quickOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSendMessage(option)}
                      disabled={assistantBlocked}
                      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                    >
                      <Glyph
                        name={quickOptionIcons[option]}
                        className="h-3.5 w-3.5 text-emerald-700"
                      />

                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleChatSubmit}
                className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white p-1.5 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/20"
              >
                <label htmlFor="assistant-message" className="sr-only">
                  Type a message
                </label>

                <input
                  id="assistant-message"
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask AI Assistant..."
                  disabled={assistantBlocked}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                />

                <button
                  type="submit"
                  disabled={!chatInput.trim() || assistantBlocked}
                  aria-label="Send message"
                  className={`glass-btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  <Glyph name="arrowUp" className="h-4 w-4" />
                </button>
              </form>

              <p className="text-center text-xs text-slate-400">
                The assistant can make mistakes. Check the details before you
                submit.
              </p>
            </div>
          </dialog>
        </div>
      )}
    </>
  );
}

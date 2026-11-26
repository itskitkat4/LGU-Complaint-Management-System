import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import CitizenLayout from "../../layouts/CitizenLayout";
import {
  focusRing,
  secondaryBtn,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import {
  Glyph,
  ComplaintDetailsForm,
} from "./CreateComplaintComponents";
import { validateImage } from "./complaintEvidence";
import ComplaintAssistant from "./ComplaintAssistant";
import {
  chatWithComplaintAssistant,
  createComplaint,
  getBarangays,
  getComplaintCategories,
} from "../../lib/api";

// -----------------------------------------------------------------------------
// Constants and helpers
// -----------------------------------------------------------------------------

const REQUEST_TIMEOUT = 45_000;
const MAX_MESSAGES = 100;

const QUICK_OPTIONS = [
  "Submit a Complaint",
  "How does this work?",
  "FAQ",
  "How to submit a complaint",
  "Track my complaint",
];

const QUICK_OPTION_ICONS = {
  "Submit a Complaint": "clipboard",
  "How does this work?": "help",
  FAQ: "info",
  "How to submit a complaint": "file",
  "Track my complaint": "search",
};

let messageCounter = 0;

function createMessageId() {
  messageCounter += 1;
  return `message-${messageCounter}`;
}

function greeting(firstName) {
  return {
    id: "greeting",
    sender: "assistant",
    text: `Hello, ${firstName}. How may I help you today?\nWelcome to BantaySerbisyo. Please choose an option below.`,
  };
}

function toChatHistory(messages) {
  return messages
    .slice(1)
    .slice(-MAX_MESSAGES)
    .map(({ sender, text }) => ({
      role: sender === "citizen" ? "user" : "assistant",
      text,
    }));
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export default function CreateComplaint() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const displayName =
    profile?.full_name || profile?.email?.split("@")[0] || "Citizen";

  const firstName = displayName.split(" ")[0];

  // Complaint form state
  const [form, setForm] = useState({
    title: "",
    category_id: "",
    barangay_id: "",
    location: "",
    description: "",
    is_anonymous: false,
  });

  const [categories, setCategories] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [evidence, setEvidence] = useState(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState("");
  const [loadingFormData, setLoadingFormData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // AI assistant state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantExpanded, setAssistantExpanded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");

  const [assistantEvidence, setAssistantEvidence] = useState(null);
  const [assistantEvidencePreviewUrl, setAssistantEvidencePreviewUrl] =
    useState("");

  const [assistantDraft, setAssistantDraft] = useState(null);
  const [assistantReadyForReview, setAssistantReadyForReview] =
    useState(false);

  const [messages, setMessages] = useState(() => [greeting(firstName)]);
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState(null);

  const chatLogRef = useRef(null);
  const chatInputRef = useRef(null);
  const assistantRequestInFlightRef = useRef(false);

  const hasConversation = messages.length > 1;
  const assistantBusy = assistantLoading || submitting;
  const assistantBlocked =
    assistantBusy || Boolean(pendingAssistantMessage);

  const descriptionLength = form.description.length;

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!evidencePreviewUrl) return undefined;

    return () => URL.revokeObjectURL(evidencePreviewUrl);
  }, [evidencePreviewUrl]);

  useEffect(() => {
    if (!assistantEvidencePreviewUrl) return undefined;

    return () => URL.revokeObjectURL(assistantEvidencePreviewUrl);
  }, [assistantEvidencePreviewUrl]);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [
    messages,
    assistantLoading,
    assistantReadyForReview,
    assistantOpen,
    assistantError,
  ]);

  useEffect(() => {
    if (!assistantOpen) return undefined;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setAssistantOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    chatInputRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [assistantOpen]);

  useEffect(() => {
    async function loadFormData() {
      try {
        const [categoryData, barangayData] = await Promise.all([
          getComplaintCategories(),
          getBarangays(),
        ]);

        setCategories(categoryData);
        setBarangays(barangayData);
      } catch (requestError) {
        setError(
          requestError.message || "Failed to load complaint form data."
        );
      } finally {
        setLoadingFormData(false);
      }
    }

    void loadFormData();
  }, []);

  // ---------------------------------------------------------------------------
  // AI assistant requests
  // ---------------------------------------------------------------------------

  async function requestAssistant(history) {
    setAssistantError("");
    setAssistantLoading(true);

    const controller = new AbortController();
    let timeoutId;

    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        controller.abort();

        reject(
          new Error(
            "The AI assistant is taking longer than expected. Please retry."
          )
        );
      }, REQUEST_TIMEOUT);
    });

    try {
      const result = await Promise.race([
        chatWithComplaintAssistant(history, {
          signal: controller.signal,
        }),
        timeout,
      ]);

      if (
        !result ||
        typeof result.reply !== "string" ||
        !result.draft ||
        typeof result.draft !== "object"
      ) {
        throw new Error(
          "The AI returned an invalid response. Please try again."
        );
      }

      setAssistantDraft(result.draft);
      setAssistantReadyForReview(result.ready_for_review === true);

      setMessages((previous) => [
        ...previous,
        {
          id: createMessageId(),
          sender: "assistant",
          text: result.reply,
        },
      ]);

      setPendingAssistantMessage(null);
    } catch (requestError) {
      setAssistantError(
        requestError.message ||
          "Unable to contact the AI assistant. Please try again."
      );
    } finally {
      window.clearTimeout(timeoutId);
      assistantRequestInFlightRef.current = false;
      setAssistantLoading(false);
    }
  }

  async function sendAssistantMessage(text) {
    const message = text.trim();

    if (
      !message ||
      assistantBusy ||
      assistantRequestInFlightRef.current ||
      pendingAssistantMessage
    ) {
      return;
    }

    assistantRequestInFlightRef.current = true;

    const updatedMessages = [
      ...messages,
      {
        id: createMessageId(),
        sender: "citizen",
        text: message,
      },
    ];

    setMessages(updatedMessages);
    setPendingAssistantMessage(message);
    setAssistantError("");
    setChatInput("");

    await requestAssistant(toChatHistory(updatedMessages));
  }

  async function retryAssistantMessage() {
    if (
      !pendingAssistantMessage ||
      assistantBusy ||
      assistantRequestInFlightRef.current
    ) {
      return;
    }

    assistantRequestInFlightRef.current = true;

    await requestAssistant(toChatHistory(messages));
  }

  function handleSendMessage(text) {
    void sendAssistantMessage(text).catch((requestError) => {
      setAssistantError(
        requestError.message || "Unable to send your message."
      );
    });
  }

  function handleRetryMessage() {
    void retryAssistantMessage().catch((requestError) => {
      setAssistantError(
        requestError.message || "Unable to retry your message."
      );
    });
  }

  function handleAssistantReset() {
    if (assistantBusy || assistantRequestInFlightRef.current) return;

    setMessages([greeting(firstName)]);
    setPendingAssistantMessage(null);
    setAssistantDraft(null);
    setAssistantReadyForReview(false);
    setAssistantEvidence(null);
    setAssistantEvidencePreviewUrl("");
    setAssistantError("");
    setChatInput("");

    chatInputRef.current?.focus();
  }

  function handleChatSubmit(event) {
    event.preventDefault();
    handleSendMessage(chatInput);
  }

  function handleAssistantEvidenceChange(file) {
    setAssistantError("");

    const problem = validateImage(file);

    if (problem) {
      setAssistantEvidence(null);
      setAssistantEvidencePreviewUrl("");
      setAssistantError(problem);
      return;
    }

    setAssistantEvidence(file);
    setAssistantEvidencePreviewUrl(
      file ? URL.createObjectURL(file) : ""
    );
  }

  // ---------------------------------------------------------------------------
  // AI draft actions
  // ---------------------------------------------------------------------------

  function handleApplyDraft() {
    if (!assistantDraft) return;

    setForm({
      title: assistantDraft.title ?? "",
      category_id: assistantDraft.category_id ?? "",
      barangay_id: assistantDraft.barangay_id ?? "",
      location: assistantDraft.location ?? "",
      description: assistantDraft.description ?? "",
    });

    if (assistantEvidence) {
      setEvidence(assistantEvidence);
      setEvidencePreviewUrl(URL.createObjectURL(assistantEvidence));
    }

    setError("");
    setAssistantOpen(false);

    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Form filled from the AI draft",
      showConfirmButton: false,
      timer: 2500,
    });
  }

  async function handleAssistantConfirm() {
    setAssistantError("");

    if (!assistantReadyForReview || !assistantDraft) {
      setAssistantError(
        "Please complete the complaint details before submitting."
      );
      return;
    }

    if (!assistantEvidence) {
      setAssistantError(
        "A photo of the issue is required to submit this complaint."
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await createComplaint({
        title: assistantDraft.title,
        category_id: assistantDraft.category_id,
        barangay_id: assistantDraft.barangay_id,
        description: `Specific location: ${assistantDraft.location}\n\n${assistantDraft.description}`,
        attachments: [assistantEvidence],
        is_anonymous: form.is_anonymous,
      });

      await Swal.fire({
        title: "Complaint submitted",
        text: result.message || "Your complaint was submitted successfully.",
        icon: "success",
        confirmButtonText: "Continue",
        confirmButtonColor: "#047857",
      });

      await navigate("/citizen/complaints");
    } catch (requestError) {
      setAssistantError(
        requestError.message || "Failed to submit complaint."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Normal complaint form
  // ---------------------------------------------------------------------------

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleEvidenceChange(file) {
    const problem = validateImage(file);

    if (problem) {
      setEvidence(null);
      setEvidencePreviewUrl("");
      setError(problem);
      return;
    }

    setError("");
    setEvidence(file);
    setEvidencePreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.category_id) {
      setError("Please select a complaint category.");
      return;
    }

    if (!form.barangay_id) {
      setError("Please select the barangay where the incident happened.");
      return;
    }

    try {
      setSubmitting(true);

      const result = await createComplaint({
        title: form.title,
        category_id: form.category_id,
        barangay_id: form.barangay_id,
        description: `Specific location: ${form.location}\n\n${form.description}`,
        attachments: evidence ? [evidence] : [],
        is_anonymous: form.is_anonymous,
      });

      await Swal.fire({
        title: "Complaint submitted",
        text: result.message || "Your complaint was submitted successfully.",
        icon: "success",
        confirmButtonText: "Continue",
        confirmButtonColor: "#047857",
      });

      await navigate("/citizen/complaints");
    } catch (requestError) {
      setError(requestError.message || "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <CitizenLayout title="Submit Complaint" profile={profile}>
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Page heading */}
        <div className="flex items-center gap-3">
          <Link
            to="/citizen/dashboard"
            aria-label="Back to dashboard"
            title="Back to dashboard"
            className={`glass flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:text-emerald-800 ${focusRing}`}
          >
            <Glyph name="back" className="h-4 w-4" />
          </Link>

          <div>
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-slate-900">
              Submit a Complaint
            </h1>

            <p className="text-sm text-slate-500">
              Tell us what happened and where.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <ComplaintDetailsForm
            form={form}
            onChange={handleChange}
            loadingFormData={loadingFormData}
            categories={categories}
            barangays={barangays}
            error={error}
            descriptionLength={descriptionLength}
            evidence={evidence}
            evidencePreviewUrl={evidencePreviewUrl}
            onEvidenceChange={handleEvidenceChange}
            onAnonymousChange={(checked) => setForm((previous) => ({ ...previous, is_anonymous: checked }))}
            submitting={submitting}
            onSubmit={handleSubmit}
          />

          {/* Desktop help panel */}
          <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block">
            <div className="glass rounded-2xl p-4">
              <span className="glass-icon flex h-9 w-9 items-center justify-center rounded-xl">
                <Glyph name="bot" className="h-[18px] w-[18px]" />
              </span>

              <h2 className="mt-3 text-sm font-semibold text-emerald-900">
                Not sure what to write?
              </h2>

              <p className="mt-1 text-sm leading-5 text-emerald-900/80">
                The AI assistant can ask you questions and turn your answers
                into a complaint draft.
              </p>

              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                aria-haspopup="dialog"
                className={`${secondaryBtn} mt-3 w-full gap-2`}
              >
                <Glyph name="bot" className="h-4 w-4" />
                Ask AI
              </button>
            </div>

            <div className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                For a faster response
              </h2>

              <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
                {[
                  "Name the street or a nearby landmark",
                  "Say when the problem started",
                  "Add a clear photo of the issue",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <Glyph
                      name="check"
                      className="mt-0.5 h-4 w-4 text-emerald-700"
                    />
                    {tip}
                  </li>
                ))}
              </ul>

              <Link
                to="/citizen/complaints"
                className={`mt-4 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
              >
                <Glyph name="search" className="h-4 w-4" />
                Track my complaints
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <ComplaintAssistant
        assistantOpen={assistantOpen}
        setAssistantOpen={setAssistantOpen}
        assistantReadyForReview={assistantReadyForReview}
        assistantDraft={assistantDraft}
        assistantExpanded={assistantExpanded}
        setAssistantExpanded={setAssistantExpanded}
        assistantLoading={assistantLoading}
        handleAssistantReset={handleAssistantReset}
        handleApplyDraft={handleApplyDraft}
        handleAssistantConfirm={handleAssistantConfirm}
        submitting={submitting}
        assistantError={assistantError}
        assistantBusy={assistantBusy}
        pendingAssistantMessage={pendingAssistantMessage}
        handleRetryMessage={handleRetryMessage}
        hasConversation={hasConversation}
        firstName={firstName}
        messages={messages}
        chatLogRef={chatLogRef}
        assistantEvidence={assistantEvidence}
        assistantEvidencePreviewUrl={assistantEvidencePreviewUrl}
        handleAssistantEvidenceChange={handleAssistantEvidenceChange}
        form={form}
        setForm={setForm}
        assistantBlocked={assistantBlocked}
        quickOptions={QUICK_OPTIONS}
        quickOptionIcons={QUICK_OPTION_ICONS}
        handleSendMessage={handleSendMessage}
        handleChatSubmit={handleChatSubmit}
        chatInputRef={chatInputRef}
        chatInput={chatInput}
        setChatInput={setChatInput}
      />
    </CitizenLayout>
  );
}

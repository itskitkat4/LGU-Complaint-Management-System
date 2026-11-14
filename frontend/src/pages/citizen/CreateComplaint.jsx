import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import CitizenLayout from "../../layouts/CitizenLayout";
import { Icon, focusRing, inputClass, primaryBtn, secondaryBtn, } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { getComplaintCategories, getBarangays, createComplaint, } from "../../lib/api";

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

function Field({ id, label, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function CreateComplaint() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const displayName =
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "Citizen";
  const firstName = displayName.split(" ")[0];

  const [form, setForm] = useState({
    title: "",
    category_id: "",
    barangay_id: "",
    location: "",
    description: "",
  });

  const [categories, setCategories] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [evidence, setEvidence] = useState(null);
  const [submissionMode, setSubmissionMode] = useState("selection");

  const [loadingFormData, setLoadingFormData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      id: 0,
      sender: "assistant",
      text: `Hello, ${firstName}. How may I help you today?\nWelcome to BantaySerbisyo. Please choose an option below.`,
    },
  ]);

  const quickOptions = [
    "Submit a Complaint",
    "How does this work?",
    "FAQ",
    "How to submit a complaint",
    "Track my complaint",
  ];

  function addChatMessage(text, reply) {
    setMessages((previous) => [
      ...previous,
      { id: previous.length, sender: "citizen", text },
      { id: previous.length + 1, sender: "assistant", text: reply },
    ]);
  }

  function handleQuickOption(option) {
    const reply =
      option === "Submit a Complaint"
        ? "Sure! I can help you submit a complaint. What issue would you like to report?"
        : `${option} will be implemented in a later phase.`;

    addChatMessage(option, reply);
  }

  function handleChatSubmit(event) {
    event.preventDefault();
    const message = chatInput.trim();

    if (!message) return;

    addChatMessage(
      message,
      "Thanks for your message. Chat assistance will be available in a later phase. You can use the complaint form below to submit your complaint."
    );
    setChatInput("");
  }

  // Load active categories and all available barangays.
  useEffect(() => {
    async function loadFormData() {
      try {
        const [categoryData, barangayData] = await Promise.all([
          getComplaintCategories(),
          getBarangays(),
        ]);

        setCategories(categoryData);
        setBarangays(barangayData);
      } catch (error) {
        setError(error.message || "Failed to load complaint form data.");
      } finally {
        setLoadingFormData(false);
      }
    }

    loadFormData();
  }, []);

  // Handle changes in form fields.
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Submit complaint to Laravel API.
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

      // Include the specific location in the complaint description.
      const completeDescription =
        `Specific location: ${form.location}\n\n${form.description}`;

      const result = await createComplaint({
        barangay_id: form.barangay_id,
        category_id: form.category_id,
        title: form.title,
        description: completeDescription,
        attachments: evidence ? [evidence] : [],
      });

      await Swal.fire({
        title: "Complaint submitted",
        text: result.message || "Your complaint was submitted successfully.",
        icon: "success",
        confirmButtonText: "Continue",
        confirmButtonColor: "#047857",
      });

      navigate("/citizen/complaints");
    } catch (error) {
      setError(error.message || "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CitizenLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Page heading */}
        <div>
          <Link
            to="/citizen/dashboard"
            className={`inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
          >
            <Icon name="back" className="h-4 w-4" />
            Back to dashboard
          </Link>

          {submissionMode === "selection" ? (
            <>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Submit a Complaint
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Choose how you want to report your concern.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSubmissionMode("selection")}
                className={`mt-4 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
              >
                <Icon name="back" className="h-4 w-4" />
                Back
              </button>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {submissionMode === "assistant"
                  ? "AI Complaint Assistant"
                  : "Manual Complaint Form"}
              </h1>
            </>
          )}
        </div>

        {submissionMode === "selection" && (
          <section
            aria-label="Choose a complaint submission method"
            className="grid gap-5 md:grid-cols-2"
          >
            <div className="flex flex-col rounded-xl border border-emerald-100 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">
                AI Complaint Assistant
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                Chat with the AI assistant. It will guide you through the complaint process and help organize your complaint details.
              </p>
              <button
                type="button"
                onClick={() => setSubmissionMode("assistant")}
                className={`${primaryBtn} mt-5 w-full sm:w-auto`}
              >
                Use AI Assistant
              </button>
            </div>

            <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">
                Manual Complaint Form
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                Fill out the complaint form yourself using the existing form fields and evidence upload.
              </p>
              <button
                type="button"
                onClick={() => setSubmissionMode("manual")}
                className={`${primaryBtn} mt-5 w-full sm:w-auto`}
              >
                Use Manual Form
              </button>
            </div>
          </section>
        )}

        {/* Citizen AI assistant chat UI */}
        {submissionMode === "assistant" && (
          <section
            aria-labelledby="assistant-heading"
            className="overflow-hidden rounded-xl border border-emerald-100 bg-white"
          >
          <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white">
              <Icon name="sparkle" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="assistant-heading" className="text-sm font-semibold text-emerald-950">
                BantaySerbisyo Assistant
              </h2>
              <p className="text-xs text-emerald-900/70">Complaint support</p>
            </div>
          </div>

          <div
            aria-live="polite"
            aria-relevant="additions"
            className="max-h-96 space-y-4 overflow-y-auto p-5"
            role="log"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "citizen" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${
                    message.sender === "citizen"
                      ? "rounded-br-md bg-emerald-800 text-white"
                      : "rounded-bl-md bg-slate-100 text-slate-800"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t border-slate-100 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleQuickOption(option)}
                  className={`rounded-full border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-50 sm:text-sm ${focusRing}`}
                >
                  {option}
                </button>
              ))}
            </div>

            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <label htmlFor="assistant-message" className="sr-only">
                Type a message
              </label>
              <input
                id="assistant-message"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Type your message..."
                className={inputClass}
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className={`${primaryBtn} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Send
              </button>
            </form>
          </div>
          </section>
        )}

        {/* Complaint form */}
        {submissionMode === "manual" && (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white"
          >
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">
              Complaint details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Fields are required unless marked optional.
            </p>
          </div>

          <div className="space-y-6 p-6">
            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Basic information */}
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="title" label="Complaint title">
                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  placeholder="e.g. Uncollected garbage"
                  className={inputClass}
                />
              </Field>

              <Field id="category_id" label="Complaint category">
                {loadingFormData ? (
                  <div role="status">
                    <span className="sr-only">Loading categories...</span>
                    <Skeleton className="h-12 w-full rounded-md" />
                  </div>
                ) : (
                  <select
                    id="category_id"
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                    required
                    disabled={loadingFormData}
                    className={inputClass}
                  >
                    <option value="">
                      {loadingFormData
                        ? "Loading categories..."
                        : "Select a category"}
                    </option>

                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              {/* Incident barangay */}
              <Field
                id="barangay_id"
                label="Barangay where the incident happened"
              >
                {loadingFormData ? (
                  <div role="status">
                    <span className="sr-only">Loading barangays...</span>
                    <Skeleton className="h-12 w-full rounded-md" />
                  </div>
                ) : (
                  <select
                    id="barangay_id"
                    name="barangay_id"
                    value={form.barangay_id}
                    onChange={handleChange}
                    required
                    disabled={loadingFormData || barangays.length === 0}
                    className={inputClass}
                  >
                    <option value="">
                      {loadingFormData
                        ? "Loading barangays..."
                        : "Select incident barangay"}
                    </option>

                    {barangays.map((barangay) => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                )}

                <p className="mt-1.5 text-xs text-slate-500">
                  Select the barangay where the problem or incident
                  occurred.
                </p>
              </Field>

              {/* Specific location */}
              <Field id="location" label="Specific location">
                <input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  required
                  placeholder="Street, landmark, or nearby place"
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Complaint description */}
            <Field id="description" label="Complaint details">
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={6}
                maxLength={5000}
                placeholder="What happened? Where and when did it happen? Provide the details you know."
                className={`${inputClass} resize-y`}
              />

              <p className="mt-1.5 text-right text-xs text-slate-500">
                {form.description.length}/5000 characters
              </p>
            </Field>

            {/* Supporting evidence */}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Supporting evidence{" "}
                <span className="font-normal text-slate-500">
                  (optional)
                </span>
              </span>

              <label
                htmlFor="evidence"
                className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center transition-colors hover:border-emerald-700 hover:bg-emerald-50/50 focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                  <Icon name="upload" className="h-6 w-6" />
                </span>

                <span className="mt-4 text-sm font-semibold text-slate-900">
                  Choose an evidence photo
                </span>

                <span className="mt-1 text-sm text-slate-500">
                  JPG, PNG, or WEBP (maximum 5 MB)
                </span>

                <input
                  id="evidence"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) =>
                    setEvidence(event.target.files?.[0] ?? null)
                  }
                />
              </label>

              {evidence && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                  <Icon name="check" className="h-4 w-4" />
                  Selected: {evidence.name}
                </p>
              )}
            </div>
          </div>

          {/* Form actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
            <Link to="/citizen/dashboard" className={secondaryBtn}>
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingFormData ||
                categories.length === 0 ||
                barangays.length === 0
              }
              className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {submitting ? "Submitting..." : "Submit complaint"}
              {!submitting && (
                <Icon name="arrow" className="h-4 w-4" />
              )}
            </button>
          </div>
          </form>
        )}
      </div>
    </CitizenLayout>
  );
}

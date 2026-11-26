import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const authState = vi.hoisted(() => ({
  userId: "user-1",
  authListener: null,
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args) => authState.getSession(...args),
      onAuthStateChange: (...args) => authState.onAuthStateChange(...args),
    },
  },
}));

const cacheCases = [
  {
    name: "complaint history",
    ttl: 10_000,
    read: (api) => api.getStaffComplaintHistory(1),
    path: "/staff/complaints/history",
  },
  {
    name: "staff reports summary",
    ttl: 30_000,
    read: (api) => api.getStaffReports(),
    path: "/staff/reports/summary",
  },
  {
    name: "feedback monitoring",
    ttl: 5_000,
    read: (api) => api.getFeedbackMonitoring({ page: 1, rating: 5 }),
    path: "/feedback",
  },
];

const historyPath = "/staff/complaints/history";
const reportsPath = "/staff/reports/summary";
const feedbackPath = "/feedback";

const mutationCases = [
  {
    name: "createComplaint",
    invalidates: [historyPath, reportsPath],
    run: (api) => api.createComplaint({
      barangay_id: "barangay-1",
      category_id: "category-1",
      title: "Road damage",
      description: "A damaged road needs attention.",
    }),
  },
  {
    name: "reviewComplaint",
    invalidates: [historyPath, reportsPath, feedbackPath],
    run: (api) => api.reviewComplaint("complaint-1", "accepted"),
  },
  {
    name: "routeComplaint",
    invalidates: [historyPath, reportsPath, feedbackPath],
    run: (api) => api.routeComplaint("complaint-1", "assignee-1", "Routing reason."),
  },
  {
    name: "assignComplaintToPersonnel",
    invalidates: [historyPath, feedbackPath],
    run: (api) => api.assignComplaintToPersonnel(
      "complaint-1",
      "personnel-1",
      "Assignment reason."
    ),
  },
  {
    name: "requestComplaintEscalation",
    invalidates: [historyPath, reportsPath, feedbackPath],
    run: (api) => api.requestComplaintEscalation(
      "complaint-1",
      "department-1",
      "Escalation reason."
    ),
  },
  {
    name: "reviewStaffEscalation",
    invalidates: [historyPath, reportsPath, feedbackPath],
    run: (api) => api.reviewStaffEscalation("escalation-1", {
      decision: "accepted",
      review_comment: "Reviewed and accepted.",
    }),
  },
  {
    name: "recordDepartmentEscalationOutcome",
    invalidates: [historyPath, reportsPath, feedbackPath],
    run: (api) => api.recordDepartmentEscalationOutcome(
      "escalation-1",
      "Outcome recorded."
    ),
  },
  {
    name: "submitComplaintResolution",
    invalidates: [historyPath, reportsPath, feedbackPath],
    run: (api) => api.submitComplaintResolution(
      "complaint-1",
      "Completed the required repair.",
      "before.jpg",
      "2025-01-01",
      []
    ),
  },
  {
    name: "reviewResolution",
    invalidates: [historyPath, reportsPath, feedbackPath],
    run: (api) => api.reviewResolution("resolution-1", "approved"),
  },
  {
    name: "startDepartmentPersonnelWork",
    invalidates: [historyPath, reportsPath, feedbackPath],
    run: (api) => api.startDepartmentPersonnelWork("complaint-1"),
  },
  {
    name: "startBarangayHeadWork",
    invalidates: [historyPath, reportsPath, feedbackPath],
    run: (api) => api.startBarangayHeadWork("complaint-1"),
  },
  {
    name: "submitCitizenFeedback",
    invalidates: [feedbackPath],
    run: (api) => api.submitCitizenFeedback("complaint-1", 5, "Good service."),
  },
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function endpointRequestCount(fetchMock, path, method = "GET") {
  return fetchMock.mock.calls.filter(([url, options]) => {
    const requestUrl = new URL(url, "http://localhost");
    return requestUrl.pathname.endsWith(path)
      && (options.method || "GET") === method;
  }).length;
}

async function flushPromises() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

let api;
let fetchMock;
let fetchResponder;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

  authState.userId = "user-1";
  authState.authListener = null;
  authState.getSession.mockReset();
  authState.getSession.mockImplementation(async () => ({
    data: {
      session: {
        access_token: "test-access-token",
        user: authState.userId ? { id: authState.userId } : null,
      },
    },
    error: null,
  }));
  authState.onAuthStateChange.mockReset();
  authState.onAuthStateChange.mockImplementation((callback) => {
    authState.authListener = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });

  let responseNumber = 0;
  fetchResponder = async (url) => ({ request: ++responseNumber, url });
  fetchMock = vi.fn(async (url, options) => {
    const response = await fetchResponder(url, options);
    return response instanceof Response
      ? response
      : jsonResponse(response.body ?? response);
  });
  vi.stubGlobal("fetch", fetchMock);

  api = await import("./api.js");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LGU Staff API response caches", () => {
  it.each(cacheCases)("$name returns a cached response within its TTL", async (cache) => {
    const first = await cache.read(api);
    const second = await cache.read(api);

    expect(second).toEqual(first);
    expect(endpointRequestCount(fetchMock, cache.path)).toBe(1);
  });

  it.each(cacheCases)("$name expires at its configured TTL", async (cache) => {
    const first = await cache.read(api);
    await vi.advanceTimersByTimeAsync(cache.ttl - 1);
    expect(await cache.read(api)).toEqual(first);
    expect(endpointRequestCount(fetchMock, cache.path)).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    const refreshed = await cache.read(api);
    expect(refreshed).not.toEqual(first);
    expect(endpointRequestCount(fetchMock, cache.path)).toBe(2);
  });

  it.each(cacheCases)("$name deduplicates concurrent identical requests", async (cache) => {
    const response = deferred();
    fetchResponder = () => response.promise;

    const firstRequest = cache.read(api);
    const secondRequest = cache.read(api);
    await flushPromises();

    expect(endpointRequestCount(fetchMock, cache.path)).toBe(1);
    response.resolve({ shared: true });
    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { shared: true },
      { shared: true },
    ]);
  });

  it("uses separate complaint history entries for different pages", async () => {
    await api.getStaffComplaintHistory(1);
    const pageTwo = await api.getStaffComplaintHistory(2);
    await api.getStaffComplaintHistory(1);

    expect(endpointRequestCount(fetchMock, historyPath)).toBe(2);
    expect(fetchMock.mock.calls.map(([url]) => new URL(url, "http://localhost").searchParams.get("page")))
      .toEqual(["1", "2"]);
    expect(pageTwo.url).toContain("page=2");
  });

  it("caches only the staff report summary endpoint", async () => {
    await api.getStaffReports();
    await api.getStaffReports();
    await api.createStaffReport("2025-01-01", "2025-01-31");
    await api.uploadStaffReportPdf("report-1", new Blob(["pdf"]), "report.pdf");
    await api.getStaffReportPdfSignedUrl("report-1");
    await api.getStaffReportPdfSignedUrl("report-1");
    await api.getStaffReports();

    expect(endpointRequestCount(fetchMock, reportsPath)).toBe(1);
    expect(endpointRequestCount(fetchMock, "/staff/reports", "POST")).toBe(1);
    expect(endpointRequestCount(fetchMock, "/staff/reports/report-1/pdf", "POST")).toBe(1);
    expect(endpointRequestCount(fetchMock, "/staff/reports/report-1/pdf/signed-url")).toBe(2);
  });

  it("uses separate feedback entries for different filters and reuses equivalent filters", async () => {
    const first = await api.getFeedbackMonitoring({ page: 1, rating: 5 });
    const equivalent = await api.getFeedbackMonitoring({ rating: 5, page: 1 });
    const otherPage = await api.getFeedbackMonitoring({ page: 2, rating: 5 });
    const otherRating = await api.getFeedbackMonitoring({ page: 1, rating: 4 });

    expect(equivalent).toEqual(first);
    expect(otherPage).not.toEqual(first);
    expect(otherRating).not.toEqual(first);
    expect(endpointRequestCount(fetchMock, feedbackPath)).toBe(3);
    expect(fetchMock.mock.calls.map(([url]) => new URL(url, "http://localhost").searchParams.toString()))
      .toEqual(["page=1&rating=5", "page=2&rating=5", "page=1&rating=4"]);
  });

  it("keeps citizen feedback requests outside the staff monitoring cache", async () => {
    const staffResult = await api.getFeedbackMonitoring({ page: 1 });
    const citizenResult = await api.getMyFeedback(1);
    await api.getMyFeedback(1);
    const cachedStaffResult = await api.getFeedbackMonitoring({ page: 1 });

    expect(citizenResult).not.toEqual(staffResult);
    expect(cachedStaffResult).toEqual(staffResult);
    expect(endpointRequestCount(fetchMock, feedbackPath)).toBe(3);
  });

  it.each(cacheCases)("$name does not cache failed GET responses", async (cache) => {
    fetchResponder = async () => jsonResponse({ message: "Server error" }, 500);
    await expect(cache.read(api)).rejects.toThrow();

    fetchResponder = async () => ({ recovered: true });
    await expect(cache.read(api)).resolves.toEqual({ recovered: true });
    await expect(cache.read(api)).resolves.toEqual({ recovered: true });
    expect(endpointRequestCount(fetchMock, cache.path)).toBe(2);
  });

  it.each(cacheCases)("$name keeps cached values isolated by authenticated user", async (cache) => {
    const userOne = await cache.read(api);
    authState.userId = "user-2";
    const userTwo = await cache.read(api);
    authState.userId = "user-1";
    const userOneAgain = await cache.read(api);

    expect(userTwo).not.toEqual(userOne);
    expect(userOneAgain).toEqual(userOne);
    expect(endpointRequestCount(fetchMock, cache.path)).toBe(2);
  });

  it.each(cacheCases)("$name keeps pending requests isolated by authenticated user", async (cache) => {
    const responses = [deferred(), deferred()];
    fetchResponder = () => responses[fetchMock.mock.calls.length - 1].promise;

    const userOneRequest = cache.read(api);
    await flushPromises();
    authState.userId = "user-2";
    const userTwoRequest = cache.read(api);
    await flushPromises();

    expect(endpointRequestCount(fetchMock, cache.path)).toBe(2);
    responses[0].resolve({ user: "user-1" });
    responses[1].resolve({ user: "user-2" });
    await expect(Promise.all([userOneRequest, userTwoRequest])).resolves.toEqual([
      { user: "user-1" },
      { user: "user-2" },
    ]);
  });

  it.each(cacheCases)("$name bypasses cache when there is no authenticated user ID", async (cache) => {
    authState.userId = null;
    await cache.read(api);
    await cache.read(api);

    expect(endpointRequestCount(fetchMock, cache.path)).toBe(2);
  });

  it.each(["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"])(
    "%s invalidates all three caches",
    async (event) => {
      await api.getStaffComplaintHistory(1);
      await api.getStaffReports();
      await api.getFeedbackMonitoring({ page: 1 });

      authState.authListener(event, null);

      await api.getStaffComplaintHistory(1);
      await api.getStaffReports();
      await api.getFeedbackMonitoring({ page: 1 });

      expect(endpointRequestCount(fetchMock, historyPath)).toBe(2);
      expect(endpointRequestCount(fetchMock, reportsPath)).toBe(2);
      expect(endpointRequestCount(fetchMock, feedbackPath)).toBe(2);
    }
  );

  it.each(["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"])(
    "%s prevents pending responses from repopulating invalidated caches",
    async (event) => {
      const pendingResponses = new Map([
        [historyPath, deferred()],
        [reportsPath, deferred()],
        [feedbackPath, deferred()],
      ]);
      fetchResponder = async (url) => {
        const path = new URL(url, "http://localhost").pathname;
        const response = [...pendingResponses].find(([endpoint]) => path.endsWith(endpoint))?.[1];
        return response.promise;
      };

      const pendingReads = [
        api.getStaffComplaintHistory(1),
        api.getStaffReports(),
        api.getFeedbackMonitoring({ page: 1 }),
      ];
      await flushPromises();
      authState.authListener(event, null);
      pendingResponses.forEach((response) => response.resolve({ stale: true }));
      await Promise.all(pendingReads);

      fetchResponder = async (url) => ({ fresh: url });
      await api.getStaffComplaintHistory(1);
      await api.getStaffReports();
      await api.getFeedbackMonitoring({ page: 1 });

      expect(endpointRequestCount(fetchMock, historyPath)).toBe(2);
      expect(endpointRequestCount(fetchMock, reportsPath)).toBe(2);
      expect(endpointRequestCount(fetchMock, feedbackPath)).toBe(2);
    }
  );

  it.each(mutationCases)("successful $name invalidates only the approved caches", async (mutation) => {
    await api.getStaffComplaintHistory(1);
    await api.getStaffReports();
    await api.getFeedbackMonitoring({ page: 1 });

    await mutation.run(api);

    await api.getStaffComplaintHistory(1);
    await api.getStaffReports();
    await api.getFeedbackMonitoring({ page: 1 });

    expect(endpointRequestCount(fetchMock, historyPath))
      .toBe(mutation.invalidates.includes(historyPath) ? 2 : 1);
    expect(endpointRequestCount(fetchMock, reportsPath))
      .toBe(mutation.invalidates.includes(reportsPath) ? 2 : 1);
    expect(endpointRequestCount(fetchMock, feedbackPath))
      .toBe(mutation.invalidates.includes(feedbackPath) ? 2 : 1);
  });

  it.each(mutationCases)("failed $name does not invalidate cached responses", async (mutation) => {
    await api.getStaffComplaintHistory(1);
    await api.getStaffReports();
    await api.getFeedbackMonitoring({ page: 1 });

    fetchResponder = async (_url, options) => options.method
      ? jsonResponse({ message: "Mutation failed" }, 500)
      : ({ unchanged: true });
    await expect(mutation.run(api)).rejects.toThrow();

    await api.getStaffComplaintHistory(1);
    await api.getStaffReports();
    await api.getFeedbackMonitoring({ page: 1 });

    expect(endpointRequestCount(fetchMock, historyPath)).toBe(1);
    expect(endpointRequestCount(fetchMock, reportsPath)).toBe(1);
    expect(endpointRequestCount(fetchMock, feedbackPath)).toBe(1);
  });

  it("does not let mutation-invalidated pending responses repopulate the caches", async () => {
    const pendingResponses = new Map([
      [historyPath, deferred()],
      [reportsPath, deferred()],
      [feedbackPath, deferred()],
    ]);
    fetchResponder = async (url, options) => {
      if (options.method) return { mutation: true };
      const path = new URL(url, "http://localhost").pathname;
      const response = [...pendingResponses].find(([endpoint]) => path.endsWith(endpoint))?.[1];
      return response.promise;
    };

    const pendingReads = [
      api.getStaffComplaintHistory(1),
      api.getStaffReports(),
      api.getFeedbackMonitoring({ page: 1 }),
    ];
    await flushPromises();
    expect(endpointRequestCount(fetchMock, historyPath)).toBe(1);
    expect(endpointRequestCount(fetchMock, reportsPath)).toBe(1);
    expect(endpointRequestCount(fetchMock, feedbackPath)).toBe(1);

    await api.reviewComplaint("complaint-1", "accepted");
    pendingResponses.forEach((response) => response.resolve({ stale: true }));
    await Promise.all(pendingReads);

    fetchResponder = async (url) => ({ fresh: url });
    await api.getStaffComplaintHistory(1);
    await api.getStaffReports();
    await api.getFeedbackMonitoring({ page: 1 });

    expect(endpointRequestCount(fetchMock, historyPath)).toBe(2);
    expect(endpointRequestCount(fetchMock, reportsPath)).toBe(2);
    expect(endpointRequestCount(fetchMock, feedbackPath)).toBe(2);
  });
});

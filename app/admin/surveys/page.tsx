import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  updateSurveySettingsAction,
  resendSurveyRequestAction,
  reviewSurveyResponseAction,
} from "@/lib/survey-actions";
import { CsvExportButton } from "./CsvExportButton";
import { formatDistanceToNow } from "date-fns";
import {
  Star,
  Send,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Mail,
  Clock,
  CheckCircle2,
  Settings,
  List,
  RefreshCw,
  Search,
} from "lucide-react";

export const metadata = { title: "Satisfaction Surveys | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function SurveysAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; view?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab ?? "responses";
  const statusParam = sp.status;

  // Retrieve survey settings
  let settings = await prisma.surveySetting.findFirst();
  if (!settings) {
    settings = await prisma.surveySetting.create({
      data: {
        id: "default-settings",
        autoSendEnabled: true,
        triggerOnResolved: true,
        triggerOnClosed: true,
        triggerOnJobCompleted: true,
        sendDelayMinutes: 0,
        emailSubject: "How did we do? Your feedback matters",
        emailBody: "Hello {{client_name}},\n\nYour recent support request/job has been marked as completed.\n\nWe would appreciate your feedback so we can continue improving the service we provide.\n\nTicket/Job Reference: {{reference_number}}\nService: {{service_name}}\n\nPlease take a moment to complete this short survey:\n{{survey_link}}\n\nThank you,\nCYVRIX Technologies",
        ratingType: "stars_5",
        lowRatingThreshold: 3,
        adminNotificationEmail: "admin@cyvrix.co.uk",
        surveyExpiryDays: 7,
      },
    });
  }

  // Retrieve all survey requests
  const requests = await prisma.surveyRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Retrieve all survey responses with requests
  const responses = await prisma.surveyResponse.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      SurveyRequest: true,
    },
  });

  // Calculations for Metrics Cards
  const totalRequests = requests.length;
  const totalSent = requests.filter((r) => r.status === "sent" || r.status === "submitted").length;
  const totalResponses = responses.length;
  const responseRate = totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0;

  // Average Star Rating
  const ratedResponses = responses.filter((r) => r.rating !== null);
  const avgRating =
    ratedResponses.length > 0
      ? (ratedResponses.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratedResponses.length).toFixed(1)
      : "0.0";

  // NPS Score
  const npsResponses = responses.filter((r) => r.npsScore !== null);
  const promoters = npsResponses.filter((r) => (r.npsScore || 0) >= 9).length;
  const detractors = npsResponses.filter((r) => (r.npsScore || 0) <= 6).length;
  const npsTotal = npsResponses.length;
  const npsScore = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : null;

  // Alerts: Rating is low OR sub-ratings are low OR NPS is low (compared to configured low threshold)
  const lowThreshold = settings.lowRatingThreshold;
  const lowRatingResponses = responses.filter((r) => {
    const isLowRating =
      (r.rating !== null && r.rating <= lowThreshold) ||
      (r.npsScore !== null && r.npsScore <= (lowThreshold * 2)) ||
      (r.responseTimeRating !== null && r.responseTimeRating <= lowThreshold) ||
      (r.resolutionRating !== null && r.resolutionRating <= lowThreshold);
    return isLowRating;
  });
  const unreviewedLowRatings = lowRatingResponses.filter((r) => !r.reviewedAt);

  const activeResponse = sp.view ? responses.find((r) => r.id === sp.view) || null : null;

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635]">Survey &amp; Feedback Center</h1>
          <p className="text-slate-500 text-sm mt-1">
            Automate customer satisfaction surveys, monitor NPS, track technical performance, and review customer sentiment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CsvExportButton data={responses} />
        </div>
      </div>

      {/* Notifications Banners */}
      {statusParam === "settings_success" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs font-bold text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Feedback survey configurations have been successfully updated.
        </div>
      )}
      {unreviewedLowRatings.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs font-bold text-rose-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 animate-pulse" />
            <span>
              Action Required: There are {unreviewedLowRatings.length} low satisfaction score response alerts that have not been reviewed.
            </span>
          </div>
          <a
            href={`/admin/surveys?tab=responses`}
            className="text-xs font-black bg-rose-600 text-white px-3 py-1.5 rounded-xl hover:bg-rose-700 transition-colors"
          >
            Review Alerts
          </a>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Invitations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sent Invitations</p>
          <div className="flex items-baseline gap-2">
            <p className="font-outfit text-2xl font-black text-[#041635]">{totalSent}</p>
            <p className="text-[10px] font-bold text-slate-400">/ {totalRequests} total</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Send className="h-3.5 w-3.5 text-blue-500" />
            Surveys dispatched
          </div>
        </div>

        {/* Metric 2: Response Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Response Rate</p>
          <div className="flex items-baseline gap-2">
            <p className="font-outfit text-2xl font-black text-[#041635]">{responseRate}%</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
            {totalResponses} total replies
          </div>
        </div>

        {/* Metric 3: Average Rating */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average Rating</p>
          <div className="flex items-baseline gap-2">
            <p className="font-outfit text-2xl font-black text-[#041635]">{avgRating}</p>
            <p className="text-[10px] font-bold text-slate-400">/ 5.0</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-bold">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Client Satisfaction
          </div>
        </div>

        {/* Metric 4: NPS Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Net Promoter (NPS)</p>
          <div className="flex items-baseline gap-2">
            <p className="font-outfit text-2xl font-black text-[#041635]">
              {npsScore !== null ? (npsScore > 0 ? `+${npsScore}` : npsScore) : "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            {promoters} Promoters / {detractors} Detractors
          </div>
        </div>

        {/* Metric 5: Alerts */}
        <div className={`p-5 rounded-2xl border shadow-sm space-y-3 transition-colors ${
          unreviewedLowRatings.length > 0
            ? "bg-rose-50/50 border-rose-100"
            : "bg-white border-slate-200"
        }`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Satisfaction Alerts</p>
          <div className="flex items-baseline gap-2">
            <p className={`font-outfit text-2xl font-black ${
              unreviewedLowRatings.length > 0 ? "text-rose-600" : "text-[#041635]"
            }`}>
              {lowRatingResponses.length}
            </p>
            <p className="text-[10px] font-bold text-slate-400">({unreviewedLowRatings.length} pending)</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <AlertTriangle className={`h-3.5 w-3.5 ${
              unreviewedLowRatings.length > 0 ? "text-rose-500 animate-bounce" : "text-slate-400"
            }`} />
            Score &lt;= {lowThreshold} stars
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        {[
          { label: "Survey Responses", value: "responses", icon: MessageSquare },
          { label: "Dispatched Invitations", value: "requests", icon: Send },
          { label: "Survey Settings", value: "settings", icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.value;
          return (
            <a
              key={t.value}
              href={`/admin/surveys?tab=${t.value}`}
              className={`pb-4 px-1 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${
                active
                  ? "border-[#2691F0] text-[#2691F0]"
                  : "border-transparent text-slate-400 hover:text-[#041635]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </a>
          );
        })}
      </div>

      {/* Dynamic Content Views */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* RESPONSES VIEW */}
        {tab === "responses" && (
          <>
            {/* List panel */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-[#041635]">Survey Submissions</span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  {responses.length} Submissions
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {responses.map((resp) => {
                  const req = resp.SurveyRequest;
                  const isLow =
                    (resp.rating !== null && resp.rating <= lowThreshold) ||
                    (resp.npsScore !== null && resp.npsScore <= (lowThreshold * 2)) ||
                    (resp.responseTimeRating !== null && resp.responseTimeRating <= lowThreshold) ||
                    (resp.resolutionRating !== null && resp.resolutionRating <= lowThreshold);

                  return (
                    <div
                      key={resp.id}
                      className={`p-5 space-y-4 hover:bg-slate-50/70 transition-colors ${
                        activeResponse?.id === resp.id ? "bg-blue-50/40" : ""
                      } ${isLow && !resp.reviewedAt ? "bg-rose-50/20" : ""}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-[#041635]">
                              {req?.contactName || "Anonymous"}
                            </p>
                            <span className="text-[10px] text-slate-400 font-semibold">&bull;</span>
                            <span className="text-xs text-slate-400">{req?.contactEmail}</span>
                            {isLow && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Low Score Alert
                              </span>
                            )}
                            {resp.reviewedAt && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                Reviewed
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Ref: <span className="font-bold text-slate-500 uppercase">{req?.relatedId.slice(0, 8)}</span>
                            {req?.relatedType && ` (${req.relatedType.replace(/_/g, " ")})`} &bull;{" "}
                            {formatDistanceToNow(new Date(resp.submittedAt), { addSuffix: true })}
                          </p>
                        </div>

                        {/* Overall Stars/NPS tag */}
                        <div className="flex flex-col items-end gap-1">
                          {resp.rating !== null && (
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3.5 w-3.5 ${
                                    s <= (resp.rating || 0)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-slate-200"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          {resp.npsScore !== null && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border ${
                              resp.npsScore >= 9
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : resp.npsScore >= 7
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}>
                              NPS: {resp.npsScore} / 10
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Comments */}
                      {resp.comments && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 italic">
                          "{resp.comments}"
                        </div>
                      )}

                      {/* Rating details grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100 text-center">
                          <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Response</p>
                          <p className="text-xs font-black text-[#041635] mt-0.5">{resp.responseTimeRating ?? "N/A"} / 5</p>
                        </div>
                        <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100 text-center">
                          <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Resolution</p>
                          <p className="text-xs font-black text-[#041635] mt-0.5">{resp.resolutionRating ?? "N/A"} / 5</p>
                        </div>
                        <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100 text-center">
                          <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Communication</p>
                          <p className="text-xs font-black text-[#041635] mt-0.5">{resp.professionalismRating ?? "N/A"} / 5</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-[10px] font-bold ${
                          resp.allowFollowUp ? "text-emerald-600" : "text-slate-400"
                        }`}>
                          {resp.allowFollowUp ? "✓ Follow-up contact allowed" : "✗ Do not contact"}
                        </span>
                        <a
                          href={`/admin/surveys?tab=responses&view=${resp.id}`}
                          className="text-[10px] font-black text-[#2691F0] hover:underline"
                        >
                          Review details &rarr;
                        </a>
                      </div>
                    </div>
                  );
                })}
                {responses.length === 0 && (
                  <div className="p-12 text-center text-sm text-slate-400">
                    No satisfaction survey responses recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Side Detail Review panel */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6 space-y-6">
                {activeResponse ? (
                  <>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#2691F0] mb-1">
                        RESPONSE WORKFLOW
                      </p>
                      <h2 className="font-outfit text-lg font-black text-[#041635] leading-snug">
                        Review Feedback Detail
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Client: {activeResponse.SurveyRequest?.contactName || "Anonymous"}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-xs text-slate-700">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200/60 pb-1">
                        Original Survey Details
                      </p>
                      <p>
                        <span className="font-bold">Contact Email:</span> {activeResponse.SurveyRequest?.contactEmail}
                      </p>
                      <p>
                        <span className="font-bold">Reference Type:</span>{" "}
                        <span className="capitalize">{activeResponse.SurveyRequest?.relatedType.replace(/_/g, " ")}</span>
                      </p>
                      <p>
                        <span className="font-bold">Reference ID:</span> {activeResponse.SurveyRequest?.relatedId}
                      </p>
                      <p>
                        <span className="font-bold">Date Received:</span>{" "}
                        {new Date(activeResponse.submittedAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Reviewing state */}
                    {activeResponse.reviewedAt ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          ✓ MARKED AS REVIEWED
                        </p>
                        <p>
                          <span className="font-bold text-slate-800">Reviewer:</span> {activeResponse.reviewedBy}
                        </p>
                        <p>
                          <span className="font-bold text-slate-800">Date:</span>{" "}
                          {new Date(activeResponse.reviewedAt).toLocaleString()}
                        </p>
                        {activeResponse.internalNotes && (
                          <div className="border-t border-emerald-200/50 pt-2 mt-2">
                            <p className="font-bold text-slate-800">Internal Audit Notes:</p>
                            <p className="italic text-slate-600 mt-1">"{activeResponse.internalNotes}"</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <form action={reviewSurveyResponseAction} className="space-y-4">
                        <input type="hidden" name="responseId" value={activeResponse.id} />
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-600">Internal Notes &amp; Follow-up Logs</label>
                          <textarea
                            name="internalNotes"
                            rows={4}
                            placeholder="Document internal reviews, training actions taken, or follow-up call notes..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-[#041635] hover:bg-[#2691F0] text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
                        >
                          Mark Reviewed &amp; Save Notes
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-300">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-400">
                      Click "Review details" on a survey submission to view metadata and add internal notes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* REQUESTS QUEUE VIEW */}
        {tab === "requests" && (
          <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-[#041635]">Invitations Queue</span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                {requests.length} Requests
              </span>
            </div>

            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Client Name",
                    "Client Email",
                    "Related Entity",
                    "Status",
                    "Sent Date",
                    "Expiry Date",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map((req) => {
                  const isExpired = req.expiresAt && new Date() > req.expiresAt;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 text-xs font-bold text-slate-700">{req.contactName || "Client"}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">{req.contactEmail}</td>
                      <td className="px-5 py-4 text-xs">
                        <span className="capitalize text-slate-600 font-bold">
                          {req.relatedType.replace(/_/g, " ")}
                        </span>
                        <p className="text-[10px] text-slate-400 uppercase mt-0.5">{req.relatedId.slice(0, 8)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                            req.status === "submitted"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : req.status === "sent"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : req.status === "pending"
                              ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                        {req.sentAt ? new Date(req.sentAt).toLocaleString() : "Pending"}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <span className={`whitespace-nowrap ${isExpired && req.status !== "submitted" ? "text-rose-500 font-semibold" : "text-slate-400"}`}>
                          {req.expiresAt ? new Date(req.expiresAt).toLocaleDateString() : "N/A"}{" "}
                          {isExpired && req.status !== "submitted" && "(Expired)"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {req.status !== "submitted" && (
                          <form action={resendSurveyRequestAction}>
                            <input type="hidden" name="id" value={req.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#2691F0] hover:underline"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Resend
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                      No dispatched survey invitations in the queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SETTINGS VIEW */}
        {tab === "settings" && (
          <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
            <h2 className="font-outfit text-xl font-black text-[#041635] mb-6">Survey Engine Settings</h2>

            <form action={updateSurveySettingsAction} className="space-y-8 max-w-4xl">
              {/* Core trigger settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#2691F0] border-b pb-1.5">
                    Engine Triggers
                  </h3>

                  <div className="flex items-center justify-between gap-4 py-1.5">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-700 block">Automatic Surveys Dispatch</label>
                      <span className="text-[10px] text-slate-400">Toggle automated feedback pipeline on ticket/job resolution</span>
                    </div>
                    <select
                      name="autoSendEnabled"
                      defaultValue={settings.autoSendEnabled ? "true" : "false"}
                      className="text-xs font-bold rounded-lg border border-slate-200 px-3 py-1.5 text-[#041635] bg-white cursor-pointer"
                    >
                      <option value="true">Active (On)</option>
                      <option value="false">Inactive (Off)</option>
                    </select>
                  </div>

                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Trigger Events</p>

                    <label className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="triggerOnResolved"
                        value="true"
                        defaultChecked={settings.triggerOnResolved}
                        className="rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0]"
                      />
                      Send survey when Support Ticket status is RESOLVED
                    </label>

                    <label className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="triggerOnClosed"
                        value="true"
                        defaultChecked={settings.triggerOnClosed}
                        className="rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0]"
                      />
                      Send survey when Support Ticket status is CLOSED
                    </label>

                    <label className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="triggerOnJobCompleted"
                        value="true"
                        defaultChecked={settings.triggerOnJobCompleted}
                        className="rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0]"
                      />
                      Send survey when Work Order status is COMPLETED
                    </label>
                  </div>
                </div>

                <div className="space-y-5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#2691F0] border-b pb-1.5">
                    Engine Calibration
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-xs font-bold text-slate-600">
                      Link Expiry Days
                      <input
                        type="number"
                        name="surveyExpiryDays"
                        min="1"
                        max="30"
                        defaultValue={settings.surveyExpiryDays}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-600">
                      Dispatch Delay (Minutes)
                      <input
                        type="number"
                        name="sendDelayMinutes"
                        min="0"
                        max="1440"
                        defaultValue={settings.sendDelayMinutes}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-600">
                      Rating Scale Mode
                      <select
                        name="ratingType"
                        defaultValue={settings.ratingType}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white"
                      >
                        <option value="stars_5">5-Star Core Rating</option>
                        <option value="nps_10">10-Point NPS Recommendation Scale</option>
                      </select>
                    </label>

                    <label className="block text-xs font-bold text-slate-600">
                      Low Satisfaction Threshold
                      <select
                        name="lowRatingThreshold"
                        defaultValue={settings.lowRatingThreshold}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white"
                      >
                        <option value="1">1 Star / Very Poor</option>
                        <option value="2">2 Stars / Poor</option>
                        <option value="3">3 Stars / Medium Threshold</option>
                        <option value="4">4 Stars / Standard Quality Check</option>
                      </select>
                    </label>
                  </div>

                  <label className="block text-xs font-bold text-slate-600">
                    Low Satisfaction Alert Admin Recipient
                    <input
                      type="email"
                      name="adminNotificationEmail"
                      defaultValue={settings.adminNotificationEmail || ""}
                      placeholder="alerts@cyvrix.co.uk"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              {/* Email templates content */}
              <div className="space-y-5 border-t pt-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#2691F0]">
                  Survey Email Dispatch Template
                </h3>

                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-600">
                    Email Subject Title
                    <input
                      type="text"
                      name="emailSubject"
                      defaultValue={settings.emailSubject || ""}
                      placeholder="How did we do? Your feedback matters"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-600">
                    Email Body Content (Support Raw Text Formatting)
                    <textarea
                      name="emailBody"
                      rows={8}
                      defaultValue={settings.emailBody || ""}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none font-mono resize-y"
                    />
                  </label>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-[10px] text-slate-500 space-y-1.5">
                    <p className="font-bold text-slate-600 uppercase">Available Template Dynamic Variables:</p>
                    <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
                      <li>
                        <span className="font-bold text-[#2691F0]">{"{{client_name}}"}</span> - Recipient Contact Name
                      </li>
                      <li>
                        <span className="font-bold text-[#2691F0]">{"{{reference_number}}"}</span> - Ticket / Job ID
                      </li>
                      <li>
                        <span className="font-bold text-[#2691F0]">{"{{service_name}}"}</span> - Ticket Category / Service Type
                      </li>
                      <li>
                        <span className="font-bold text-[#2691F0]">{"{{survey_link}}"}</span> - Secure Secure Access URL
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="border-t pt-6 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#041635] hover:bg-[#2691F0] text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-colors shadow-md hover:shadow-lg"
                >
                  Save Survey Calibration
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

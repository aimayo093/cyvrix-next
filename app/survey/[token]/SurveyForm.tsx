"use client";

import * as React from "react";
import { Star, MessageSquare, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { submitSurveyResponse } from "@/lib/survey-actions";

interface SurveyFormProps {
  token: string;
  ratingType: string;
}

export function SurveyForm({ token, ratingType }: SurveyFormProps) {
  const [rating, setRating] = React.useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = React.useState<number | null>(null);

  const [npsScore, setNpsScore] = React.useState<number | null>(null);
  const [hoveredNps, setHoveredNps] = React.useState<number | null>(null);

  const [responseTime, setResponseTime] = React.useState<number | null>(null);
  const [hoveredResponseTime, setHoveredResponseTime] = React.useState<number | null>(null);

  const [resolution, setResolution] = React.useState<number | null>(null);
  const [hoveredResolution, setHoveredResolution] = React.useState<number | null>(null);

  const [professionalism, setProfessionalism] = React.useState<number | null>(null);
  const [hoveredProfessionalism, setHoveredProfessionalism] = React.useState<number | null>(null);

  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const renderStars = (
    currentValue: number | null,
    hoveredValue: number | null,
    onChange: (val: number) => void,
    onHover: (val: number | null) => void,
    name: string
  ) => {
    return (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = (hoveredValue !== null ? star <= hoveredValue : currentValue !== null && star <= currentValue);
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => onHover(star)}
              onMouseLeave={() => onHover(null)}
              className="p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all hover:scale-110 active:scale-95"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  isFilled
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-700 hover:text-slate-500"
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  };

  const getNpsColor = (score: number, active: boolean) => {
    if (!active) return "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200";
    if (score <= 6) return "bg-rose-500/20 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10";
    if (score <= 8) return "bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10";
    return "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("token", token);
    if (rating !== null) formData.append("rating", rating.toString());
    if (npsScore !== null) formData.append("npsScore", npsScore.toString());
    if (responseTime !== null) formData.append("responseTimeRating", responseTime.toString());
    if (resolution !== null) formData.append("resolutionRating", resolution.toString());
    if (professionalism !== null) formData.append("professionalismRating", professionalism.toString());

    try {
      await submitSurveyResponse(formData);
    } catch (err: any) {
      if (err.digest?.startsWith("NEXT_REDIRECT")) {
        // Let Next.js handle the server action redirect
        throw err;
      }
      setIsPending(false);
      setError(err?.message || "Failed to submit survey. Please try again.");
    }
  };

  const isFormValid = rating !== null || npsScore !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      {/* Main overall rating choice */}
      {ratingType === "nps_10" ? (
        <div className="space-y-4">
          <label className="block text-sm font-black text-white tracking-wide">
            How likely are you to recommend CYVRIX to a colleague or business partner?
          </label>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
              const active = npsScore === score || hoveredNps === score;
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => setNpsScore(score)}
                  onMouseEnter={() => setHoveredNps(score)}
                  onMouseLeave={() => setHoveredNps(null)}
                  className={`py-3 rounded-xl font-black text-sm border transition-all hover:scale-105 active:scale-95 ${getNpsColor(score, active)}`}
                >
                  {score}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
            <span>Not Likely</span>
            <span>Extremely Likely (NPS)</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-black text-white tracking-wide">
            Overall Satisfaction with our Services
          </label>
          {renderStars(rating, hoveredRating, setRating, setHoveredRating, "rating")}
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
            {rating === null && "Select your overall star rating"}
          </div>
        </div>
      )}

      {/* Detail attributes section */}
      <div className="border-t border-slate-800/80 pt-6 space-y-6">
        <h3 className="text-xs font-black tracking-widest text-[#2691F0] uppercase">
          Key Performance Areas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-300">
              Response Time &amp; Dispatch Speed
            </label>
            {renderStars(responseTime, hoveredResponseTime, setResponseTime, setHoveredResponseTime, "responseTime")}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-300">
              Quality of Technical Issue Resolution
            </label>
            {renderStars(resolution, hoveredResolution, setResolution, setHoveredResolution, "resolution")}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-300">
              Staff Professionalism &amp; Communication
            </label>
            {renderStars(professionalism, hoveredProfessionalism, setProfessionalism, setHoveredProfessionalism, "professionalism")}
          </div>

          {ratingType === "nps_10" && (
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-300">
                Overall Service Quality Star Rating
              </label>
              {renderStars(rating, hoveredRating, setRating, setHoveredRating, "rating")}
            </div>
          )}
        </div>
      </div>

      {/* Written comments */}
      <div className="border-t border-slate-800/80 pt-6 space-y-3">
        <label className="flex items-center gap-2 text-xs font-black text-slate-300 uppercase tracking-wider">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          Additional Comments or Suggestions
        </label>
        <textarea
          name="comments"
          rows={4}
          placeholder="Please share what went well or how we can improve our IT support delivery..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 focus:outline-none resize-none transition-colors"
        />
      </div>

      {/* Switch check for follow up */}
      <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-black text-white">Can we contact you regarding this feedback?</p>
          <p className="text-[10px] text-slate-400">We appreciate clarifying details to elevate our support standard.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" name="allowFollowUp" value="true" className="sr-only peer" />
          <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2691F0] peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
        </label>
      </div>

      {/* Action button */}
      <button
        type="submit"
        disabled={isPending || !isFormValid}
        className={`w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 border ${
          isPending || !isFormValid
            ? "bg-slate-800 border-slate-800/80 text-slate-500 cursor-not-allowed"
            : "bg-white hover:bg-slate-100 text-slate-950 border-white hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-white/5"
        }`}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            Submitting secure feedback...
          </>
        ) : (
          <>
            Submit Feedback
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/80" />
        Data is transmitted securely under active corporate compliance guidelines.
      </div>
    </form>
  );
}

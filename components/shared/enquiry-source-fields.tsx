"use client";

import { useEffect, useRef } from "react";
import { attributionPayload } from "@/lib/attribution";
import { HEARD_ABOUT } from "@/lib/heard-about";

/**
 * "How did you hear about us?" plus the hidden attribution field, for the
 * enquiry and quote forms. Both are optional; if JavaScript fails the hidden
 * field stays empty and the enquiry still submits. Field names are read by
 * app/api/submit-contact and submitQuote (lib/attribution-server.ts).
 *
 * The free-text box is always shown rather than revealed on selection, so the
 * fields work in a plain HTML form post; the server keeps its text only when
 * the answer is "Somewhere else".
 */
export function EnquirySourceFields({
  labelClassName,
  inputClassName,
  optionClassName = "bg-[#020817] text-white",
}: {
  labelClassName: string;
  inputClassName: string;
  optionClassName?: string;
}) {
  // Written straight to the input after mount: it is never rendered, so it
  // needs no state, and the server-rendered HTML stays identical.
  const attributionRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (attributionRef.current) attributionRef.current.value = attributionPayload();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <label className={labelClassName}>
        How did you hear about us? <span className="font-normal text-slate-500">(optional)</span>
        <select name="heard_about" defaultValue="" className={inputClassName}>
          <option value="" className={optionClassName}>Prefer not to say</option>
          {HEARD_ABOUT.map((option) => (
            <option key={option.value} value={option.value} className={optionClassName}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClassName}>
        If somewhere else, where? <span className="font-normal text-slate-500">(optional)</span>
        <input name="heard_about_other" type="text" maxLength={200} autoComplete="off" className={inputClassName} />
      </label>
      <input ref={attributionRef} type="hidden" name="attribution" defaultValue="" />
    </div>
  );
}

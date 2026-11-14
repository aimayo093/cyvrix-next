/**
 * Enquiry-source capture (DECISIONS §16). Run: npm run test:enquiry-source
 */
import { ATTRIBUTION_MAX_LENGTH, isExcludedPath, nextMemory, payloadFor, touchFrom } from "../lib/attribution";
import { enquirySourceColumns, enquirySourceRows, sanitiseAttribution } from "../lib/attribution-server";
import { HEARD_ABOUT, heardAboutLabel, normaliseHeardAbout, normaliseHeardAboutOther } from "../lib/heard-about";
import { getDefaultLegalDocument } from "../lib/legal-content";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`}`);
}

const site = "https://cyvrix.co.uk";

// ── Classifying one page view ──────────────────────────────────────────────
{
  const utm = touchFrom(`${site}/services?utm_source=LinkedIn&utm_medium=Paid Social&utm_campaign=Neath_Spring`, "https://www.linkedin.com/");
  check("utm wins over the referrer", [utm.source, utm.medium, utm.campaign, utm.confidence], ["linkedin", "paid-social", "neath-spring", "utm"]);
  check("utm keeps the referrer domain as detail", utm.referrerDomain, "linkedin.com");
  check("utm without medium defaults to referral", touchFrom(`${site}/?utm_source=flyer`, "").medium, "referral");

  const google = touchFrom(`${site}/`, "https://www.google.co.uk/");
  check("google.co.uk is organic search", [google.source, google.medium, google.confidence], ["google", "organic", "referrer"]);
  check("google.com.au is search", touchFrom(`${site}/`, "https://www.google.com.au/").source, "google");
  check("Gmail is not search", touchFrom(`${site}/`, "https://mail.google.com/mail/u/0/").medium, "referral");
  check("a host that merely contains google. is not search", touchFrom(`${site}/`, "https://notgoogle.example/").medium, "referral");
  check("google.attacker.example is not search", touchFrom(`${site}/`, "https://google.attacker.example/").medium, "referral");

  // What the tab remembers.
  const campaign = touchFrom(`${site}/?utm_source=flyer&utm_medium=print`, "");
  const later = touchFrom(`${site}/services?utm_source=linkedin&utm_medium=social`, "");
  const plain = touchFrom(`${site}/contact`, `${site}/services`);
  const one = nextMemory(null, campaign);
  check("the first touch starts the memory", [one?.first.source, one?.last.source], ["flyer", "flyer"]);
  check("a plain page view changes nothing", nextMemory(one, plain), one);
  const two = nextMemory(one, later);
  check("a later campaign replaces the last touch only", [two?.first.source, two?.last.source], ["flyer", "linkedin"]);
  check("a referrer view after the first changes nothing", nextMemory(two, touchFrom(`${site}/`, "https://www.bing.com/")), two);

  // The hidden field never silently drops everything.
  const long = touchFrom(`${site}/${"p".repeat(300)}?utm_source=${"s".repeat(200)}&utm_medium=${"m".repeat(200)}&utm_campaign=${"c".repeat(300)}&utm_term=${"t".repeat(200)}&utm_content=${"x".repeat(300)}`, "https://" + "r".repeat(150) + ".example/");
  const bigPayload = payloadFor({ first: long, last: long }, "/" + "f".repeat(300));
  check("an oversized payload is trimmed, not dropped", bigPayload.length > 0 && bigPayload.length <= ATTRIBUTION_MAX_LENGTH, true);
  check("trimming keeps the last touch's campaign", JSON.parse(bigPayload).lastTouch.campaign?.length, 120);
  check("no memory gives an empty field", payloadFor(null, "/contact"), "");
  check("bing is organic search", touchFrom(`${site}/`, "https://www.bing.com/search?q=x").source, "bing");
  check("t.co is X, social", [touchFrom(`${site}/`, "https://t.co/abc").source, touchFrom(`${site}/`, "https://t.co/abc").medium], ["x", "social"]);
  check("other site is a referral by domain", [touchFrom(`${site}/`, "https://www.npt.gov.uk/business").source, touchFrom(`${site}/`, "https://www.npt.gov.uk/business").medium], ["npt.gov.uk", "referral"]);

  check("no referrer is direct", touchFrom(`${site}/contact`, "").confidence, "direct");
  check("same site is not a source", touchFrom(`${site}/contact`, `${site}/services`).confidence, "direct");
  check("www and bare host are the same site", touchFrom(`${site}/contact`, "https://www.cyvrix.co.uk/").confidence, "direct");
  check("garbage referrer is ignored", touchFrom(`${site}/`, "not a url").confidence, "direct");
  check("landing page recorded, query dropped", touchFrom(`${site}/Services/Cloud?utm_source=x`, "").landingPage, "/services/cloud");

  const hostile = touchFrom(`${site}/?utm_source=${encodeURIComponent('<script>alert("x")</script>')}&utm_campaign=${"a".repeat(500)}`, "");
  check("markup characters stripped from utm values", /[<>"]/.test(hostile.source), false);
  check("campaign capped at 120", hostile.campaign?.length, 120);

  check("portal excluded", isExcludedPath("/portal/tickets"), true);
  check("admin excluded", isExcludedPath("/admin"), true);
  check("public page not excluded", isExcludedPath("/contact"), false);
  check("prefix lookalike not excluded", isExcludedPath("/administration-services"), false);
}

// ── The server never trusts the browser's hint ─────────────────────────────
{
  const touch = { source: "linkedin", medium: "social", landingPage: "/", referrerDomain: "linkedin.com", confidence: "referrer" };
  const good = JSON.stringify({ v: 1, firstTouch: touch, lastTouch: { ...touch, source: "flyer", medium: "print", campaign: "neath", confidence: "utm" }, formPage: "/contact" });
  const cols = sanitiseAttribution(good);
  check("last touch fills the columns", [cols.leadSource, cols.leadMedium, cols.leadCampaign, cols.sourceConfidence], ["flyer", "print", "neath", "utm"]);
  check("first touch kept in detail", (cols.sourceDetail as { firstTouch: { source: string } }).firstTouch.source, "linkedin");
  check("form page kept in detail", (cols.sourceDetail as { formPage: string }).formPage, "/contact");

  const none = { leadSource: null, leadMedium: null, leadCampaign: null, sourceConfidence: null };
  const strip = (c: ReturnType<typeof sanitiseAttribution>) => ({ leadSource: c.leadSource, leadMedium: c.leadMedium, leadCampaign: c.leadCampaign, sourceConfidence: c.sourceConfidence });
  check("empty string → nothing", strip(sanitiseAttribution("")), none);
  check("not JSON → nothing, no throw", strip(sanitiseAttribution("{oops")), none);
  check("wrong version → nothing", strip(sanitiseAttribution(JSON.stringify({ v: 2, lastTouch: touch }))), none);
  check("array → nothing", strip(sanitiseAttribution("[1,2]")), none);
  check("non-string → nothing", strip(sanitiseAttribution({ v: 1, lastTouch: touch })), none);
  check("over the size cap → nothing", strip(sanitiseAttribution(" ".repeat(ATTRIBUTION_MAX_LENGTH + 1))), none);
  check("invented confidence → nothing", strip(sanitiseAttribution(JSON.stringify({ v: 1, lastTouch: { ...touch, confidence: "certain" } }))), none);

  const extra = sanitiseAttribution(JSON.stringify({ v: 1, lastTouch: { ...touch, email: "someone@example.com", source: "<b>x</b>" }, formPage: "/contact" }));
  const detail = JSON.stringify(extra.sourceDetail);
  check("unknown keys dropped (no email smuggled in)", "email" in (JSON.parse(detail).lastTouch ?? {}), false);
  check("the smuggled address is nowhere in the stored detail", detail.indexOf("someone@") === -1, true);
  check("markup stripped server-side", extra.leadSource, "bx/b");
  check("last touch falls back to first", sanitiseAttribution(JSON.stringify({ v: 1, firstTouch: touch })).leadSource, "linkedin");
}

// ── "How did you hear about us?" ──────────────────────────────────────────
{
  check("every answer has a label", HEARD_ABOUT.every((o) => heardAboutLabel(o.value) === o.label), true);
  check("known answer kept", normaliseHeardAbout(" LinkedIn "), "linkedin");
  check("unknown answer discarded", normaliseHeardAbout("my cousin Dave"), null);
  check("free text kept only with other", normaliseHeardAboutOther("other", "  Swansea  Chamber  "), "Swansea Chamber");
  check("free text dropped without other", normaliseHeardAboutOther("search", "anything"), null);
  check("free text capped and cleaned", normaliseHeardAboutOther("other", `<b>${"x".repeat(300)}`)?.length, 200);
  check("blank free text is null", normaliseHeardAboutOther("other", "   "), null);

  const cols = enquirySourceColumns({ heardAbout: "other", heardAboutOther: "Trade show", attribution: "" });
  check("columns combine answer and empty source", [cols.heardAbout, cols.heardAboutOther, cols.leadSource], ["other", "Trade show", null]);
  check("all fields absent → all null", Object.values(enquirySourceColumns({})).filter((v) => v !== null && v !== undefined).length, 0);
}

// ── CRM display ───────────────────────────────────────────────────────────
{
  const old = enquirySourceRows({});
  check("an old lead reads Not captured, never direct", old.every(([, v]) => v === "Not captured"), true);
  const rows = Object.fromEntries(enquirySourceRows({ heardAbout: "other", heardAboutOther: "Trade show", leadSource: "google", sourceConfidence: "referrer", sourceDetail: { firstTouch: { landingPage: "/services" }, formPage: "/contact" } }));
  check("other shows its text", rows["How they heard"], "Somewhere else: Trade show");
  check("confidence in plain words", rows["Based on"], "Referring website");
  check("landing and form pages shown", [rows["First landed on"], rows["Form page"]], ["/services", "/contact"]);
}

// ── The privacy policy says it ────────────────────────────────────────────
{
  const policy = JSON.stringify(getDefaultLegalDocument("privacy-policy"));
  check("policy discloses how-you-found-us capture", policy.includes("How you found us"), true);
  check("policy gives a lawful basis for it", policy.includes("Understanding which channels bring us enquiries"), true);
}

if (failures) {
  console.error(`\n  ${failures} enquiry-source check(s) failed.`);
  process.exit(1);
}
console.log("\n  All enquiry-source checks passed.");

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const checks = [
  ["/", 200],
  ["/services/managed-it-support", 200],
  ["/case-studies/logistics-network-refresh", 200],
  ["/blog/microsoft-365-security-baseline-uk-smes", 200],
  ["/admin", 307],
  ["/admin/services-cms", 307],
  ["/portal", 307],
  ["/portal/tickets", 307],
];

let failed = false;

for (const [path, expected] of checks) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const ok = response.status === expected;
  console.log(`${ok ? "PASS" : "FAIL"} ${path} -> ${response.status}`);
  if (!ok) failed = true;
}

if (failed) {
  process.exit(1);
}

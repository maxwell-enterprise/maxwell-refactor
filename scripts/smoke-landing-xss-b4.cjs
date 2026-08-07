const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/components/LandingPage.tsx');
const s = fs.readFileSync(file, 'utf8');
const checks = [
  ['no dangerouslySetInnerHTML usage', !/dangerouslySetInnerHTML\s*=/.test(s)],
  ['no dynamicGreeting HTML inject', !s.includes('dynamicGreeting')],
  ['uses personalizedName', s.includes('personalizedName')],
  ['strips angle brackets', s.includes('replace(/[<>]/g')],
  ['name rendered as React child', s.includes('{personalizedName}')],
];
let fail = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`);
  if (!ok) fail += 1;
}
process.exit(fail ? 1 : 0);

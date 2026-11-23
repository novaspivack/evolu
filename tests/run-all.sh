#!/usr/bin/env bash
# Every check runs against the one current engine in ../src. The numbered files are grouped by subject;
# the number is only the order in which the subjects entered the world.
# Usage: tests/run-all.sh            engine, minds and maker checks (about three minutes)
#        tests/run-all.sh browser    the same, then the page in headless Chrome
#                                    (needs playwright: PLAYWRIGHT=/path/to/node_modules/playwright, CHROME=/path/to/chrome)
cd "$(dirname "$0")" || exit 1
bad=0
for f in ../src/*.js; do node --check "$f" || { echo "SYNTAX  $f"; bad=1; }; done
for t in [0-9][0-9]-*.js; do
  out=$(node "$t" 2>&1); n=$(printf '%s\n' "$out" | grep -c '^FAIL'); last=$(printf '%s\n' "$out" | tail -1)
  if [ "$n" -eq 0 ] && [ "$last" = "ALL PASS" ]; then echo "pass    $t ($(printf '%s\n' "$out" | grep -c '^ok\|^PASS') checks)"; else echo "FAIL    $t"; printf '%s\n' "$out" | grep '^FAIL\|Error' | head -8; bad=1; fi
done
out=$(node minds-pipeline.js 2>&1 | tail -1); case "$out" in *"restored world steps ok"*) echo "pass    minds-pipeline.js";; *) echo "FAIL    minds-pipeline.js: $out"; bad=1;; esac
out=$(node minds-scripted-20-days.js 2>&1 | tail -1); case "$out" in *"snapshot restores and runs"*) echo "pass    minds-scripted-20-days.js";; *) echo "FAIL    minds-scripted-20-days.js: $out"; bad=1;; esac
out=$(node ecology-long-run.js 4000 2>&1); if printf '%s' "$out" | grep -q 'Error'; then echo "FAIL    ecology-long-run.js"; bad=1; else echo "pass    ecology-long-run.js"; printf '%s\n' "$out" | grep 'ms/tick' | sed 's/^/        /' | cut -c1-110; fi
if [ "$1" = "browser" ]; then
  for spec in "page.js desktop 1440 900 9000" "page.js phone 390 800 5000" "recorder.js" "outer-loop.js" "screenshot.js" "culture-shots.js" "worlds.js" "globe.js" "effects.js"; do
    out=$(cd browser && node $spec 2>&1 | tail -3); if printf '%s' "$out" | grep -q 'ERRORS 0'; then echo "pass    browser/$spec"; else echo "FAIL    browser/$spec"; printf '%s\n' "$out" | cut -c1-300; bad=1; fi
  done
fi
[ $bad -eq 0 ] && echo "ALL SUITES PASS" || echo "SOMETHING FAILED"
exit $bad

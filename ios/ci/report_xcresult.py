"""
Post the UI test results in an .xcresult bundle as GitHub annotations: each test's result and
duration, and every failure message (a failed self-test's report names the checks that failed).
Reading job logs needs repository admin rights; annotations don't. Xcode 16 or later.

    python3 ios/ci/report_xcresult.py path/to/AlphabetSafari.xcresult
"""
import json
import subprocess
import sys


def test_results(*args):
    run = subprocess.run(["xcrun", "xcresulttool", "get", "test-results", *args], capture_output=True, text=True)
    if run.returncode != 0 or not run.stdout.strip():
        print(f"::warning title=xcresulttool::{' '.join(args[:1])}: {clean(run.stderr)}")
        return None
    return json.loads(run.stdout)


def clean(text):
    return " ".join(str(text).split()).replace("%", "%25")[:1500]


def walk(node, path):
    kind, name = node.get("nodeType"), node.get("name", "")
    if kind == "Test Case":
        print(f"::notice title=iOS test::{clean(name)}: {node.get('result')} in {node.get('duration', '?')}")
    elif kind == "Failure Message":
        print(f"::error title=iOS test failure::{clean(' / '.join(path[-2:]) + ': ' + name)}")
    for child in node.get("children", []):
        walk(child, path + [name])


def main(path):
    summary = test_results("summary", "--path", path)
    if summary:
        print(f"::notice title=iOS tests::{summary.get('result')}: {summary.get('passedTests')} passed, "
              f"{summary.get('failedTests')} failed, {summary.get('skippedTests')} skipped")
    tests = test_results("tests", "--path", path)
    if tests:
        for node in tests.get("testNodes", []):
            walk(node, [])
    elif summary:
        for failure in summary.get("testFailures", []):
            print(f"::error title=iOS test failure::{clean(failure.get('testName', '') + ': ' + failure.get('failureText', ''))}")


if __name__ == "__main__":
    main(sys.argv[1])

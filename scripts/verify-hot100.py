"""Validate the official index and run only the repository's original references.

This developer script never accepts or executes a learner's uploaded code.
Run: python scripts/verify-hot100.py --run-references
"""
from __future__ import annotations

import argparse
import ast
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
COMPLETE_IDS = {"lc-1", "lc-283", "lc-3", "lc-560", "lc-53", "lc-206", "lc-94", "lc-200", "lc-20", "lc-70"}


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def read_json(relative: str):
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def local_asset(value: str, task_id: str, filename: str) -> Path:
    ensure(value == f"/training/hot100/{task_id}/{filename}", f"Unexpected package path: {task_id}")
    relative = PurePosixPath(value.removeprefix("/"))
    ensure(".." not in relative.parts, f"Unsafe asset path: {task_id}")
    public_root = (ROOT / "public").resolve()
    asset = (public_root / relative).resolve()
    ensure(asset.is_relative_to(public_root) and asset.is_file(), f"Missing local asset: {task_id}/{filename}")
    return asset


def method_contracts(tree: ast.Module) -> dict:
    """Compare caller-visible arguments; helper node classes are handled separately."""
    return {
        (node.name, method.name): ast.dump(method.args, include_attributes=False)
        for node in tree.body if isinstance(node, ast.ClassDef)
        for method in node.body if isinstance(method, ast.FunctionDef)
    }


def declared_tree(declarations: list[str]) -> ast.Module:
    lines: list[str] = []
    for declaration in declarations:
        lines.append(declaration)
        if declaration.lstrip().startswith("def "):
            lines.append("        pass")
    return ast.parse("\n".join(lines))


def validate_catalog() -> list[dict]:
    tasks = read_json("src/content/training/hot100.json")
    snapshot = read_json("public/training/hot100/official-index.json")
    source = snapshot["source"]
    ensure(source["planUrl"] == "https://leetcode.cn/studyplan/top-100-liked/", "Wrong study plan")
    ensure(source["questionCount"] == 100 and source["groupCount"] == 17, "Unexpected source plan size")
    ensure(re.fullmatch(r"[a-f0-9]{64}", source["pageSha256"]) is not None, "Missing page response hash")
    official = [(group["name"], question) for group in snapshot["groups"] for question in group["questions"]]
    ensure(len(tasks) == len(official) == 100, "Expected 100 tasks")
    ensure(len({task["id"] for task in tasks}) == 100, "Duplicate task IDs")
    ensure({task["id"] for task in tasks if task["contentStatus"] == "complete"} == COMPLETE_IDS, "Unexpected complete package coverage")
    queried = [number for request in snapshot["requests"] for number in request["questionNumbers"]]
    ensure(queried == [question["number"] for _, question in official], "Official signature queries do not cover the plan")
    for order, (task, (category, question)) in enumerate(zip(tasks, official), 1):
        task_id = task["id"]
        expected = {
            "id": f"lc-{question['number']}", "track": "hot100", "order": order,
            "number": question["number"], "title": question["title"], "titleEn": question["titleEn"],
            "category": category, "difficulty": question["difficulty"], "language": "Python",
            "sourceUrl": f"https://leetcode.cn/problems/{question['slug']}/", "verifiedAt": source["verifiedAt"],
        }
        for field, value in expected.items():
            ensure(task.get(field) == value, f"{task_id}: official {field} mismatch")
        template = ast.parse(task["codeTemplate"], filename=f"{task_id}/solution.py")
        compile(template, f"{task_id}/solution.py", "exec")
        actual_contracts = method_contracts(template)
        for key, contract in method_contracts(declared_tree(question["pythonDeclarations"])).items():
            ensure(actual_contracts.get(key) == contract, f"{task_id}: official Python arguments changed for {key}")
        for node in template.body:
            if not isinstance(node, ast.ClassDef) or node.name in {"ListNode", "TreeNode", "Node"}:
                continue
            for method in node.body:
                if isinstance(method, ast.FunctionDef):
                    ensure(any(isinstance(item, ast.Raise) for item in method.body), f"{task_id}: scaffold contains an answer or silent stub")
        if task["contentStatus"] == "complete":
            for field in ["description", "inputOutput", "examples", "hints", "complexityAnalysis", "keyPitfalls", "interviewQuestions"]:
                ensure(bool(task[field]), f"{task_id}: incomplete learning package ({field})")
            for field, filename in [("referencePath", "reference.py"), ("testPath", "test_solution.py")]:
                asset = local_asset(task.get(field, ""), task_id, filename)
                compile(asset.read_text(encoding="utf-8"), str(asset), "exec")
        else:
            ensure(task["contentStatus"] == "index", f"{task_id}: invalid content status")
            ensure(not task.get("referencePath") and not task.get("testPath"), f"{task_id}: index entry claims an unprovided package")
    print("PASS: official 100-question order, 17 categories, 100 Python scaffold contracts; 10 complete / 90 index.")
    return tasks


def run_references(tasks: list[dict]) -> None:
    output_root = (ROOT / "output").resolve()
    ensure(output_root.is_relative_to(ROOT), "Invalid workspace output path")
    output_root.mkdir(exist_ok=True)
    run_root = Path(tempfile.mkdtemp(prefix="hot100-checks-", dir=output_root)).resolve()
    ensure(run_root.is_relative_to(output_root), "Temporary verification path escaped output")
    method_count = 0
    print(f"Local author-reference verification: Python {sys.version.split()[0]}")
    for task in tasks:
        if task["contentStatus"] != "complete":
            continue
        folder = run_root / task["id"]
        folder.mkdir()
        shutil.copyfile(local_asset(task["referencePath"], task["id"], "reference.py"), folder / "solution.py")
        shutil.copyfile(local_asset(task["testPath"], task["id"], "test_solution.py"), folder / "test_solution.py")
        result = subprocess.run([sys.executable, "-B", "-m", "unittest", "-v", "test_solution.py"], cwd=folder, text=True, capture_output=True, timeout=20, check=False)
        report = result.stdout + result.stderr
        match = re.search(r"Ran (\d+) tests? in", report)
        if result.returncode or not match:
            print(report)
            raise AssertionError(f"{task['id']}: reference failed its original local tests")
        count = int(match.group(1))
        method_count += count
        print(f"PASS: {task['id']}, {count} unittest methods")
    print(f"PASS: 10 reference packages / {method_count} unittest methods. No LeetCode submission or judge claim.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-references", action="store_true", help="Run repository-authored reference.py as solution.py in ignored output folders")
    arguments = parser.parse_args()
    catalog = validate_catalog()
    if arguments.run_references:
        run_references(catalog)

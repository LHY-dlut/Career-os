"""Repository maintainer check, not a grader for learner drafts.

Run: python public/training/pytorch/validate_references.py
Optional: append --negative-checks to check skeletons and known-bad variants,
and --tutorial-checks to run the six original Markdown tutorial examples.
Learners instead put their own solution.py beside one test_solution.py and run
python -m unittest -v. No network access, GPU, or model files are used here.
本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
"""
import argparse
import contextlib
import io
import json
from pathlib import Path
import re
import sys
import types
import unittest

sys.dont_write_bytecode = True


def run_case(package, source):
    solution = types.ModuleType('solution')
    solution.__file__ = str(package / 'solution.py')
    exec(compile(source, solution.__file__, 'exec'), solution.__dict__)
    sys.modules['solution'] = solution
    tests = types.ModuleType('tests_' + package.name.replace('-', '_'))
    tests.__file__ = str(package / 'test_solution.py')
    exec(compile(Path(tests.__file__).read_text(encoding='utf-8'), tests.__file__, 'exec'), tests.__dict__)
    stream = io.StringIO()
    suite = unittest.defaultTestLoader.loadTestsFromModule(tests)
    with contextlib.redirect_stdout(stream), contextlib.redirect_stderr(stream):
        result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    return result, stream.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--negative-checks', action='store_true')
    parser.add_argument('--tutorial-checks', action='store_true')
    args = parser.parse_args()
    import torch
    print(f'Python {sys.version.split()[0]}; torch {torch.__version__}; CUDA available: {torch.cuda.is_available()}')
    base = Path(__file__).resolve().parent
    packages = sorted(path for path in base.iterdir() if path.is_dir() and (path / 'reference.py').is_file())
    if len(packages) != 14:
        raise RuntimeError(f'Expected 14 packages, found {len(packages)}')
    total = 0
    for package in packages:
        result, log = run_case(package, (package / 'reference.py').read_text(encoding='utf-8'))
        print(f'{package.name}: {result.testsRun} tests, {"PASS" if result.wasSuccessful() else "FAIL"}')
        total += result.testsRun
        if not result.wasSuccessful():
            print(log)
            return 1
    print(f'Reference total: {total} tests passed.')
    if args.negative_checks:
        catalog = base.parents[2] / 'src/content/training/pytorch.json'
        tasks = json.loads(catalog.read_text(encoding='utf-8'))
        for task in tasks:
            result, log = run_case(base / task['id'], task['codeTemplate'])
            if result.wasSuccessful() or 'NotImplementedError' not in log:
                raise AssertionError(f'Skeleton check did not reject unfinished work: {task["id"]}')
        mutations = [
            ('torch-attention', 'mask inversion', 'masked_fill(~visible, -torch.inf)', 'masked_fill(visible, -torch.inf)'),
            ('torch-rope', 'position offset zero', 'torch.arange(offset, offset + x.shape[-2],', 'torch.arange(0, x.shape[-2],'),
            ('torch-kv-cache', 'causal offset zero', 'query_offset=past', 'query_offset=0'),
            ('torch-kv-cache', 'RoPE cache offset zero', 'offset=past', 'offset=0'),
            ('torch-gqa', 'wrong head group order', 'repeat_interleave(repeats, dim=1)', 'repeat(1, repeats, 1, 1)'),
        ]
        for task_id, name, old, new in mutations:
            package = base / task_id
            source = (package / 'reference.py').read_text(encoding='utf-8')
            if old not in source:
                raise AssertionError(f'Mutation target changed: {name}')
            result, log = run_case(package, source.replace(old, new))
            if result.wasSuccessful() or not result.failures:
                raise AssertionError(f'Mutation was not rejected by a behavior assertion: {task_id}: {name}\n{log}')
            print(f'Rejected mutation: {task_id}: {name}')
        print(f'Negative checks: {len(tasks)} unfinished skeletons and {len(mutations)} incorrect implementations rejected.')
    if args.tutorial_checks:
        root = base.parents[2]
        resources = json.loads((root / 'src/content/library/supplemental-catalog.json').read_text(encoding='utf-8'))
        if len(resources) != 6:
            raise AssertionError('Expected six original tutorial resources')
        count = 0
        for resource in resources:
            path = root / 'public' / resource['contentPath'].lstrip('/')
            blocks = re.findall(r'```python\s*\n(.*?)```', path.read_text(encoding='utf-8'), re.S)
            if not blocks:
                raise AssertionError(f'Tutorial lacks runnable Python: {resource["id"]}')
            for code in blocks:
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    exec(compile(code, str(path), 'exec'), {'__name__': '__tutorial__'})
                count += 1
            print(f'Tutorial {resource["id"]}: {len(blocks)} example(s), PASS')
        print(f'Tutorial total: {count} examples passed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

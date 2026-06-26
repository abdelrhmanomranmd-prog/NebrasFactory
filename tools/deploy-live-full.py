#!/usr/bin/env python3
"""نشر حي كامل — انتظار Vercel + سحابة + تحقق."""
import subprocess
import sys

ROOT = __import__('os').path.dirname(__import__('os').path.abspath(__file__))
ROOT = __import__('os').path.dirname(ROOT)


def run(name):
    path = __import__('os').path.join(ROOT, 'tools', name)
    print('\n===', name, '===')
    r = subprocess.run([sys.executable, path], cwd=ROOT)
    return r.returncode


def main():
    deploy = 'hrws137'
    if len(sys.argv) > 1:
        deploy = sys.argv[1]
    steps = [
        ('wait-live-deploy.py', [deploy]),
        ('restore-site-chrome-cloud.py', []),
        ('verify-scm-catalog-live.py', []),
        ('verify-scm-content-persist-live.py', []),
        ('verify-hr-platform-live.py', []),
        ('verify-showroom-chrome-live.py', []),
        ('verify-media-upload-live.py', []),
        ('verify-production-live.py', []),
        ('verify-site-chrome-live.py', []),
        ('test-real-persist-live.py', []),
        ('verify-launch-ready.py', []),
    ]
    failed = []
    for script, args in steps:
        path = __import__('os').path.join(ROOT, 'tools', script)
        print('\n===', script, '===')
        r = subprocess.run([sys.executable, path] + args, cwd=ROOT)
        if r.returncode != 0:
            failed.append(script)
    print('\n=== DEPLOY LIVE SUMMARY ===')
    if failed:
        print('FAILED:', ', '.join(failed))
        return 1
    print('ALL LIVE CHECKS PASSED —', deploy)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

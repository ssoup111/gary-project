#!/usr/bin/env python3
"""
Set one Vercel environment variable, on whichever environments you name.

Uses the REST API with the token the Vercel CLI already stored, because
`vercel env add` prompts for a git branch and can't be scripted.

  python3 vercel-env.py NEXT_PUBLIC_ADMIN_EMAIL "a@b.com,c@d.com" production preview
"""

import json
import os
import sys
import urllib.request
import urllib.error

REPO = os.path.expanduser("~/Desktop/jpix")
AUTH_PATHS = [
    "~/Library/Application Support/com.vercel.cli/auth.json",
    "~/.local/share/com.vercel.cli/auth.json",
    "~/.vercel/auth.json",
]


def die(msg):
    print(f"\n{msg}\n")
    sys.exit(1)


def load_token():
    for p in AUTH_PATHS:
        full = os.path.expanduser(p)
        if os.path.exists(full):
            try:
                with open(full) as fh:
                    tok = json.load(fh).get("token")
                if tok:
                    return tok
            except Exception:
                pass
    die("No Vercel login found. Run: cd ~/Desktop/jpix && ./node_modules/.bin/vercel login")


def api(method, url, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode() or "{}"), None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            detail = json.loads(raw).get("error", {}).get("message", raw)
        except Exception:
            detail = raw
        return None, f"HTTP {e.code}: {detail}"
    except Exception as e:
        return None, str(e)


def main():
    if len(sys.argv) < 4:
        die("Usage: python3 vercel-env.py KEY VALUE production [preview] [development]")

    key, value = sys.argv[1], sys.argv[2]
    targets = [t.lower() for t in sys.argv[3:]]
    for t in targets:
        if t not in ("production", "preview", "development"):
            die(f"Unknown environment: {t}")

    token = load_token()
    proj = os.path.join(REPO, ".vercel", "project.json")
    if not os.path.exists(proj):
        die("Not linked. Run: cd ~/Desktop/jpix && ./node_modules/.bin/vercel link")
    with open(proj) as fh:
        data = json.load(fh)
    project_id, team_id = data["projectId"], data.get("orgId")

    suffix = f"?teamId={team_id}&upsert=true" if team_id else "?upsert=true"
    url = f"https://api.vercel.com/v10/projects/{project_id}/env{suffix}"

    body = {
        "key": key,
        "value": value,
        "type": "encrypted",
        "target": targets,
    }
    _, err = api("POST", url, token, body)
    if err:
        die(f"FAILED  {key}   {err}")

    print(f"\n  ok  {key} -> {', '.join(targets)}")

    listing, err = api(
        "GET",
        f"https://api.vercel.com/v9/projects/{project_id}/env"
        + (f"?teamId={team_id}" if team_id else ""),
        token,
    )
    if not err:
        for e in listing.get("envs", []):
            if e["key"] == key:
                print(f"  Vercel confirms it on: {', '.join(e.get('target', []))}")
    print("\n  Redeploy for it to take effect.\n")


if __name__ == "__main__":
    main()

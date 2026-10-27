"""Build data/kg.json from data/nodes.csv and data/edges.csv.

Edit the CSVs (Numbers, Google Sheets, any text editor), then run:
    python3 scripts/build_kg.py

Edge status: confirmed | draft | private. Private rows are never published;
draft rows are published but drawn dashed so they stand out for review.
"""
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def read(name):
    with open(DATA / name, newline="", encoding="utf-8") as f:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]


def main():
    nodes, edges, errors = [], [], []
    ids = set()
    for r in read("nodes.csv"):
        if not r["id"]:
            continue
        if r["id"] in ids:
            errors.append(f"duplicate node id: {r['id']}")
        ids.add(r["id"])
        node = {"id": r["id"], "type": r["type"], "label": r["label"]}
        if r["url"]:
            node["url"] = r["url"]
        if r["text"]:
            node["text"] = r["text"]
        if r["tags"]:
            node["props"] = {"tags": [t.strip() for t in r["tags"].split(";") if t.strip()]}
        nodes.append(node)

    used = set()
    for i, r in enumerate(read("edges.csv"), start=2):
        if r["status"] == "private":
            continue
        if r["status"] not in ("confirmed", "draft"):
            errors.append(f"edges.csv line {i}: status must be confirmed, draft or private")
        for end in ("from", "to"):
            if r[end] not in ids:
                errors.append(f"edges.csv line {i}: unknown node '{r[end]}'")
        edge = {"from": r["from"], "to": r["to"], "label": r["relation"], "status": r["status"]}
        for k in ("start", "end", "note"):
            if r[k]:
                edge[k] = r[k]
        edges.append(edge)
        used.update((r["from"], r["to"]))

    if errors:
        sys.exit("\n".join(errors))

    # drop nodes nothing points to, so a private edge doesn't leave an orphan behind
    nodes = [n for n in nodes if n["id"] in used]
    kg = {
        "source": {"url": "https://me.rcrdscrtch.com/", "title": "Dima Durah — Founder and Growth Leader"},
        "nodes": nodes,
        "edges": edges,
    }
    (DATA / "kg.json").write_text(json.dumps(kg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    drafts = sum(e["status"] == "draft" for e in edges)
    print(f"kg.json: {len(nodes)} nodes, {len(edges)} edges ({drafts} draft)")


if __name__ == "__main__":
    main()

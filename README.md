# dimadurah — personal site

Static site, no build step. `index.html` (about), `graph.html` (knowledge graph), `data/kg.json` (graph data), `llms.txt`.

## Edit content
- Page copy: `index.html`
- Graph: edit `data/nodes.csv` (things) and `data/edges.csv` (relationships), then run `python3 scripts/build_kg.py` to regenerate `data/kg.json`.
  - Edge `status`: `confirmed`, `draft` (published, drawn dashed) or `private` (never published).
  - `start` / `end` take `YYYY` or `YYYY-MM`; `note` shows next to the relationship (e.g. a job title).

## Preview locally
    python3 -m http.server 4321    # then open http://localhost:4321

## Deploy (GitHub Pages)
1. Create a repo and push this folder to `main`.
2. Repo → Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Custom domain: add a `CNAME` file containing the domain (e.g. `about.example.com`), then at your DNS provider:
   - subdomain → `CNAME` record pointing to `<github-username>.github.io`
   - apex domain → `A` records to 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
4. Tick "Enforce HTTPS" once the certificate is issued.

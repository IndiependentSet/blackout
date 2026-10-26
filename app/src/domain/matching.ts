/** A maximum matching in a general graph: Edmonds' blossom algorithm. Pure and deterministic.

    The skies are planar but full of odd cycles (triangles, five-cycles), so a bipartite method is not exact; on a
    sky of at most 40 stars the O(V³) blossom search takes microseconds. It starts from the greedy matching in edge
    order and augments from unmatched stars in index order, so a small change to the graph moves the result little. */

type Edge = readonly [number, number];

/** Indices into `edges` of a maximum matching: no two share an end, and no larger such set exists. Loops and
    repeated edges are ignored. */
export function maxMatching(n: number, edges: readonly Edge[]): number[] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const match = new Int32Array(n).fill(-1);
  edges.forEach(([u, v]) => {
    if (u === v) return;
    adj[u].push(v); adj[v].push(u);
    if (match[u] < 0 && match[v] < 0) { match[u] = v; match[v] = u; }
  });

  const parent = new Int32Array(n), base = new Int32Array(n);
  const used = new Uint8Array(n), inBlossom = new Uint8Array(n), seen = new Uint8Array(n);

  /* the nearest common ancestor of a and b in the alternating tree, by their blossom bases */
  const lca = (a: number, b: number): number => {
    seen.fill(0);
    for (;;) {
      a = base[a]; seen[a] = 1;
      if (match[a] < 0) break;
      a = parent[match[a]];
    }
    for (;;) {
      b = base[b];
      if (seen[b]) return b;
      b = parent[match[b]];
    }
  };
  const markPath = (v: number, b: number, child: number) => {
    while (base[v] !== b) {
      inBlossom[base[v]] = 1; inBlossom[base[match[v]]] = 1;
      parent[v] = child; child = match[v]; v = parent[match[v]];
    }
  };
  /* breadth-first search for an augmenting path from root; answers its free far end, or -1 */
  const findPath = (root: number): number => {
    used.fill(0); parent.fill(-1);
    for (let i = 0; i < n; i++) base[i] = i;
    used[root] = 1;
    const queue = [root];
    for (let head = 0; head < queue.length; head++) {
      const v = queue[head];
      for (const to of adj[v]) {
        if (base[v] === base[to] || match[v] === to) continue;
        if (to === root || (match[to] >= 0 && parent[match[to]] >= 0)) {
          const b = lca(v, to);
          inBlossom.fill(0);
          markPath(v, b, to); markPath(to, b, v);
          for (let i = 0; i < n; i++) {
            if (!inBlossom[base[i]]) continue;
            base[i] = b;
            if (!used[i]) { used[i] = 1; queue.push(i); }
          }
        } else if (parent[to] < 0) {
          parent[to] = v;
          if (match[to] < 0) return to;
          used[match[to]] = 1; queue.push(match[to]);
        }
      }
    }
    return -1;
  };

  for (let i = 0; i < n; i++) {
    if (match[i] >= 0) continue;
    for (let v = findPath(i); v >= 0;) {
      const pv = parent[v], next = match[pv];
      match[v] = pv; match[pv] = v; v = next;
    }
  }

  /* each matched pair, as the first edge joining it */
  const out: number[] = [];
  const taken = new Uint8Array(n);
  edges.forEach(([u, v], i) => {
    if (u !== v && match[u] === v && !taken[u]) { taken[u] = 1; taken[v] = 1; out.push(i); }
  });
  return out;
}

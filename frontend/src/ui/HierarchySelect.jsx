import LinkedSelect from "./LinkedSelect";
export function hierarchy(rows, label = "name") {
  const nodes = new Map(
    rows.map((r) => [
      r.id,
      { ...r, title: r[label] || r.name, value: r.id, children: [] },
    ]),
  );
  const roots = [];
  for (const n of nodes.values()) {
    const parent = nodes.get(n.parent_id);
    if (parent && parent !== n) parent.children.push(n);
    else roots.push(n);
  }
  return roots;
}
export default function HierarchySelect({ rows, exclude, label, ...props }) {
  const blocked = new Set(exclude ? [exclude] : []);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rows)
      if (blocked.has(r.parent_id) && !blocked.has(r.id)) {
        blocked.add(r.id);
        changed = true;
      }
  }
  const flatten = (nodes, depth = 0, parents = []) =>
    nodes.flatMap((node) => [
      {
        value: node.value,
        label: node.title,
        depth,
        searchText: [...parents, node.title].join(" / "),
      },
      ...flatten(node.children, depth + 1, [...parents, node.title]),
    ]);
  return (
    <LinkedSelect
      {...props}
      allowClear
      placeholder="Không có cấp cha (cấp cao nhất)"
      style={{ width: "100%" }}
      options={flatten(
        hierarchy(
          rows.filter((r) => !blocked.has(r.id)),
          label,
        ),
      )}
    />
  );
}

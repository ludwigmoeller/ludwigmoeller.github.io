let data = [];
let dragSourcePath = null;

/* DOM */
const toplevelInput = document.getElementById("toplevelName");
const tree = document.getElementById("tree");
const preview = document.getElementById("preview");
const output = document.getElementById("output");
const parentSelect = document.getElementById("parentSelect");

/* ---------- Theme ---------- */

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark"));
}

if (localStorage.getItem("theme") === "true") document.body.classList.add("dark");

/* ---------- Helpers ---------- */

function getItem(path) {
  return path.reduce((a, i) => a[i].children ?? a, data);
}

function getParent(path) {
  return path.length === 1
    ? data
    : getItem(path.slice(0, -1));
}

/* ---------- Core ---------- */

function addItem() {
  const name = itemName.value.trim();
  if (!name) return;

  const url = itemUrl.value.trim();
  const parent = parentSelect.value
    ? getItem(parentSelect.value.split(".").map(Number))
    : data;

  parent.push(url ? { name, url } : { name, children: [] });
  itemName.value = itemUrl.value = "";
  refresh();
}

function renameItem(path, value) {
  const parent = getParent(path);
  parent[path.at(-1)].name = value;
  refresh(false);
}

function removeItem(path) {
  getParent(path).splice(path.at(-1), 1);
  refresh();
}

/* ---------- Drag & Drop ---------- */

function dragStart(path) {
  dragSourcePath = path;
}

function dropOn(targetPath, intoFolder) {
  if (!dragSourcePath) return;

  const srcParent = getParent(dragSourcePath);
  const item = srcParent.splice(dragSourcePath.at(-1), 1)[0];

  let target;
  if (intoFolder) {
    target = getParent(targetPath)[targetPath.at(-1)].children;
  } else {
    target = getParent(targetPath);
  }

  target.push(item);
  dragSourcePath = null;
  refresh();
}

/* ---------- Rendering ---------- */

function renderTree() {
  tree.innerHTML = "";

  function walk(items, path = []) {
    items.forEach((item, i) => {
      const p = [...path, i];
      const div = document.createElement("div");
      div.className = "item";
      div.draggable = true;

      div.ondragstart = () => dragStart(p);
      div.ondragover = e => {
        e.preventDefault();
        div.classList.add("drag-over");
      };
      div.ondragleave = () => div.classList.remove("drag-over");
      div.ondrop = () =>
        dropOn(p, !!item.children);

      div.innerHTML = `
        ${item.children ? "📁" : "🔗"}
        <input class="name" value="${item.name}"
          oninput="renameItem(${JSON.stringify(p)}, this.value)" />
        <button onclick="removeItem(${JSON.stringify(p)})">✕</button>
      `;
      tree.appendChild(div);

      if (item.children) walk(item.children, p);
    });
  }

  walk(data);
}

function renderPreview() {
  preview.innerHTML = `<strong>${toplevelInput.value}</strong>`;

  function walk(items) {
    const ul = document.createElement("ul");
    items.forEach(i => {
      const li = document.createElement("li");
      li.textContent = i.name;
      if (i.children) li.appendChild(walk(i.children));
      ul.appendChild(li);
    });
    return ul;
  }

  preview.appendChild(walk(data));
}

function renderJson() {
  output.value = JSON.stringify(
    [{ toplevel_name: toplevelInput.value }, ...data],
    null,
    2
  );
}

function refresh(full = true) {
  if (full) updateParents();
  renderTree();
  renderPreview();
  renderJson();
}

function updateParents() {
  parentSelect.innerHTML = `<option value="">(Top level)</option>`;
  function walk(items, path = "") {
    items.forEach((i, idx) => {
      if (i.children) {
        const p = path + idx;
        parentSelect.innerHTML += `<option value="${p}">${i.name}</option>`;
        walk(i.children, p + ".");
      }
    });
  }
  walk(data);
}

/* ---------- Import ---------- */

function importJson(e) {
  const reader = new FileReader();
  reader.onload = ev => {
    const parsed = JSON.parse(ev.target.result);
    toplevelInput.value = parsed[0].toplevel_name;
    data = parsed.slice(1);
    refresh();
  };
  reader.readAsText(e.target.files[0]);
}

toplevelInput.addEventListener("input", renderJson);

refresh();

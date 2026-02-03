let data = [];
let dragSourcePath = null;

/* ---------------- Theme ---------------- */

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
}

(function () {
  const saved = localStorage.getItem("theme");
  if (saved) applyTheme(saved);
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches)
    applyTheme("dark");
})();

/* ---------------- Helpers ---------------- */

function getItemByPath(path) {
  let ref = data;
  for (let i = 0; i < path.length; i++) {
    ref = ref[path[i]];
    if (ref.children && i < path.length - 1) ref = ref.children;
  }
  return ref;
}

function getParentAndIndex(path) {
  let parent = data;
  for (let i = 0; i < path.length - 1; i++) {
    parent = parent[path[i]].children;
  }
  return { parent, index: path[path.length - 1] };
}

/* ---------------- Favorites Logic ---------------- */

function updateParents() {
  const select = document.getElementById("parentSelect");
  select.innerHTML = `<option value="">(Top level)</option>`;

  function walk(items, path = "") {
    items.forEach((item, index) => {
      if (item.children) {
        const id = path + index;
        select.innerHTML += `<option value="${id}">${item.name}</option>`;
        walk(item.children, id + ".");
      }
    });
  }

  walk(data);
}

function addItem() {
  const name = itemName.value.trim();
  const url = itemUrl.value.trim();
  const parentPath = parentSelect.value;

  if (!name) return;

  const newItem = url ? { name, url } : { name, children: [] };

  if (!parentPath) data.push(newItem);
  else {
    let target = data;
    parentPath.split(".").forEach(i => (target = target[i].children));
    target.push(newItem);
  }

  itemName.value = "";
  itemUrl.value = "";

  refresh();
}

function removeItem(path) {
  const { parent, index } = getParentAndIndex(path);
  parent.splice(index, 1);
  refresh();
}

/* ---------------- Drag & Drop ---------------- */

function onDragStart(path) {
  dragSourcePath = path;
}

function onDrop(targetPath) {
  if (!dragSourcePath || dragSourcePath === targetPath) return;

  const src = getParentAndIndex(dragSourcePath.split(".").map(Number));
  const dst = getParentAndIndex(targetPath.split(".").map(Number));

  const [item] = src.parent.splice(src.index, 1);
  dst.parent.splice(dst.index, 0, item);

  dragSourcePath = null;
  refresh();
}

/* ---------------- Rendering ---------------- */

function renderTree() {
  const tree = document.getElementById("tree");
  tree.innerHTML = "";

  function walk(items, path = "") {
    items.forEach((item, index) => {
      const currentPath = path ? `${path}.${index}` : `${index}`;
      const div = document.createElement("div");
      div.className = "item";
      div.draggable = true;

      div.ondragstart = () => onDragStart(currentPath);
      div.ondragover = e => {
        e.preventDefault();
        div.classList.add("drag-over");
      };
      div.ondragleave = () => div.classList.remove("drag-over");
      div.ondrop = () => onDrop(currentPath);

      div.innerHTML = `
        ${item.url ? "🔗" : "📁"}
        <input class="name" value="${item.name}"
          oninput="renameItem('${currentPath}', this.value)" />
        <button onclick="removeItem('${currentPath}')">✕</button>
      `;

      tree.appendChild(div);

      if (item.children) walk(item.children, currentPath);
    });
  }

  walk(data);
}

function renameItem(path, value) {
  const item = getItemByPath(path.split(".").map(Number));
  item.name = value;
  renderJson();
}

function renderJson() {
  const output = [
    { toplevel_name: toplevelName.value || "" },
    ...data
  ];
  outputArea.value = JSON.stringify(output, null, 2);
}

function copyJson() {
  navigator.clipboard.writeText(outputArea.value);
}

toplevelName.addEventListener("input", renderJson);

/* ---------------- Import JSON ---------------- */

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const parsed = JSON.parse(e.target.result);
    if (!parsed?.[0]?.toplevel_name) {
      alert("Invalid Managed Favorites JSON");
      return;
    }

    toplevelName.value = parsed[0].toplevel_name;
    data = parsed.slice(1);
    refresh();
  };
  reader.readAsText(file);
}

/* ---------------- Init ---------------- */

function refresh() {
  updateParents();
  renderTree();
  renderJson();
}

refresh();

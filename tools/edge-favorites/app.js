let data = [];
let dragSourcePath = null;

/* ---------- DOM ---------- */

const toplevelInput = document.getElementById("toplevelName");
const tree = document.getElementById("tree");
const preview = document.getElementById("preview");
const output = document.getElementById("output");
const parentSelect = document.getElementById("parentSelect");
const itemName = document.getElementById("itemName");
const itemUrl = document.getElementById("itemUrl");
const rootDrop = document.getElementById("rootDrop");

/* ---------- Theme ---------- */

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark"));
}

if (localStorage.getItem("theme") === "true") {
  document.body.classList.add("dark");
}

/* ---------- Helpers ---------- */

function getParent(path) {
  let ref = data;
  for (let i = 0; i < path.length - 1; i++) {
    ref = ref[path[i]].children;
  }
  return ref;
}

/* ---------- Core ---------- */

function addItem() {
  const name = itemName.value.trim();
  if (!name) return;

  const url = itemUrl.value.trim();
  let target = data;

  if (parentSelect.value) {
    parentSelect.value.split(".").forEach(i => {
      target = target[Number(i)].children;
    });
  }

  target.push(url ? { name, url } : { name, children: [] });

  itemName.value = "";
  itemUrl.value = "";
  refresh();
}

function renameItem(path, value) {
  getParent(path)[path.at(-1)].name = value;
  renderJson();
}

function removeItem(path) {
  getParent(path).splice(path.at(-1), 1);
  refresh();
}

/* ---------- Drag & Drop ---------- */

function dragStart(path) {
  dragSourcePath = path;
}

function dropInto(targetPath, intoFolder) {
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

rootDrop.ondragover = e => e.preventDefault();
rootDrop.ondrop = () => {
  if (!dragSourcePath) return;
  const srcParent = getParent(dragSourcePath);
  const item = srcParent.splice(dragSourcePath.at(-1), 1)[0];
  data.push(item);
  dragSourcePath = null;
  refresh();
};

/* ---------- Rendering ---------- */

function renderTree() {
  tree.innerHTML = "";

  function walk(items, path = []) {
    items.forEach((item, index) => {
      const p = [...path, index];
      const div = document.createElement("div");
      div.className = "tree-item";
      div.draggable = true;

      div.ondragstart = () => dragStart(p);
      div.ondragover = e => {
        e.preventDefault();
        div.classList.add("drag-over");
      };
      div.ondragleave = () => div.classList.remove("drag-over");
      div.ondrop = () => dropInto(p, !!item.children);

      div.innerHTML = `
        ${item.children ? "📁" : "🔗"}
        <input value="${item.name}"
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
  preview.innerHTML = "";

  const menu = document.createElement("div");
  menu.className = "edge-menu";

  function buildColumn(items) {
    const col = document.createElement("div");
    col.className = "edge-column";

    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "edge-item";
      row.innerHTML = `
        <span>${item.children ? "📁" : "🌐"} ${item.name}</span>
        ${item.children ? "▶" : ""}
      `;

      if (item.children) {
        row.onmouseenter = () => {
          while (menu.children.length > [...menu.children].indexOf(col) + 1) {
            menu.removeChild(menu.lastChild);
          }
          menu.appendChild(buildColumn(item.children));
        };
      }

      col.appendChild(row);
    });

    return col;
  }

  menu.appendChild(buildColumn(data));
  preview.appendChild(menu);
}

function renderJson() {
  output.value = JSON.stringify(
    [{ toplevel_name: toplevelInput.value }, ...data],
    null,
    2
  );
}

function updateParents() {
  parentSelect.innerHTML = `<option value="">(Top level)</option>`;

  function walk(items, path = "") {
    items.forEach((item, index) => {
      if (item.children) {
        const p = path + index;
        parentSelect.innerHTML += `<option value="${p}">${item.name}</option>`;
        walk(item.children, p + ".");
      }
    });
  }

  walk(data);
}

function refresh() {
  updateParents();
  renderTree();
  renderPreview();
  renderJson();
}

/* ---------- Import ---------- */

function importJson(e) {
  const reader = new FileReader();
  reader.onload = ev => {
    const parsed = JSON.parse(ev.target.result);
    if (!parsed?.[0]?.toplevel_name) {
      alert("Invalid Managed Favorites JSON");
      return;
    }
    toplevelInput.value = parsed[0].toplevel_name;
    data = parsed.slice(1);
    refresh();
  };
  reader.readAsText(e.target.files[0]);
}

toplevelInput.addEventListener("input", renderJson);

/* ---------- Init ---------- */

refresh();

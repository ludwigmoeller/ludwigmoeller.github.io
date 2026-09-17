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

function getManagedFavorites() {
  return [{ toplevel_name: toplevelInput.value }, ...data];
}

function getSafeFileName() {
  return (toplevelInput.value || "edge-managed-favorites")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "edge-managed-favorites";
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function valueToPlistXml(value, indent = 0) {
  const spacing = "  ".repeat(indent);

  if (Array.isArray(value)) {
    let xml = `${spacing}<array>\n`;

    value.forEach(item => {
      xml += valueToPlistXml(item, indent + 1);
    });

    xml += `${spacing}</array>\n`;
    return xml;
  }

  if (value !== null && typeof value === "object") {
    let xml = `${spacing}<dict>\n`;

    Object.entries(value).forEach(([key, itemValue]) => {
      xml += `${"  ".repeat(indent + 1)}<key>${escapeXml(key)}</key>\n`;
      xml += valueToPlistXml(itemValue, indent + 1);
    });

    xml += `${spacing}</dict>\n`;
    return xml;
  }

  if (typeof value === "boolean") {
    return `${spacing}<${value ? "true" : "false"}/>\n`;
  }

  if (typeof value === "number") {
    return `${spacing}<integer>${value}</integer>\n`;
  }

  return `${spacing}<string>${escapeXml(value)}</string>\n`;
}

function generateMacPlist() {
  let plist = "<key>ManagedFavorites</key>\n";
  plist += valueToPlistXml(getManagedFavorites());
  return plist;
}

function setButtonFeedback(button, message, resetText, delay = 1500) {
  if (!button) return;

  button.textContent = message;
  button.disabled = true;

  window.setTimeout(() => {
    button.textContent = resetText;
    button.disabled = false;
  }, delay);
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

      if (item.children) {
        walk(item.children, p);
      }
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
  output.value = JSON.stringify(getManagedFavorites(), null, 2);
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

/* ---------- Actions ---------- */

async function copyJson(button) {
  const json = output.value;

  if (!json.trim()) {
    alert("There is no JSON to copy.");
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(json);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = json;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";

      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (!copied) {
        throw new Error("Browser copy command failed.");
      }
    }

    setButtonFeedback(button, "Copied!", "Copy JSON");
  } catch (error) {
    console.error("Copy failed:", error);
    setButtonFeedback(button, "Copy failed", "Copy JSON", 2000);
  }
}

function downloadWindowsJson() {
  const json = output.value;

  if (!json.trim()) {
    alert("There is no JSON to download.");
    return;
  }

  downloadFile(
    json,
    `${getSafeFileName()}-windows.json`,
    "application/json"
  );
}

function downloadMacPlist() {
  const plist = generateMacPlist();

  if (!plist.trim()) {
    alert("There is no macOS configuration to download.");
    return;
  }

  /*
    Microsoft Intune's macOS Preference file profile expects only the
    key/value pairs in the uploaded file, without the XML header,
    <plist>, or outer <dict> wrapper.

    Preference domain in Intune: com.microsoft.Edge
  */
  downloadFile(
    plist,
    "com.microsoft.Edge.plist",
    "application/xml"
  );
}

/* ---------- Import ---------- */

function importJson(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);

      if (!Array.isArray(parsed) || !parsed?.[0]?.toplevel_name) {
        alert("Invalid Managed Favorites JSON");
        return;
      }

      toplevelInput.value = parsed[0].toplevel_name;
      data = parsed.slice(1);
      refresh();
    } catch (error) {
      console.error("Import failed:", error);
      alert("The selected file is not valid JSON.");
    } finally {
      e.target.value = "";
    }
  };

  reader.readAsText(file);
}

toplevelInput.addEventListener("input", renderJson);

/* ---------- Init ---------- */

refresh();

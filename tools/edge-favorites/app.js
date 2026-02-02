const containerName = document.getElementById("containerName");
const schemaMode = document.getElementById("schemaMode");
const rootName = document.getElementById("rootName");
const itemsEl = document.getElementById("items");
const outputEl = document.getElementById("output");

const addFolderBtn = document.getElementById("addFolder");
const addLinkBtn = document.getElementById("addLink");
const copyBtn = document.getElementById("copyJson");
const downloadBtn = document.getElementById("downloadJson");

const folderTemplate = document.getElementById("folderTemplate");
const linkTemplate = document.getElementById("linkTemplate");

// In-memory model (simple + safe)
const state = {
  items: [] // { id, kind:'folder'|'link', name, url?, parentId:'root'|folderId }
};

const uid = () => crypto.randomUUID();

function getFolderOptions() {
  const folders = [{ id: "root", name: rootName.value.trim() || "Company Resources" }];
  for (const it of state.items) {
    if (it.kind === "folder") folders.push({ id: it.id, name: it.name || "(unnamed folder)" });
  }
  return folders;
}

function refreshParentDropdowns() {
  const options = getFolderOptions();
  for (const node of itemsEl.querySelectorAll("select.jsParent")) {
    const current = node.value || "root";
    node.innerHTML = "";
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt.id;
      o.textContent = opt.name;
      node.appendChild(o);
    }
    node.value = options.some(o => o.id === current) ? current : "root";
  }
}

function render() {
  itemsEl.innerHTML = "";

  for (const it of state.items) {
    const tpl = it.kind === "folder" ? folderTemplate : linkTemplate;
    const node = tpl.content.firstElementChild.cloneNode(true);

    const nameInput = node.querySelector("input.jsName");
    const parentSelect = node.querySelector("select.jsParent");
    const removeBtn = node.querySelector("button.jsRemove");

    nameInput.value = it.name || "";
    parentSelect.value = it.parentId || "root";

    nameInput.addEventListener("input", () => {
      it.name = nameInput.value;
      refreshParentDropdowns();
      updateOutput();
    });

    parentSelect.addEventListener("change", () => {
      it.parentId = parentSelect.value;
      updateOutput();
    });

    if (it.kind === "link") {
      const urlInput = node.querySelector("input.jsUrl");
      urlInput.value = it.url || "";
      urlInput.addEventListener("input", () => {
        it.url = urlInput.value;
        updateOutput();
      });
    }

    removeBtn.addEventListener("click", () => {
      // remove item and reparent children to root if needed
      const removeId = it.id;
      state.items = state.items.filter(x => x.id !== removeId);
      for (const x of state.items) {
        if (x.parentId === removeId) x.parentId = "root";
      }
      render();
      updateOutput();
    });

    itemsEl.appendChild(node);
  }

  refreshParentDropdowns();
  updateOutput();
}

function buildTree() {
  // Build folder map
  const root = {
    type: "folder",
    name: rootName.value.trim() || "Company Resources",
    children: []
  };

  const folders = new Map();
  folders.set("root", root);

  // Create folder nodes first
  for (const it of state.items.filter(x => x.kind === "folder")) {
    folders.set(it.id, { type: "folder", name: it.name?.trim() || "Unnamed folder", children: [] });
  }

  // Attach folders to parents
  for (const it of state.items.filter(x => x.kind === "folder")) {
    const parent = folders.get(it.parentId || "root") || root;
    const node = folders.get(it.id);
    parent.children.push(node);
  }

  // Attach links
  for (const it of state.items.filter(x => x.kind === "link")) {
    const parent = folders.get(it.parentId || "root") || root;
    const name = it.name?.trim() || "Unnamed link";
    const url = (it.url || "").trim();

    if (!url.startsWith("https://")) {
      // Keep it in output, but it will be invalid for Edge — warn via placeholder
      parent.children.push({ type: "url", name, url: url || "INVALID_URL_MISSING_HTTPS" });
    } else {
      parent.children.push({ type: "url", name, url });
    }
  }

  return [root]; // Edge expects a list
}

function updateOutput() {
  const json = JSON.stringify(buildTree(), null, 2);
  outputEl.value = json;
}

addFolderBtn.addEventListener("click", () => {
  state.items.push({ id: uid(), kind: "folder", name: "", parentId: "root" });
  render();
});

addLinkBtn.addEventListener("click", () => {
  state.items.push({ id: uid(), kind: "link", name: "", url: "", parentId: "root" });
  render();
});

rootName.addEventListener("input", () => {
  refreshParentDropdowns();
  updateOutput();
});

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(outputEl.value);
  copyBtn.textContent = "Copied!";
  setTimeout(() => (copyBtn.textContent = "Copy JSON"), 900);
});

downloadBtn.addEventListener("click", () => {
  const blob = new Blob([outputEl.value], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "edge-managed-favorites.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

// Start
render();

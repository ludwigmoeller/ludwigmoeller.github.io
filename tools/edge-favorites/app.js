/* ========= DOM ========= */
const containerName = document.getElementById("containerName");
const rootName = document.getElementById("rootName");

const itemsEl = document.getElementById("items");
const outputEl = document.getElementById("output");

const addFolderBtn = document.getElementById("addFolder");
const addLinkBtn = document.getElementById("addLink");
const copyBtn = document.getElementById("copyJson");
const downloadBtn = document.getElementById("downloadJson");

const folderTemplate = document.getElementById("folderTemplate");
const linkTemplate = document.getElementById("linkTemplate");

/* ========= STATE ========= */
const state = {
  items: []
};

const uid = () => crypto.randomUUID();

/* ========= HELPERS ========= */
function normalizeUrl(url) {
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
}

function getFolderOptions() {
  const folders = [
    {
      id: "root",
      name: rootName.value.trim() || "Company Resources"
    }
  ];

  for (const it of state.items) {
    if (it.kind === "folder") {
      folders.push({
        id: it.id,
        name: it.name || "(unnamed folder)"
      });
    }
  }

  return folders;
}

function refreshParentDropdowns() {
  const options = getFolderOptions();

  for (const select of itemsEl.querySelectorAll("select.jsParent")) {
    const current = select.value || "root";
    select.innerHTML = "";

    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt.id;
      o.textContent = opt.name;
      select.appendChild(o);
    }

    select.value = options.some(o => o.id === current) ? current : "root";
  }
}

/* ========= RENDER ========= */
function render() {
  itemsEl.innerHTML = "";

  for (const it of state.items) {
    const tpl = it.kind === "folder" ? folderTemplate : linkTemplate;
    const node = tpl.content.firstElementChild.cloneNode(true);

    const nameInput = node.querySelector(".jsName");
    const parentSelect = node.querySelector(".jsParent");
    const removeBtn = node.querySelector(".jsRemove");

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
      const urlInput = node.querySelector(".jsUrl");
      urlInput.value = it.url || "";

      urlInput.addEventListener("input", () => {
        it.url = urlInput.value;
        updateOutput();
      });
    }

    removeBtn.addEventListener("click", () => {
      const removeId = it.id;
      state.items = state.items.filter(x => x.id !== removeId);

      for (const x of state.items) {
        if (x.parentId === removeId) {
          x.parentId = "root";
        }
      }

      render();
      updateOutput();
    });

    itemsEl.appendChild(node);
  }

  refreshParentDropdowns();
  updateOutput();
}

/* ========= LEGACY EXPORT ========= */
function buildLegacyChildren(parentId) {
  const children = [];

  for (const it of state.items.filter(x => x.parentId === parentId)) {
    if (it.kind === "folder") {
      children.push({
        name: it.name || "Unnamed folder",
        children: buildLegacyChildren(it.id)
      });
    } else {
      children.push({
        name: it.name || "Unnamed link",
        url: normalizeUrl(it.url)
      });
    }
  }

  return children;
}

function exportLegacy() {
  const output = [];

  output.push({
    toplevel_name: containerName.value.trim() || "Managed Favorites"
  });

  output.push(...buildLegacyChildren("root"));

  return JSON.stringify(output, null, 2);
}

/* ========= OUTPUT ========= */
function updateOutput() {
  outputEl.value = exportLegacy();
}

/* ========= EVENTS ========= */
addFolderBtn.addEventListener("click", () => {
  state.items.push({
    id: uid(),
    kind: "folder",
    name: "",
    parentId: "root"
  });
  render();
});

addLinkBtn.addEventListener("click", () => {
  state.items.push({
    id: uid(),
    kind: "link",
    name: "",
    url: "",
    parentId: "root"
  });
  render();
});

containerName.addEventListener("input", updateOutput);
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
  const blob = new Blob([outputEl.value], {
    type: "application/json;charset=utf-8"
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "edge-managed-favorites.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ========= INIT ========= */
render();

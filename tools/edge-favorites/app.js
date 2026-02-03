let data = [];

/* ---------------- Theme ---------------- */

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  applyTheme(
    document.body.classList.contains("dark") ? "light" : "dark"
  );
}

(function () {
  const saved = localStorage.getItem("theme");
  if (saved) {
    applyTheme(saved);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyTheme("dark");
  }
})();

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
  const name = document.getElementById("itemName").value.trim();
  const url = document.getElementById("itemUrl").value.trim();
  const parentPath = document.getElementById("parentSelect").value;

  if (!name) return;

  const newItem = url
    ? { name, url }
    : { name, children: [] };

  if (!parentPath) {
    data.push(newItem);
  } else {
    let target = data;
    parentPath.split(".").forEach(i => {
      target = target[i].children;
    });
    target.push(newItem);
  }

  document.getElementById("itemName").value = "";
  document.getElementById("itemUrl").value = "";

  updateParents();
  renderJson();
}

function renderJson() {
  const topName = document.getElementById("toplevelName").value || "";
  const output = [
    { toplevel_name: topName },
    ...data
  ];
  document.getElementById("output").value =
    JSON.stringify(output, null, 2);
}

function copyJson() {
  navigator.clipboard.writeText(
    document.getElementById("output").value
  );
}

document
  .getElementById("toplevelName")
  .addEventListener("input", renderJson);

/* ---------------- Import JSON ---------------- */

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);

      if (!Array.isArray(parsed) || !parsed[0]?.toplevel_name) {
        alert("Invalid Managed Favorites JSON");
        return;
      }

      document.getElementById("toplevelName").value =
        parsed[0].toplevel_name;

      data = parsed.slice(1);
      updateParents();
      renderJson();
    } catch {
      alert("Failed to parse JSON");
    }
  };

  reader.readAsText(file);
}

/* ---------------- Init ---------------- */

updateParents();
renderJson();

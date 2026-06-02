let data = [];
let templateZipFile = null;

/* ---------- DOM ---------- */

const tree = document.getElementById("tree");
const preview = document.getElementById("preview");
const output = document.getElementById("output");
const serverName = document.getElementById("serverName");
const printerName = document.getElementById("printerName");
const serverSelect = document.getElementById("serverSelect");
const statusBox = document.getElementById("status");

/* ---------- Theme ---------- */

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark"));
}

if (localStorage.getItem("theme") === "true") {
  document.body.classList.add("dark");
}

/* ---------- Helpers ---------- */

function setStatus(message, type = "") {
  statusBox.className = `status ${type}`;
  statusBox.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function psString(value) {
  return String(value).replaceAll("'", "''");
}

function uniqueServers() {
  return data.map(server => server.name);
}

function allPrinters() {
  return data.flatMap(server =>
    server.printers.map(printer => ({
      server: server.name,
      printer: printer.name
    }))
  );
}

function safeFileName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------- Core ---------- */

function addServer() {
  const name = serverName.value.trim();
  if (!name) return;

  if (data.some(server => server.name.toLowerCase() === name.toLowerCase())) {
    alert("That server already exists.");
    return;
  }

  data.push({ name, printers: [] });
  serverName.value = "";
  refresh();
}

function addPrinter() {
  const selectedIndex = Number(serverSelect.value);
  const name = printerName.value.trim();

  if (!data[selectedIndex]) {
    alert("Add or select a server first.");
    return;
  }

  if (!name) return;

  const server = data[selectedIndex];

  if (server.printers.some(printer => printer.name.toLowerCase() === name.toLowerCase())) {
    alert("That printer already exists under this server.");
    return;
  }

  server.printers.push({ name });
  printerName.value = "";
  refresh();
}

function renameServer(index, value) {
  data[index].name = value.trim();
  refresh();
}

function renamePrinter(serverIndex, printerIndex, value) {
  data[serverIndex].printers[printerIndex].name = value.trim();
  renderPreview();
  renderPowerShellPreview();
}

function removeServer(index) {
  data.splice(index, 1);
  refresh();
}

function removePrinter(serverIndex, printerIndex) {
  data[serverIndex].printers.splice(printerIndex, 1);
  refresh();
}

/* ---------- Rendering ---------- */

function updateServerSelect() {
  serverSelect.innerHTML = "";

  if (data.length === 0) {
    serverSelect.innerHTML = `<option value="">Add a server first</option>`;
    return;
  }

  data.forEach((server, index) => {
    serverSelect.innerHTML += `<option value="${index}">${escapeHtml(server.name)}</option>`;
  });
}

function renderTree() {
  tree.innerHTML = "";

  if (data.length === 0) {
    tree.innerHTML = `<p class="muted">No print servers added yet.</p>`;
    return;
  }

  data.forEach((server, serverIndex) => {
    const serverDiv = document.createElement("div");
    serverDiv.className = "tree-server";

    serverDiv.innerHTML = `
      📁
      <input value="${escapeHtml(server.name)}"
        oninput="renameServer(${serverIndex}, this.value)" />
      <button onclick="removeServer(${serverIndex})">✕</button>
    `;

    tree.appendChild(serverDiv);

    if (server.printers.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "tree-printer muted";
      emptyDiv.textContent = "No printers under this server.";
      tree.appendChild(emptyDiv);
    }

    server.printers.forEach((printer, printerIndex) => {
      const printerDiv = document.createElement("div");
      printerDiv.className = "tree-printer";

      printerDiv.innerHTML = `
        🔗
        <input value="${escapeHtml(printer.name)}"
          oninput="renamePrinter(${serverIndex}, ${printerIndex}, this.value)" />
        <button onclick="removePrinter(${serverIndex}, ${printerIndex})">✕</button>
      `;

      tree.appendChild(printerDiv);
    });
  });
}

function renderPreview() {
  preview.innerHTML = "";

  const menu = document.createElement("div");
  menu.className = "print-preview";

  const serverColumn = document.createElement("div");
  serverColumn.className = "print-column";

  const printerColumn = document.createElement("div");
  printerColumn.className = "print-column";

  if (data.length === 0) {
    serverColumn.innerHTML = `<div class="print-item">No servers yet</div>`;
    menu.appendChild(serverColumn);
    preview.appendChild(menu);
    return;
  }

  data.forEach((server, index) => {
    const row = document.createElement("div");
    row.className = "print-item";
    row.innerHTML = `<span>📁 ${escapeHtml(server.name)}</span><span>▶</span>`;

    row.onmouseenter = () => {
      printerColumn.innerHTML = "";

      if (server.printers.length === 0) {
        printerColumn.innerHTML = `<div class="print-item">No printers</div>`;
      }

      server.printers.forEach(printer => {
        const printerRow = document.createElement("div");
        printerRow.className = "print-item";
        printerRow.innerHTML = `<span>🖨️ ${escapeHtml(printer.name)}</span>`;
        printerColumn.appendChild(printerRow);
      });
    };

    if (index === 0) row.onmouseenter();

    serverColumn.appendChild(row);
  });

  menu.appendChild(serverColumn);
  menu.appendChild(printerColumn);
  preview.appendChild(menu);
}

function generateServersBlock(quote = "'") {
  const servers = uniqueServers().filter(Boolean);

  if (servers.length === 0) {
    return "";
  }

  return servers
    .map(server => `    ${quote}${psString(server)}${quote}`)
    .join(",\n");
}

function generatePrinterObjectsBlock() {
  const printers = allPrinters().filter(item => item.server && item.printer);

  if (printers.length === 0) {
    return "";
  }

  return printers.map(item => `    [PSCustomObject]@{
        Printer = "${item.printer.replaceAll('"', '`"')}"
        Server  = "${item.server.replaceAll('"', '`"')}"
    }`).join(",\n");
}

function generateTrustPrintServersScript() {
  return `# Run this in SYSTEM context

$PrintServers = @(
${generateServersBlock("'")}
)

$PointAndPrintPath        = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\Printers\\PointAndPrint'
$PackagePointAndPrintPath = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\Printers\\PackagePointAndPrint'
$PackageServerListPath    = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\Printers\\PackagePointAndPrint\\ListofServers'

$RegistryPaths = @(
    $PointAndPrintPath,
    $PackagePointAndPrintPath,
    $PackageServerListPath
)

foreach ($Path in $RegistryPaths) {
    if (-not (Test-Path -Path $Path)) {
        New-Item -Path $Path -Force | Out-Null
    }
}

# Package Point and Print - Approved servers
Set-ItemProperty -Path $PackagePointAndPrintPath -Name 'PackagePointAndPrintServerList' -Type DWord -Value 1

foreach ($Server in $PrintServers) {
    Set-ItemProperty -Path $PackageServerListPath -Name $Server -Type String -Value $Server
}

# Point and Print Restrictions
Set-ItemProperty -Path $PointAndPrintPath -Name 'Restricted' -Type DWord -Value 1
Set-ItemProperty -Path $PointAndPrintPath -Name 'TrustedServers' -Type DWord -Value 1
Set-ItemProperty -Path $PointAndPrintPath -Name 'InForest' -Type DWord -Value 0
Set-ItemProperty -Path $PointAndPrintPath -Name 'NoWarningNoElevationOnInstall' -Type DWord -Value 1
Set-ItemProperty -Path $PointAndPrintPath -Name 'UpdatePromptSettings' -Type DWord -Value 2
Set-ItemProperty -Path $PointAndPrintPath -Name 'ServerList' -Type String -Value ($PrintServers -join ';')

# Temporarily allow non-admin driver install for the printer install step
Set-ItemProperty -Path $PointAndPrintPath -Name 'RestrictDriverInstallationToAdministrators' -Type DWord -Value 0

exit 0
`;
}

function renderPowerShellPreview() {
  output.value = `$PrintServers = @(
${generateServersBlock("'")}
)

$printers = @(
${generatePrinterObjectsBlock()}
)

$ApprovedPrintServers = @(
${generateServersBlock('"')}
)
`;
}

function refresh() {
  updateServerSelect();
  renderTree();
  renderPreview();
  renderPowerShellPreview();
}

/* ---------- ZIP generation ---------- */

function importTemplateZip(event) {
  templateZipFile = event.target.files[0] || null;

  if (templateZipFile) {
    setStatus(`Loaded local template: ${templateZipFile.name}`, "success");
  }
}

async function getTemplateZipBlob() {
  if (templateZipFile) {
    return templateZipFile;
  }

  const response = await fetch("./PrintDeployment.zip");

  if (!response.ok) {
    throw new Error("Could not load ./PrintDeployment.zip. Upload a local zip or place PrintDeployment.zip next to index.html.");
  }

  return await response.blob();
}

function replaceRegion(content, regionName, replacement) {
  const regex = new RegExp(`#region ${regionName}[\\s\\S]*?#endregion`, "m");
  return content.replace(regex, replacement);
}

function replaceVariableArray(content, variableName, replacement) {
  const regex = new RegExp(`\\$${variableName}\\s*=\\s*@\\([\\s\\S]*?\\)`, "m");
  return content.replace(regex, replacement);
}

async function downloadPackage() {
  try {
    const printers = allPrinters().filter(item => item.server && item.printer);

    if (data.length === 0 || printers.length === 0) {
      alert("Add at least one server and one printer.");
      return;
    }

    setStatus("Building package...", "");

    const zipBlob = await getTemplateZipBlob();
    const zip = await JSZip.loadAsync(zipBlob);

    const trustPath = "PrintDeployment/Files/TrustPrintServers.ps1";
    const installPath = "PrintDeployment/Files/User_InstallPrinter.ps1";
    const detectionPath = "PrintDeployment/detectionscript.ps1";

    const trustFile = zip.file(trustPath);
    const installFile = zip.file(installPath);
    const detectionFile = zip.file(detectionPath);

    if (!trustFile || !installFile || !detectionFile) {
      throw new Error("The ZIP does not contain the expected PrintDeployment folder structure.");
    }

    const trustContent = generateTrustPrintServersScript();

    let installContent = await installFile.async("string");
    installContent = replaceRegion(
      installContent,
      "Printers to install",
      `#region Printers to install
$printers = @(
${generatePrinterObjectsBlock()}
)
#endregion`
    );

    installContent = replaceRegion(
      installContent,
      "Approved print servers",
      `#region Approved print servers
# Keep this list aligned with the companion script / Intune policy that configures
# Point and Print approved servers.
#
# Important: use the same naming format as the policy:
# - Prefer FQDNs if the whitelist uses FQDNs
# - Avoid mixing short names and FQDNs
$ApprovedPrintServers = @(
${generateServersBlock('"')}
)
#endregion`
    );

    let detectionContent = await detectionFile.async("string");
    detectionContent = replaceVariableArray(
      detectionContent,
      "Printers",
      `$Printers = @(
${generatePrinterObjectsBlock()}
)`
    );

    zip.file(trustPath, trustContent);
    zip.file(installPath, installContent);
    zip.file(detectionPath, detectionContent);

    // Remove macOS metadata folders from the generated download, if present.
    Object.keys(zip.files)
      .filter(path => path.startsWith("__MACOSX/") || path.includes("/.DS_Store"))
      .forEach(path => zip.remove(path));

    const generatedBlob = await zip.generateAsync({ type: "blob" });

    const serverPart = uniqueServers()
      .slice(0, 3)
      .map(safeFileName)
      .filter(Boolean)
      .join("-");

    const filename = `PrintDeployment-${serverPart || "custom"}.zip`;

    const url = URL.createObjectURL(generatedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    setStatus(`Package generated: ${filename}`, "success");
  }
  catch (error) {
    console.error(error);
    setStatus(error.message, "danger");
  }
}

/* ---------- Actions ---------- */

function copyPreview() {
  if (!output.value.trim()) {
    alert("There is no preview to copy.");
    return;
  }

  navigator.clipboard.writeText(output.value);
  setStatus("Preview copied to clipboard.", "success");
}

/* ---------- Init ---------- */

serverName.addEventListener("keydown", event => {
  if (event.key === "Enter") addServer();
});

printerName.addEventListener("keydown", event => {
  if (event.key === "Enter") addPrinter();
});

refresh();

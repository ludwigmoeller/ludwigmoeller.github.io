const state = {
  servers: []
};

const serverNameInput = document.getElementById('serverName');
const printerNameInput = document.getElementById('printerName');
const serverSelect = document.getElementById('serverSelect');
const editor = document.getElementById('editor');
const visualizer = document.getElementById('visualizer');
const output = document.getElementById('generatedOutput');
const statusText = document.getElementById('status');

const TEMPLATE_ZIP_URL = './PrintDeployment-Template.zip';

function normalizeServer(value) {
  return value.trim().replace(/^\\+/, '').replace(/\\+$/, '');
}

function normalizePrinter(value) {
  return value.trim().replace(/^\\+/, '').replace(/\\+$/, '');
}

function psEscape(value) {
  return value.replace(/'/g, "''");
}

function safeFileName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'printer-deployment';
}

function getAllPrinters() {
  return state.servers.flatMap(server =>
    server.printers.map(printer => ({ server: server.name, printer }))
  );
}

function buildPrintServersBlock() {
  return state.servers
    .map(server => `    '${psEscape(server.name)}'`)
    .join(',\n');
}

function buildPrinterObjectsBlock() {
  return getAllPrinters()
    .map(item => `    [PSCustomObject]@{\n        Printer = '${psEscape(item.printer)}'\n        Server  = '${psEscape(item.server)}'\n    }`)
    .join(',\n');
}

function render() {
  renderServerSelect();
  renderEditor();
  renderVisualizer();
  renderOutput();
}

function renderServerSelect() {
  serverSelect.innerHTML = '';
  if (state.servers.length === 0) {
    const option = document.createElement('option');
    option.textContent = 'Add a server first';
    option.value = '';
    serverSelect.appendChild(option);
    serverSelect.disabled = true;
    return;
  }

  serverSelect.disabled = false;
  state.servers.forEach((server, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = server.name;
    serverSelect.appendChild(option);
  });
}

function renderEditor() {
  editor.innerHTML = '';
  if (state.servers.length === 0) {
    editor.innerHTML = '<p class="pd-empty">No servers added yet.</p>';
    return;
  }

  state.servers.forEach((server, serverIndex) => {
    const serverRow = document.createElement('div');
    serverRow.className = 'pd-server';
    serverRow.innerHTML = `<strong>🖨️ ${server.name}</strong><span class="pd-pill">${server.printers.length} printer(s)</span>`;

    const removeServerButton = document.createElement('button');
    removeServerButton.className = 'pd-remove';
    removeServerButton.type = 'button';
    removeServerButton.textContent = '×';
    removeServerButton.title = 'Remove server';
    removeServerButton.addEventListener('click', () => {
      state.servers.splice(serverIndex, 1);
      render();
    });
    serverRow.appendChild(removeServerButton);
    editor.appendChild(serverRow);

    if (server.printers.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'pd-printer pd-empty';
      empty.textContent = 'No printers on this server yet.';
      editor.appendChild(empty);
    }

    server.printers.forEach((printer, printerIndex) => {
      const printerRow = document.createElement('div');
      printerRow.className = 'pd-printer';
      printerRow.innerHTML = `<span>↳ ${printer}</span>`;

      const removePrinterButton = document.createElement('button');
      removePrinterButton.className = 'pd-remove';
      removePrinterButton.type = 'button';
      removePrinterButton.textContent = '×';
      removePrinterButton.title = 'Remove printer';
      removePrinterButton.addEventListener('click', () => {
        server.printers.splice(printerIndex, 1);
        render();
      });
      printerRow.appendChild(removePrinterButton);
      editor.appendChild(printerRow);
    });
  });
}

function renderVisualizer() {
  if (state.servers.length === 0) {
    visualizer.innerHTML = '<p class="pd-empty">Add servers and printers to preview the deployment.</p>';
    return;
  }

  const lines = state.servers.map(server => {
    const printers = server.printers.length
      ? server.printers.map(printer => `  └─ ${printer}`).join('\n')
      : '  └─ No printers yet';
    return `${server.name}\n${printers}`;
  });

  visualizer.innerHTML = `<pre class="pd-visualizer-tree">${escapeHtml(lines.join('\n'))}</pre>`;
}

function renderOutput() {
  const printServersBlock = buildPrintServersBlock();
  const printerObjectsBlock = buildPrinterObjectsBlock();

  output.value = `$PrintServers = @(\n${printServersBlock}\n)\n\n$Printers = @(\n${printerObjectsBlock}\n)`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function addServer() {
  const serverName = normalizeServer(serverNameInput.value);
  if (!serverName) return;

  if (state.servers.some(server => server.name.toLowerCase() === serverName.toLowerCase())) {
    setStatus(`Server already exists: ${serverName}`);
    return;
  }

  state.servers.push({ name: serverName, printers: [] });
  serverNameInput.value = '';
  setStatus('');
  render();
}

function addPrinter() {
  const serverIndex = Number(serverSelect.value);
  const printerName = normalizePrinter(printerNameInput.value);
  if (!printerName || Number.isNaN(serverIndex) || !state.servers[serverIndex]) return;

  const server = state.servers[serverIndex];
  if (server.printers.some(printer => printer.toLowerCase() === printerName.toLowerCase())) {
    setStatus(`Printer already exists on ${server.name}: ${printerName}`);
    return;
  }

  server.printers.push(printerName);
  printerNameInput.value = '';
  setStatus('');
  render();
}

function validateBeforeDownload() {
  if (state.servers.length === 0) return 'Add at least one print server.';
  if (getAllPrinters().length === 0) return 'Add at least one printer.';
  return '';
}

async function downloadPackage() {
  const validationMessage = validateBeforeDownload();
  if (validationMessage) {
    setStatus(validationMessage);
    return;
  }

  setStatus('Building package...');

  try {
    const response = await fetch(TEMPLATE_ZIP_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not download template zip: HTTP ${response.status}`);

    const zipBlob = await response.blob();
    const zip = await JSZip.loadAsync(zipBlob);

    await replaceInZip(zip, 'Files/TrustPrintServers.ps1', {
      '{{PRINT_SERVERS}}': buildPrintServersBlock()
    });

    await replaceInZip(zip, 'Files/User_InstallPrinter.ps1', {
      '{{PRINTER_OBJECTS}}': buildPrinterObjectsBlock(),
      '{{APPROVED_PRINT_SERVERS}}': buildPrintServersBlock()
    });

    await replaceInZip(zip, 'detectionscript.ps1', {
      '{{PRINTER_OBJECTS}}': buildPrinterObjectsBlock()
    });

    const configuredBlob = await zip.generateAsync({ type: 'blob' });
    const firstServer = safeFileName(state.servers[0].name);
    const firstPrinter = safeFileName(getAllPrinters()[0].printer);
    const fileName = `PrintDeployment-${firstServer}-${firstPrinter}.zip`;

    triggerDownload(configuredBlob, fileName);
    setStatus(`Downloaded ${fileName}`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Package generation failed.');
  }
}

async function replaceInZip(zip, path, replacements) {
  const file = zip.file(path);
  if (!file) throw new Error(`Template zip is missing ${path}`);

  let content = await file.async('string');
  Object.entries(replacements).forEach(([placeholder, value]) => {
    content = content.split(placeholder).join(value);
  });

  zip.file(path, content);
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyOutput() {
  await navigator.clipboard.writeText(output.value);
  setStatus('Copied to clipboard.');
}

function setStatus(message) {
  statusText.textContent = message;
}

document.getElementById('addServerBtn').addEventListener('click', addServer);
document.getElementById('addPrinterBtn').addEventListener('click', addPrinter);
document.getElementById('downloadBtn').addEventListener('click', downloadPackage);
document.getElementById('copyBtn').addEventListener('click', copyOutput);

serverNameInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') addServer();
});

printerNameInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') addPrinter();
});

render();

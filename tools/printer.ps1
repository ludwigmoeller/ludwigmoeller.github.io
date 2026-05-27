## Run this in the user context.

#region Printers to install
$printers = @(
    [PSCustomObject]@{
        Printer = "PRINTERNAME1"
        Server  = "print01.contoso.com"
    }
    [PSCustomObject]@{
        Printer = "PRINTERNAME2"
        Server  = "print01.contoso.com"
    }
)
#endregion

#region Approved print servers
# Keep this list aligned with the companion script / Intune policy that configures
# Point and Print approved servers.
#
# Important: use the same naming format as the policy:
# - Prefer FQDNs if the whitelist uses FQDNs
# - Avoid mixing short names and FQDNs
$ApprovedPrintServers = @(
    "print01.contoso.com"
)
#endregion

#region Functions
function Set-LocalPrinterConnection {
    <#
    .SYNOPSIS
        Installs a shared network printer connection for the current user.

    .PARAMETER Server
        FQDN or hostname of the approved print server.

    .PARAMETER PrinterName
        Shared printer name.
    #>

    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [string]$Server,

        [Parameter(Mandatory)]
        [string]$PrinterName
    )

    $server = $Server.Trim()
    $printerName = $PrinterName.Trim()
    $printerPath = "\\$server\$printerName"

    if ($ApprovedPrintServers -notcontains $server) {
        Write-Warning "Skipping $printerPath because '$server' is not in the approved print server list."
        return
    }

    try {
        Resolve-DnsName -Name $server -ErrorAction Stop | Out-Null
    }
    catch {
        Write-Warning "Skipping $printerPath because '$server' could not be resolved in DNS."
        return
    }

    if (Get-Printer -Name $printerPath -ErrorAction SilentlyContinue) {
        Write-Host "Printer $printerPath already installed." -ForegroundColor Green
        return
    }

    Write-Host "Installing $printerPath..." -ForegroundColor Green

    try {
        Add-Printer -ConnectionName $printerPath -ErrorAction Stop

        if (Get-Printer -Name $printerPath -ErrorAction SilentlyContinue) {
            Write-Host "$printerPath successfully installed." -ForegroundColor Green
        }
        else {
            Write-Warning "$printerPath was added, but could not be verified with Get-Printer."
        }
    }
    catch {
        Write-Warning "Failed to install $printerPath. $($_.Exception.Message)"
    }
}
#endregion

#region Install printers
foreach ($p in $printers) {
    Set-LocalPrinterConnection -Server $p.Server -PrinterName $p.Printer
}
#endregion

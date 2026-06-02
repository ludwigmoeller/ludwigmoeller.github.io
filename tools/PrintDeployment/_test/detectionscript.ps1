$ErrorActionPreference = "SilentlyContinue"

# ============================================================
# Detection variables
# ============================================================

$Printers = @(
    [PSCustomObject]@{
        Printer = "Cloudprint_farve"
        Server  = "p-rps01.bdo.local"
    },
    [PSCustomObject]@{
        Printer = "Cloudprint_sh"
        Server  = "p-rps01.bdo.local"
    }
)

$ConnectionsSubKey = "Printers\Connections"

# ============================================================
# Functions
# ============================================================

function Write-DetectLog {
    param(
        [string]$Message
    )

    Write-Output "[Printer Detection] $Message"
}

function Get-ActiveConsoleUser {
    try {
        $ComputerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
        return $ComputerSystem.UserName
    }
    catch {
        return $null
    }
}

function Get-UserSidFromAccount {
    param(
        [Parameter(Mandatory)]
        [string]$AccountName
    )

    try {
        $NTAccount = New-Object System.Security.Principal.NTAccount($AccountName)
        $SID = $NTAccount.Translate([System.Security.Principal.SecurityIdentifier])
        return $SID.Value
    }
    catch {
        return $null
    }
}

function Test-UserPrinterConnection {
    param(
        [Parameter(Mandatory)]
        [string]$UserSid,

        [Parameter(Mandatory)]
        [string]$Server,

        [Parameter(Mandatory)]
        [string]$Printer
    )

    $ConnectionsPath = "Registry::HKEY_USERS\$UserSid\$ConnectionsSubKey"
    $ExpectedSubKeyName = ",,$Server,$Printer"
    $ExpectedSubKeyPath = Join-Path -Path $ConnectionsPath -ChildPath $ExpectedSubKeyName

    if (-not (Test-Path -LiteralPath $ConnectionsPath)) {
        Write-DetectLog "Registry path not found: $ConnectionsPath"
        return $false
    }

    Write-DetectLog "Looking for printer connection key: $ExpectedSubKeyPath"

    if (Test-Path -LiteralPath $ExpectedSubKeyPath) {
        Write-DetectLog "Printer connection found: \\$Server\$Printer"
        return $true
    }

    Write-DetectLog "Printer connection not found: \\$Server\$Printer"
    return $false
}

# ============================================================
# Detection
# ============================================================

Write-DetectLog "Starting user-context shared printer connection detection."

$ActiveUser = Get-ActiveConsoleUser

if ([string]::IsNullOrWhiteSpace($ActiveUser)) {
    Write-DetectLog "No active console user detected."
    exit 1
}

Write-DetectLog "Active user detected: $ActiveUser"

$UserSid = Get-UserSidFromAccount -AccountName $ActiveUser

if ([string]::IsNullOrWhiteSpace($UserSid)) {
    Write-DetectLog "Unable to resolve SID for active user '$ActiveUser'."
    exit 1
}

Write-DetectLog "Resolved user SID: $UserSid"

$UserConnectionsPath = "Registry::HKEY_USERS\$UserSid\$ConnectionsSubKey"

if (-not (Test-Path -LiteralPath $UserConnectionsPath)) {
    Write-DetectLog "User printer connections registry path does not exist: $UserConnectionsPath"
    exit 1
}

foreach ($Printer in $Printers) {
    Write-DetectLog "Checking printer connection '\\$($Printer.Server)\$($Printer.Printer)' for active user '$ActiveUser'."

    $PrinterFound = Test-UserPrinterConnection `
        -UserSid $UserSid `
        -Server $Printer.Server `
        -Printer $Printer.Printer

    if (-not $PrinterFound) {
        Write-DetectLog "Detection failed. Missing printer connection: \\$($Printer.Server)\$($Printer.Printer)"
        exit 1
    }
}

Write-DetectLog "All expected shared printer connections detected for active user."
exit 0
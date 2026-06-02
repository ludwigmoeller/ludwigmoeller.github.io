# Run this in SYSTEM context

$PrintServers = @(
    'p-rps01.bdo.local','p-rps02.bdo.local'
)

$PointAndPrintPath        = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint'
$PackagePointAndPrintPath = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PackagePointAndPrint'
$PackageServerListPath    = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PackagePointAndPrint\ListofServers'

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
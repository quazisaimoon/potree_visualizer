$ROOT_DIR = Get-Location

$PCIMPORT_REL_PATH = "modular_tools\pc_import\internals"

$LASTOOLS_ARCHIVE = "LAStools_210720.zip"
$LASTOOLS_DIRNAME = "LAStools"
$POTREECONVERTER_ARCHIVE = "PotreeConverter_2.1_x64_windows.zip"
$POTREECONVERTER_DIRNAME = "PotreeConverter_2.1_x64_windows"

# Install LAStools
Write-Output "Installing LASTools"
Set-Location $PCIMPORT_REL_PATH

if (Test-Path -Path $LASTOOLS_DIRNAME -PathType Container) {
    Write-Output "$LASTOOLS_DIRNAME directory already exists."
} else {
    Expand-Archive -LiteralPath $LASTOOLS_ARCHIVE -DestinationPath ".\"
}

Set-Location $ROOT_DIR

# Install PotreeConverter
Write-Output "Installing PotreeConverter"
Set-Location $PCIMPORT_REL_PATH

if (Test-Path -Path $POTREECONVERTER_DIRNAME -PathType Container) {
    Write-Output "$POTREECONVERTER_DIRNAME directory already exists."
} else {
    Expand-Archive -LiteralPath $POTREECONVERTER_ARCHIVE -DestinationPath ".\"
}

Set-Location $ROOT_DIR

# Install node modules
Write-Output "Installing Node.js modules"
$npm_install = "npm install --silent"
Invoke-Expression $npm_install

# Install python packages
Write-Output "Installing Python packages"
$pip_upgrade = "python -m pip install --upgrade pip"
$install_typer = "pip install typer" 
$install_jinja2 = "pip install jinja2"
$install_open3d = "pip install open3d"
$install_laspy = "pip install laspy"
$install_opencv = "pip install opencv-python"

Invoke-Expression $pip_upgrade
Invoke-Expression $install_typer
Invoke-Expression $install_jinja2
Invoke-Expression $install_open3d
Invoke-Expression $install_laspy
Invoke-Expression $install_opencv


Write-Output "Installation completed!"

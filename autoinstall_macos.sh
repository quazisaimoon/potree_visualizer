PYTHON_VERSION=3.9
OS="Darwin"

ROOT_DIR=$(pwd)
PCIMPORT_PATH="modular_tools/pc_import/internals"

POTREECONVERTER_ARCHIVE="PotreeConverter-develop.zip"
POTREECONVERTER_DIR="PotreeConverter-develop"

LASTOOLS_ARCHIVE="LAStools-2.0.0.zip"
LASTOOLS_DIR="LAStools-2.0.0"


install_complete_msg() {
    GREEN='\033[1;32m'
    BOLD=$(tput bold)

    echo "${GREEN}${BOLD}Installation completed!"
}

has_correct_os() {
    if [ $(uname) != $1 ]; then
        echo "You're not using $1. Terminating!"
        exit
    fi
}

has_correct_python() {
    pyv=$(python$1 --version)

    if [ $? -ne 0 ]; then
        echo "You don't have Python $1 installed. Terminating!"
        exit
    fi
}

install_lastools() {
    cd "$PCIMPORT_PATH"

    if [ -d "$LASTOOLS_DIR" ]; then
        rm -r "$LASTOOLS_DIR"
    fi

    unzip "$LASTOOLS_ARCHIVE" -d .
    cd "$LASTOOLS_DIR"
    make

    cd $ROOT_DIR
}

install_potreeconverter() {
    cd "$PCIMPORT_PATH"

    if [ -d "$POTREECONVERTER_DIR" ]; then
        rm -r "$POTREECONVERTER_DIR"
    fi

    unzip "$POTREECONVERTER_ARCHIVE"
    cd "$POTREECONVERTER_DIR"
    mkdir build
    cd build
    cmake ../
    make

    cd $ROOT_DIR
}


# Check the OS and Python version
has_correct_os $OS
has_correct_python "$PYTHON_VERSION"

# Install Python modules
python$PYTHON_VERSION -m pip install open3d laspy typer jinja2 opencv-python flask flask-cors trimesh

# Install LAStools
install_lastools

# Install PotreeConverter
install_potreeconverter

# Install NPM modules
npm install


install_complete_msg
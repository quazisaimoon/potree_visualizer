# Pointcloud Import Tool
This script generates an HTML page based on a provided point cloud data.

The benefit of this script is that the user does not need to manually copy, paste and modify the HTML files to view a point cloud in Potree.

The user only needs to run the script with the relative path to the point cloud data and the HTML file is generated automatically into `user_pointclouds_html` directory which can then be viewed in Potree.

# Installation (Manual)
The script relies on the following Python modules:
* typer 
* jinja2

The following tools are also necessary for the script to work:
* [LAStools](https://rapidlasso.com/lastools/)
* [PotreeConverter](https://github.com/potree/PotreeConverter)
  
The archives of these tools are already provided in the `internals` directory. Depending on your OS, you should extract the correct archive and follow the installation instructions. The resulting extracted folder should be located in the `internals` directory.

Please do not rename the extracted archives or move them outside the `internals` directory, or the script will likely break.

## Python Modules
```sh
python3 -m pip install typer jinja2
```

## Install LAStools 
**For Linux and macOS:**
* Extract `LAStools-2.0.0.zip`
* go into its root directory and 
* run `make`.

**For Windows:**
* Extract `LAStools_210720.zip`. That's it.

## Install PotreeConverter
**For Linux and macOS:**
* If you're using Linux, extract `PotreeConverter-2.1.zip`, 
* if macOS, extract `PotreeConverter-develop.zip`. 
* Then go into its root directory, 
* create an empty folder `build` and 
* run `cmake ../` in it. 
* Then run `make`.

Note: `libtbb-dev` may be necessary to install on Ubuntu

**For Windows:**
* Extract `PotreeConverter_2.1_x64_windows.zip`. That's all.

Note: [Microsoft Visual C++ Redistributable packages](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) may be necessary to install.


# Usage
The point cloud (a directory containing point cloud data) the user wishes to import to Potree, can be located anywhere. 

The program will take in one required argument - the absolute path to the directory mentioned above. The argument can point to the file or it can be a directory that contains a valid point cloud file.

E.g.,

```sh
python3 pcimport.py /home/john/my_pcd
```

or

```sh
python3 pcimport.py /home/john/my_pcd/hello.ply
```

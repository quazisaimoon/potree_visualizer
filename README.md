# About
Potree is a WebGL-based point cloud renderer for large point clouds.

# Prerequisite Software
* [Python](https://www.python.org/) == 3.9
* [Node.js](http://nodejs.org/) >= 10
* [Microsoft Visual C++ Redistributable packages](https://docs.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170) (Windows)


# Install Instructions
## Windows
Before you begin, please make sure you have installed Python 3.9. Python 3.10 an above are not supported.

Run `installer_win.exe`. This is a wrapper of the PowerShell script by the same name. You can convert the Windows PowerShell script into a .exe with tools such as [PowerShell to EXE converter](https://ps2exe.azurewebsites.net/) or [PS2EXE](https://github.com/MScholtes/PS2EXE).

There will be quite a few pop-up boxes. Keep clicking the "OK" button until the installer finishes by stating "Installation completed!".

## Linux
```bash
sh autoinstall_linux.sh
```

Only Ubuntu 22.04 and 20.04 are supported Linux distributions. For others, manual installation of some dependencies may be required. Look at the source code of the installer script.

## macOS
```bash
sh autoinstall_macos.sh
```

# Run on Your Computer
```bash
cd potree_visualizer
```

Run the `start.py` script.

```python
python3 start.py
```

or, for Windows,

```python
python start.py
```

The script will automatically start the server and open the `user_htmls` directory in web browser.

If it's empty, it means no pointclouds have been imported. See next section.

# Import Point Clouds to Potree Format
Before point clouds can be viewed in Potree, an octree structure must be generated from a point cloud file such as a ply, las, or laz.

```bash
cd potree_visualizer/modular_tools/pc_import
```

```python
python3 pcimport.py <path_to_ply_las_laz>
```

This script will create a directory containing point cloud data in Potree format and an HTML file in potree_visualizer directory.

Go to http://localhost:1234/user_htmls to view the generated point cloud.
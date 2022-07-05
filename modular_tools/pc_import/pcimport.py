from typing import TextIO
from typing import Optional
from typing import Union

import time
import sys
import os
import subprocess
import shutil
from pathlib import Path

import numpy as np
import cv2
import laspy
import open3d as o3d
import typer
from jinja2 import Template
import rasterio


def get_potree_root() -> str:
    """
    Returns the absolute path of potree
    """
    potree_dir = os.path.join(os.getcwd())

    if "/modular_tools/pc_import" in potree_dir:
        potree_dir = os.getcwd()[: os.getcwd().find("modular_tools")]

    return potree_dir


# Defaults
POINTCLOUDS_DIR_NAME = "user_pointclouds"
HTMLS_DIR_NAME = "user_htmls"
PCIMPORT_INTERNALS_PATH = os.path.join(
    get_potree_root(), "modular_tools", "pc_import", "internals"
)

LAS2LAS_EXECUTABLE = os.path.join(
    PCIMPORT_INTERNALS_PATH, "LAStools-2.0.0", "bin", "./las2las"
)
POTREECONVERTER_EXECUTABLE = os.path.join(
    PCIMPORT_INTERNALS_PATH, "PotreeConverter-2.1", "build", "./PotreeConverter"
)


# Windows exceptions
if sys.platform.startswith("win"):
    LAS2LAS_EXECUTABLE = os.path.join(
        PCIMPORT_INTERNALS_PATH, "LAStools", "bin", "las2las.exe"
    )
    POTREECONVERTER_EXECUTABLE = os.path.join(
        PCIMPORT_INTERNALS_PATH,
        "PotreeConverter_2.1_x64_windows",
        "PotreeConverter.exe",
    )

# macOS exceptions
if sys.platform.startswith("darwin"):
    POTREECONVERTER_EXECUTABLE = os.path.join(
        PCIMPORT_INTERNALS_PATH, "PotreeConverter-develop", "build", "./PotreeConverter"
    )


html_template = Template(
    """<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="description" content="">
        <meta name="author" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>Potree Viewer</title>

        <link rel="stylesheet" type="text/css" href="../build/potree/potree.css">
        <link rel="stylesheet" type="text/css" href="../libs/jquery-ui/jquery-ui.min.css">
        <link rel="stylesheet" type="text/css" href="../libs/openlayers3/ol.css">
        <link rel="stylesheet" type="text/css" href="../libs/spectrum/spectrum.css">
        <link rel="stylesheet" type="text/css" href="../libs/jstree/themes/mixed/style.css">
    </head>

    <body>
        <script src="../libs/jquery/jquery-3.1.1.min.js"></script>
        <script src="../libs/spectrum/spectrum.js"></script>
        <script src="../libs/jquery-ui/jquery-ui.min.js"></script>

        <script src="../libs/other/BinaryHeap.js"></script>
        <script src="../libs/tween/tween.min.js"></script>
        <script src="../libs/d3/d3.js"></script>
        <script src="../libs/proj4/proj4.js"></script>
        <script src="../libs/openlayers3/ol.js"></script>
        <script src="../libs/i18next/i18next.js"></script>
        <script src="../libs/jstree/jstree.js"></script>
        <script src="../build/potree/potree.js"></script>
        <script src="../libs/plasio/js/laslaz.js"></script>

        <!-- INCLUDE ADDITIONAL DEPENDENCIES HERE -->
        <!-- INCLUDE SETTINGS HERE -->

        <div class="potree_container" style="position: absolute; width: 100%; height: 100%; left: 0px; top: 0px; ">
            <div id="potree_render_area" style="background-image: url('../build/potree/resources/images/background.jpg');"></div>
            <div id="potree_sidebar_container"> </div>
        </div>

        <script type="module">
            window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));

            viewer.setEDLEnabled(false);
            viewer.setFOV(60);
            viewer.setPointBudget(1_000_000);
            viewer.loadSettingsFromURL();
            viewer.setBackground("black");

            viewer.setDescription("{{name}}");

            viewer.loadGUI(() => {
                viewer.setLanguage('en');
                $("#menu_tools").next().show();
                $("#menu_clipping").next().show();
                viewer.toggleSidebar();
            });

            // Load and add point cloud to scene
            let url = "{{path}}";
            Potree.loadPointCloud(url, "{{name}}").then(e => {
                let pointcloud = e.pointcloud;
                let material = pointcloud.material;

                material.activeAttributeName = "rgba";
                material.minSize = 2;
                material.pointSizeType = Potree.PointSizeType.ADAPTIVE;

                viewer.scene.addPointCloud(pointcloud);
                viewer.fitToScreen();
            });
        </script>
      </body>
    </html>
"""
)


def get_path_base(path):
    """
    path/test.html --> /path.
    """
    return os.path.basename(path)


def create_dir_to_path(location, dir_name) -> None:
    """
    Creates an empty directory to a specified path.
    """
    if not dir_exists(os.path.join(location, dir_name)):
        os.mkdir(os.path.join(location, dir_name))


def dir_exists(path: str) -> bool:
    """
    Checks if a directory exists in specified path.
    """
    return Path(path).is_dir()


def dir_contains_file(
    location_to_search: str, to_look_for: Union[str, list]
) -> Optional[bool]:
    """
    Looks for a file (or multiple files in case of a list) in a path.
    """
    if isinstance(to_look_for, list):
        for file in to_look_for:
            if not os.path.isfile(os.path.join(location_to_search, file)):
                return False
        return True
    if isinstance(to_look_for, str):
        for file in os.listdir(location_to_search):
            if file.endswith(to_look_for):
                return True
    return None


def get_file_path(
    location_to_search: Union[str, Path], to_look_for: str
) -> Optional[str]:
    """
    Tries to find a file in a directory.
    Returns the full path of that file if found.
    """
    for file in os.listdir(location_to_search):
        if file.endswith(to_look_for):
            return os.path.join(location_to_search, file)
    return None


def copy_files_to_dir(src: Union[str, Path], dst: str) -> None:
    if not dir_exists(dst):
        os.mkdir(dst)

    for file in os.listdir(src):
        source = os.path.join(src, file)
        destination = os.path.join(dst, file)

        shutil.copyfile(source, destination)


def create_html(path, name, path_to_pcd):
    """
    Creates a HTML file to a specified location and fills it with a template
    """
    html_file = open(f"{os.path.join(path, name)}.html", "w")
    html_file.write(str(html_template.render(name=name, path=path_to_pcd)))
    html_file.close()


# TODO: temporary fix for windows (shell=True)
def use_lastools(src, dst):
    # example usage: las2las -i s1885565.laz -o out.las -sp83 OH_S -feet -elevation_feet
    if sys.platform.startswith("win"):
        subprocess.check_call(
            [LAS2LAS_EXECUTABLE, "-i", src, "-o", os.path.join(dst, "tmp.las")],
            shell=True,
        )
    else:
        subprocess.check_call(
            [LAS2LAS_EXECUTABLE, "-i", src, "-o", os.path.join(dst, "tmp.las")]
        )


# TODO: temporary fix for windows (shell=True)
def las_to_potree_format(src, dst):
    print("src coming to las2potree -------> ", src)
    print("dst coming to las2potree -------> ", dst)

    # example usage: PotreeConverter.exe <input> -o <outputDir>
    if sys.platform.startswith("win"):
        subprocess.check_call([POTREECONVERTER_EXECUTABLE, src, "-o", dst], shell=True)
    else:
        subprocess.check_call([POTREECONVERTER_EXECUTABLE, src, "-o", dst])


def laz_to_las(src, dst):
    use_lastools(src, dst)


def ply_to_las(src, dst) -> None:
    use_lastools(src, dst)


def tiff2las(src, dst, name):
    input_col = None

    dem = rasterio.open(src)
    elevations = np.array(dem.read(1, masked=True))

    goodpoints = np.where((elevations > -1e4))
    xy = dem.xy(goodpoints[0], goodpoints[1])
    zs = elevations[goodpoints]

    pcd = o3d.geometry.PointCloud()

    pcd.points = o3d.utility.Vector3dVector(np.asarray((xy[0], xy[1], zs)).T)

    if input_col != None:
        cols = cv2.imread(input_col, -1)
        goodpoints2 = (goodpoints[0], goodpoints[1])
        colv = cols[goodpoints2]
        pcd.colors = o3d.utility.Vector3dVector(
            np.asarray((colv, colv, colv)).T / 255.0
        )

    else:
        pcd.paint_uniform_color(np.asarray((0.5, 0.5, 0.5)))

        print("Estimating normals")

        t0 = time.time()
        pcd.estimate_normals()
        dirv = np.asarray((1, 1, 0.5))
        shading = np.einsum("ki,i->k", pcd.normals, dirv / np.linalg.norm(dirv))
        colv = np.clip(shading, 0, 1)
        pcd.colors = o3d.utility.Vector3dVector(np.asarray((colv, colv, colv)).T)

        print("Normals estimated", time.time() - t0)

    def pcd2las(pcd, lasname):

        xyz = np.asarray(pcd.points)
        offsets = np.min(xyz, axis=0)
        xyz -= offsets
        rgb = np.asarray(pcd.colors) * 255 * 256

        header = laspy.LasHeader(point_format=7, version="1.4")
        header.offsets = offsets
        header.scales = np.array([1, 1, 1])

        points = laspy.ScaleAwarePointRecord.zeros(len(xyz), header=header)
        points.X[:] = xyz[:, 0]
        points.Y[:] = xyz[:, 1]
        points.Z[:] = xyz[:, 2]

        if len(rgb[:, 0]) == len(points.red[:]):
            points.red[:] = rgb[:, 0]
            points.green[:] = rgb[:, 1]
            points.blue[:] = rgb[:, 2]

        points.return_number[:] = 1
        points.number_of_returns[:] = 1

        with laspy.open(lasname, mode="w", header=header) as writer:
            writer.write_points(points)

    pcd2las(pcd, os.path.join(dst, name))


def exit_with_error(error_msg) -> None:
    typer.echo(f"{error_msg} Exiting...")
    raise typer.Exit()


def is_src_valid(src):
    if os.path.isdir(src):
        return (
            dir_contains_file(src, ".ply")
            or dir_contains_file(src, ".las")
            or dir_contains_file(src, ".laz")
            or dir_contains_file(src, ".tif")
            or dir_contains_file(src, ".tiff")
        )

    if os.path.isfile(src):
        return (
            src.endswith(".ply")
            or src.endswith(".las")
            or src.endswith(".laz")
            or src.endswith(".tif")
            or src.endswith(".tiff")
        )


def main(src):
    if not is_src_valid(src):
        exit_with_error("Not a valid path.")

    # if the user passes in a directory, it'll get the full path of the file inside that dir
    if os.path.isdir(src):
        src = (
            get_file_path(src, ".las")
            or get_file_path(src, ".laz")
            or get_file_path(src, ".ply")
            or get_file_path(src, ".tif")
            or get_file_path(src, ".tiff")
        )

    # Path of the pointcloud (ply, las) file source directory
    parent_dir = Path(src).parent.absolute()

    # Get the path of the directory where imported pcd data will live, e.g.,
    # /Users/john/potree/user_pointclouds
    pointclouds_dir = os.path.join(get_potree_root(), POINTCLOUDS_DIR_NAME)
    htmls_dir = os.path.join(get_potree_root(), HTMLS_DIR_NAME)
    pcd_rel_path = f"../{POINTCLOUDS_DIR_NAME}/{Path(src).stem}/metadata.json"

    # Create directories where to put html's and pointcloud data
    if not dir_exists(pointclouds_dir):
        create_dir_to_path(get_potree_root(), POINTCLOUDS_DIR_NAME)

    if not dir_exists(htmls_dir):
        create_dir_to_path(get_potree_root(), HTMLS_DIR_NAME)

    if src.endswith(".tiff") or src.endswith(".tif"):
        # Convert TIFF --> LAS
        tiff2las(src, parent_dir, "tmp.las")

        # Convert LAS --> potree format
        las_to_potree_format(
            os.path.join(parent_dir, "tmp.las"), os.path.join(parent_dir, "tmp")
        )

        # Copy & remove tmp data
        source = os.path.join(parent_dir, "tmp")
        destination = os.path.join(pointclouds_dir, Path(src).stem)

        copy_files_to_dir(source, destination)
        # shutil.rmtree(os.path.join(parent_dir, "tmp"))

        # Create the HTML
        create_html(htmls_dir, Path(src).stem, pcd_rel_path)

    if src.endswith(".las"):
        # Convert LAS --> potree format
        las_to_potree_format(src, os.path.join(parent_dir, "tmp"))

        # Copy & remove tmp data
        source = os.path.join(parent_dir, "tmp")
        destination = os.path.join(pointclouds_dir, Path(src).stem)

        copy_files_to_dir(source, destination)
        shutil.rmtree(os.path.join(parent_dir, "tmp"))

        # Create the HTML
        create_html(htmls_dir, Path(src).stem, pcd_rel_path)

    if src.endswith(".laz"):
        # Convert LAZ --> LAS
        laz_to_las(src, parent_dir)

        # Convert LAS --> potree format
        las_to_potree_format(
            get_file_path(parent_dir, "tmp.las"), os.path.join(parent_dir, "tmp")
        )

        # Copy & remove tmp data
        copy_files_to_dir(
            os.path.join(parent_dir, "tmp"),
            os.path.join(pointclouds_dir, Path(src).stem),
        )

        shutil.rmtree(os.path.join(parent_dir, "tmp"))
        os.remove(os.path.join(parent_dir, "tmp.las"))

        # Create the HTML
        create_html(htmls_dir, Path(src).stem, pcd_rel_path)

    if src.endswith(".ply"):
        # Convert PLY --> LAS
        ply_to_las(src, parent_dir)

        # Convert LAS --> potree format
        las_to_potree_format(
            os.path.join(parent_dir, "tmp.las"), os.path.join(parent_dir, "tmp")
        )

        # # Copy & remove tmp data
        copy_files_to_dir(
            os.path.join(parent_dir, "tmp"),
            os.path.join(pointclouds_dir, Path(src).stem),
        )

        shutil.rmtree(os.path.join(parent_dir, "tmp"))
        os.remove(os.path.join(parent_dir, "tmp.las"))

        # # Create the HTML
        create_html(htmls_dir, Path(src).stem, pcd_rel_path)

    print(
        "Pointcloud octree data is at ------> ",
        os.path.join(pointclouds_dir, Path(src).stem),
    )
    print("Pointcloud HTML is at        ------> ", os.path.join(htmls_dir))
    return os.path.join(Path(src).stem)


if __name__ == "__main__":
    typer.run(main)

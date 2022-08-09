import * as THREE from "../../libs/three.js/build/three.module.js";
import { Annotation } from "../Annotation.js";
import { Measure } from "../utils/Measure.js";
import { Path } from "../utils/Path.js";
import { Area } from "../utils/Area.js";
import { Region } from "../utils/Region.js";
import { TagBox } from "../utils/Tag.js";
import { CameraAnimation } from "../modules/CameraAnimation/CameraAnimation.js";
import { Utils } from "../utils.js";
import { PointSizeType } from "../defines.js";

function loadPointcloudFolderStr(viewer, data) {
  data.pointcloudFolderStr.forEach((node) => {
    viewer.sidebar.tree.jstree(
      "create_node",
      node.parent,
      { text: node.text, id: node.id, state: node.state },
      "last",
      false,
      false
    );
  });
}

function loadPointCloud(viewer, data) {
  let loadMaterial = (target) => {
    if (data.material) {
      if (data.material.activeAttributeName != null) {
        target.activeAttributeName = data.material.activeAttributeName;
      }

      if (data.material.ranges != null) {
        for (let range of data.material.ranges) {
          if (range.name === "elevationRange") {
            target.elevationRange = range.value;
          } else if (range.name === "intensityRange") {
            target.intensityRange = range.value;
          } else {
            target.setRange(range.name, range.value);
          }
        }
      }

      if (data.material.size != null) {
        target.size = data.material.size;
      }

      if (data.material.minSize != null) {
        target.minSize = data.material.minSize;
      }

      if (data.material.pointSizeType != null) {
        target.pointSizeType = PointSizeType[data.material.pointSizeType];
      }

      if (data.material.matcap != null) {
        target.matcap = data.material.matcap;
      }
    } else if (data.activeAttributeName != null) {
      target.activeAttributeName = data.activeAttributeName;
    } else {
      // no material data
    }
  };

  const promise = new Promise((resolve) => {
    const names = viewer.scene.pointclouds.map((p) => p.name);
    const alreadyExists = names.includes(data.name);

    // if(alreadyExists){
    // 	resolve();
    // 	return;
    // }

    const tree = viewer.sidebar.tree.jstree();

    const flattened = tree.get_json()[0].children.flat();

    flattened.forEach((node) => {
      if (node.text === data.name) {
        tree.hide_node(node);
        tree.uncheck_node(node);
        tree.delete_node(node);
      }
    });

    Potree.loadPointCloud(data.url, data.name, (e) => {
      const { pointcloud } = e;
      pointcloud.parentId = data.parentId;
      (pointcloud.treeState = data.state),
        pointcloud.position.set(...data.position);
      pointcloud.rotation.set(...data.rotation);
      pointcloud.scale.set(...data.scale);

      loadMaterial(pointcloud.material);
      viewer.scene.addPointCloud(pointcloud);

      resolve(pointcloud);
    });
  });

  return promise;
}

function loadPaths(viewer, data, isPoi) {
  const duplicate = viewer.scene.paths.find((path) => path.uuid === data.uuid);
  if (duplicate) {
    return;
  }

  const path = new Path();
  path.metadatas = data.waypoints
    .filter((wp) => wp.metadata)
    .map((wp) => wp.metadata);
  path.uuid = data.uuid;
  path.name = data.name;
  (path.isActive = data.isActive), (path.showDistances = data.showDistances);
  path.showArea = data.showArea;
  path.closed = data.closed;
  path.showEdges = data.showEdges;

  if (data.isPOI === true) {
    path.maxMarkers = 1;
  }

  for (let i = 0; i < data.sphereIds.length && data.points.length; i++) {
    const pos = new THREE.Vector3(...data.points[i]);
    const sphereId = data.sphereIds[i];
    path.addMarker(pos, sphereId, data.isPOI);
  }

  viewer.scene.addPath(path);
}

function loadAreas(viewer, data) {
  const duplicate = viewer.scene.areas.find((area) => area.uuid === data.uuid);
  if (duplicate) {
    return;
  }

  const area = new Area();
  area.metadatas = data.waypoints
    .filter((wp) => wp.metadata)
    .map((wp) => wp.metadata);
  area.uuid = data.uuid;
  area.name = data.name;
  (area.isActive = data.isActive), (area.showDistances = data.showDistances);
  area.showArea = data.showArea;
  area.closed = data.closed;
  area.showEdges = data.showEdges;
  area.color = data.color && new THREE.Color().fromArray(data.color);

  for (let i = 0; i < data.sphereIds.length && data.points.length; i++) {
    const pos = new THREE.Vector3(...data.points[i]);
    const sphereId = data.sphereIds[i];
    area.addMarker(pos, sphereId);
  }

  viewer.scene.addArea(area);
}

function loadRegions(viewer, data) {
  const duplicate = viewer.scene.regions.find(
    (region) => region.uuid === data.uuid
  );

  if (duplicate) {
    return;
  }

  const region = new Region();

  region.name = data.name;
  region.uuid = data.uuid;
  region.isActive = data.isActive;
  region.metadata = data.metadata;

  if (data.metadata) {
    region.metadataLabel.setText(data.metadata.title);
    region.metadataLabel.visible = true;
  }

  if (data.metadata) {
    let color;
    let category = data.metadata.category;

    if (category === 0) {
      color = 0xffff00;
    }

    if (category === 1) {
      color = 0x00ff00;
    }

    if (category === 2) {
      color = 0xff0000;
    }

    region.color = new THREE.Color(color);
  }

  region.setWidth(data.width);

  for (const point of data.points) {
    region.addMarker(new THREE.Vector3(...point));
  }

  viewer.scene.addRegion(region);
}

function loadMeasurement(viewer, data) {
  const duplicate = viewer.scene.measurements.find(
    (measure) => measure.uuid === data.uuid
  );
  if (duplicate) {
    return;
  }

  const measure = new Measure();

  measure.uuid = data.uuid;
  measure.name = data.name;
  measure.showDistances = data.showDistances;
  measure.showCoordinates = data.showCoordinates;
  measure.showArea = data.showArea;
  measure.closed = data.closed;
  measure.showAngles = data.showAngles;
  measure.showHeight = data.showHeight;
  measure.showCircle = data.showCircle;
  measure.showAzimuth = data.showAzimuth;
  measure.showEdges = data.showEdges;
  // color

  // for(const point of data.points){
  // 	const pos = new THREE.Vector3(...point);
  // 	measure.addMarker(pos);
  // }

  for (let i = 0; i < data.sphereIds.length && data.points.length; i++) {
    const pos = new THREE.Vector3(...data.points[i]);
    const sphereId = data.sphereIds[i];
    measure.addMarker(pos, sphereId);
  }

  viewer.scene.addMeasurement(measure);
}

function loadVolume(viewer, data) {
  const duplicate = viewer.scene.volumes.find(
    (volume) => volume.uuid === data.uuid
  );
  if (duplicate) {
    return;
  }

  let volume = new Potree[data.type]();

  volume.uuid = data.uuid;
  volume.name = data.name;
  volume.position.set(...data.position);
  volume.rotation.set(...data.rotation);
  volume.scale.set(...data.scale);
  volume.visible = data.visible;
  volume.clip = data.clip;

  viewer.scene.addVolume(volume);
}

function loadTags(viewer, data) {
  const duplicate = viewer.scene.tags.find((tag) => tag.uuid === data.uuid);

  if (duplicate) {
    return;
  }

  const tag = new TagBox();

  tag.uuid = data.uuid;
  tag.name = data.name;
  tag.position.set(...data.position);
  tag.rotation.set(...data.rotation);
  tag.scale.set(...data.scale);
  tag.visible = data.visible;
  tag.clip = data.clip;
  tag.isActive = data.isActive;
  tag.volume = data.volume;
  tag.metadata = data.metadata;

  viewer.scene.addTag(tag);
}

function loadCameraAnimation(viewer, data) {
  const duplicate = viewer.scene.cameraAnimations.find(
    (a) => a.uuid === data.uuid
  );
  if (duplicate) {
    return;
  }

  const animation = new CameraAnimation(viewer);

  animation.uuid = data.uuid;
  animation.name = data.name;
  animation.duration = data.duration;
  animation.t = data.t;
  animation.curveType = data.curveType;
  animation.visible = data.visible;
  animation.controlPoints = [];

  for (const cpdata of data.controlPoints) {
    const cp = animation.createControlPoint();

    cp.position.set(...cpdata.position);
    cp.target.set(...cpdata.target);
  }

  viewer.scene.addCameraAnimation(animation);
}

function loadOrientedImages(viewer, images) {
  const { cameraParamsPath, imageParamsPath } = images;

  const duplicate = viewer.scene.orientedImages.find(
    (i) => i.imageParamsPath === imageParamsPath
  );
  if (duplicate) {
    return;
  }

  Potree.OrientedImageLoader.load(
    cameraParamsPath,
    imageParamsPath,
    viewer
  ).then((images) => {
    viewer.scene.addOrientedImages(images);
  });
}

function loadGeopackage(viewer, geopackage) {
  const path = geopackage.path;

  const duplicate = viewer.scene.geopackages.find((i) => i.path === path);
  if (duplicate) {
    return;
  }

  const projection = viewer.getProjection();

  proj4.defs("WGS84", "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs");
  proj4.defs("pointcloud", projection);
  const transform = proj4("WGS84", "pointcloud");
  const params = {
    transform: transform,
  };

  Potree.GeoPackageLoader.loadUrl(path, params).then((data) => {
    viewer.scene.addGeopackage(data);
  });
}

function loadSettings(viewer, data) {
  if (!data) {
    return;
  }

  viewer.setPointBudget(data.pointBudget);
  viewer.setFOV(data.fov);
  viewer.setEDLEnabled(data.edlEnabled);
  viewer.setEDLRadius(data.edlRadius);
  viewer.setEDLStrength(data.edlStrength);
  viewer.setBackground(data.background);
  viewer.setMinNodeSize(data.minNodeSize);
  viewer.setShowBoundingBox(data.showBoundingBoxes);
}

function loadView(viewer, view) {
  viewer.scene.view.position.set(...view.position);
  viewer.scene.view.lookAt(...view.target);
}

function loadAnnotationItem(item) {
  const annotation = new Annotation({
    position: item.position,
    title: item.title,
    cameraPosition: item.cameraPosition,
    cameraTarget: item.cameraTarget,
  });

  annotation.description = item.description;
  annotation.uuid = item.uuid;

  if (item.offset) {
    annotation.offset.set(...item.offset);
  }

  return annotation;
}

function loadAnnotations(viewer, data) {
  if (!data) {
    return;
  }

  const findDuplicate = (item) => {
    let duplicate = null;

    viewer.scene.annotations.traverse((a) => {
      if (a.uuid === item.uuid) {
        duplicate = a;
      }
    });

    return duplicate;
  };

  const traverse = (item, parent) => {
    const duplicate = findDuplicate(item);
    if (duplicate) {
      return;
    }

    const annotation = loadAnnotationItem(item);

    for (const childItem of item.children) {
      traverse(childItem, annotation);
    }

    parent.add(annotation);
  };

  for (const item of data) {
    traverse(item, viewer.scene.annotations);
  }
}

function loadProfile(viewer, data) {
  const { name, points } = data;

  const duplicate = viewer.scene.profiles.find(
    (profile) => profile.uuid === data.uuid
  );
  if (duplicate) {
    return;
  }

  let profile = new Potree.Profile();
  profile.name = name;
  profile.uuid = data.uuid;

  profile.setWidth(data.width);

  for (const point of points) {
    profile.addMarker(new THREE.Vector3(...point));
  }

  viewer.scene.addProfile(profile);
}

function loadClassification(viewer, data) {
  if (!data) {
    return;
  }

  const classifications = data;

  viewer.setClassifications(classifications);
}

function loadMissionSpecs(viewer, data) {
  console.log(viewer);
  if (!data) {
    return;
  }

  // Grab DOM elements
  const titleInput = document.getElementById("mission_spec_title");
  const descriptionInput = document.getElementById("mission_spec_description");
  const startDateInput = document.getElementById("mission_spec_start_date");
  const startTimeInput = document.getElementById("mission_spec_start_time");

  // Set mission specs data to input fields (visually) as well as to the missionSpecs object
  titleInput.value = data.missionTitle;
  viewer.missionSpecs.missionTitle = data.missionTitle;

  descriptionInput.value = data.missionDescription;
  viewer.missionSpecs.missionDescription = data.missionDescription;

  startDateInput.value = data.missionStartDate;
  viewer.missionSpecs.missionStartDate = data.missionStartDate;

  startTimeInput.value = data.missionStartTime;
  viewer.missionSpecs.missionStartTime = data.missionStartTime;
}

export async function loadProject(viewer, data) {
  if (data.type !== "Potree") {
    console.error("not a valid Potree project");
    return;
  }

  loadPointcloudFolderStr(viewer, data);

  loadSettings(viewer, data.settings);

  loadView(viewer, data.view);

  const pointcloudPromises = [];
  for (const pointcloud of data.pointclouds) {
    const promise = loadPointCloud(viewer, pointcloud);
    pointcloudPromises.push(promise);
  }

  // PATH
  for (const path of data.paths) {
    let isPoi = false;
    loadPaths(viewer, path, isPoi);
  }

  // POI
  for (const poi of data.pois) {
    let isPoi = true;
    loadPaths(viewer, poi, isPoi);
  }

  for (const area of data.areas) {
    loadAreas(viewer, area);
  }

  for (const region of data.regions) {
    loadRegions(viewer, region);
  }

  for (const measure of data.measurements) {
    loadMeasurement(viewer, measure);
  }

  for (const volume of data.volumes) {
    loadVolume(viewer, volume);
  }

  for (const tag of data.tags) {
    loadTags(viewer, tag);
  }

  for (const animation of data.cameraAnimations) {
    loadCameraAnimation(viewer, animation);
  }

  for (const profile of data.profiles) {
    loadProfile(viewer, profile);
  }

  if (data.orientedImages) {
    for (const images of data.orientedImages) {
      loadOrientedImages(viewer, images);
    }
  }

  loadAnnotations(viewer, data.annotations);

  loadClassification(viewer, data.classification);

  loadMissionSpecs(viewer, data);

  // need to load at least one point cloud that defines the scene projection,
  // before we can load stuff in other projections such as geopackages
  //await Promise.any(pointcloudPromises); // (not yet supported)
  Utils.waitAny(pointcloudPromises).then(() => {
    if (data.geopackages) {
      for (const geopackage of data.geopackages) {
        loadGeopackage(viewer, geopackage);
      }
    }
  });

  await Promise.all(pointcloudPromises);
}

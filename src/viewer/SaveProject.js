function createPointcloudData(pointcloud) {
  const tree = viewer.sidebar.tree;
  const sidebarNodes = viewer.sidebar.tree.jstree(true).get_json();
  const pointcloudNodeIdx = sidebarNodes.findIndex(
    (node) => node.id === "pointclouds"
  );
  const pointcloudNode = sidebarNodes[pointcloudNodeIdx];

  // Find nodes with data --> if any of their uuid equals to the pointcloud.uuid --> get its parentId and attach it.
  let parentId = null;
  let nodeId = null;

  const findMatchingUuid = (element) => {
    const { id, data } = element;

    if (data && data.uuid === pointcloud.uuid) {
      parentId = tree.jstree(true).get_parent(id);
      nodeId = id;
    }
    element.children && element.children.forEach(findMatchingUuid);
  };

  pointcloudNode.children.forEach(findMatchingUuid);

  let material = pointcloud.material;
  let ranges = [];

  for (let [name, value] of material.ranges) {
    ranges.push({
      name: name,
      value: value,
    });
  }

  if (typeof material.elevationRange[0] === "number") {
    ranges.push({
      name: "elevationRange",
      value: material.elevationRange,
    });
  }
  if (typeof material.intensityRange[0] === "number") {
    ranges.push({
      name: "intensityRange",
      value: material.intensityRange,
    });
  }

  let pointSizeTypeName = Object.entries(Potree.PointSizeType).find(
    (e) => e[1] === material.pointSizeType
  )[0];

  let jsonMaterial = {
    activeAttributeName: material.activeAttributeName,
    ranges: ranges,
    size: material.size,
    minSize: material.minSize,
    pointSizeType: pointSizeTypeName,
    matcap: material.matcap,
  };

  const pcdata = {
    name: pointcloud.name,
    nodeId: nodeId,
    parentId: parentId,
    state: tree.jstree(true).get_json(nodeId).state,
    url: pointcloud.pcoGeometry.url,
    position: pointcloud.position.toArray(),
    rotation: pointcloud.rotation.toArray(),
    scale: pointcloud.scale.toArray(),
    material: jsonMaterial,
  };

  return pcdata;
}

function createProfileData(profile) {
  const data = {
    uuid: profile.uuid,
    name: profile.name,
    points: profile.points.map((p) => p.toArray()),
    height: profile.height,
    width: profile.width,
  };

  return data;
}

function createRegionData(region) {
  const data = {
    name: region.name,
    isActive: region.visible,
    waypoints: region.spheres.map((s) => {
      return {
        location: { x: s.position.x, y: s.position.y, z: s.position.z },
        sphereId: s.uuid,
      };
    }),
    metadata: region.metadata,
    width: region.width,
    uuid: region.uuid,
    points: region.points.map((p) => p.toArray()),
    // height: region.height,
  };

  return data;
}

function createVolumeData(volume) {
  const data = {
    uuid: volume.uuid,
    type: volume.constructor.name,
    name: volume.name,
    position: volume.position.toArray(),
    rotation: volume.rotation.toArray(),
    scale: volume.scale.toArray(),
    visible: volume.visible,
    clip: volume.clip,
  };

  return data;
}

function createTagData(tag) {
  const data = {
    name: tag.name,
    isActive: tag.visible,
    position: tag.position.toArray(),
    scale: tag.scale.toArray(),
    volume: tag.getVolume(),
    metadata: tag.metadata,
    type: tag.constructor.name,
    rotation: tag.rotation.toArray(),
    visible: tag.visible,
    clip: tag.clip,
    uuid: tag.uuid,
  };

  return data;
}

function createCameraAnimationData(animation) {
  const controlPoints = animation.controlPoints.map((cp) => {
    const cpdata = {
      position: cp.position.toArray(),
      target: cp.target.toArray(),
    };

    return cpdata;
  });

  const data = {
    uuid: animation.uuid,
    name: animation.name,
    duration: animation.duration,
    t: animation.t,
    curveType: animation.curveType,
    visible: animation.visible,
    controlPoints: controlPoints,
  };

  return data;
}

function createPathData(instance) {
  let data = {
    name: instance.name,
    isActive: instance.visible,
    waypoints: instance.spheres.map((s) => {
      return {
        location: { x: s.position.x, y: s.position.y, z: s.position.z },
        sphereId: s.uuid,
        metadata: instance.metadatas.filter((m) => m.sphereId === s.uuid)[0],
      };
    }),
    uuid: instance.uuid,
    sphereIds: instance.spheres.map((s) => s.uuid),
    showDistances: instance.showDistances,
    showArea: instance.showArea,
    closed: instance.closed,
    showEdges: instance.showEdges,
    color: instance.color.toArray(),
    points: instance.points.map((p) => p.position.toArray()),
    isPOI: false,
  };

  return data;
}

function createPOIData(instance) {
  let data = {
    name: instance.name,
    isActive: instance.visible,
    waypoints: instance.spheres.map((s) => {
      return {
        location: { x: s.position.x, y: s.position.y, z: s.position.z },
        sphereId: s.uuid,
        metadata: instance.metadatas.filter((m) => m.sphereId === s.uuid)[0],
      };
    }),
    uuid: instance.uuid,
    sphereIds: instance.spheres.map((s) => s.uuid),
    showDistances: instance.showDistances,
    showArea: instance.showArea,
    closed: instance.closed,
    showEdges: instance.showEdges,
    color: instance.color.toArray(),
    points: instance.points.map((p) => p.position.toArray()),
    isPOI: true,
  };

  return data;
}

function createMeasurementData(measurement) {
  const data = {
    sphereIds: measurement.spheres.map((s) => s.uuid),
    uuid: measurement.uuid,
    name: measurement.name,
    points: measurement.points.map((p) => p.position.toArray()),
    showDistances: measurement.showDistances,
    showCoordinates: measurement.showCoordinates,
    showArea: measurement.showArea,
    closed: measurement.closed,
    showAngles: measurement.showAngles,
    showHeight: measurement.showHeight,
    showCircle: measurement.showCircle,
    showAzimuth: measurement.showAzimuth,
    showEdges: measurement.showEdges,
    color: measurement.color.toArray(),
  };

  return data;
}

function createOrientedImagesData(images) {
  const data = {
    cameraParamsPath: images.cameraParamsPath,
    imageParamsPath: images.imageParamsPath,
  };

  return data;
}

function createGeopackageData(geopackage) {
  const data = {
    path: geopackage.path,
  };

  return data;
}

function createAnnotationData(annotation) {
  const data = {
    uuid: annotation.uuid,
    title: annotation.title.toString(),
    description: annotation.description,
    position: annotation.position.toArray(),
    offset: annotation.offset.toArray(),
    children: [],
  };

  if (annotation.cameraPosition) {
    data.cameraPosition = annotation.cameraPosition.toArray();
  }

  if (annotation.cameraTarget) {
    data.cameraTarget = annotation.cameraTarget.toArray();
  }

  if (typeof annotation.radius !== "undefined") {
    data.radius = annotation.radius;
  }

  return data;
}

function createAnnotationsData(viewer) {
  const map = new Map();

  viewer.scene.annotations.traverseDescendants((a) => {
    const aData = createAnnotationData(a);

    map.set(a, aData);
  });

  for (const [annotation, data] of map) {
    for (const child of annotation.children) {
      const childData = map.get(child);
      data.children.push(childData);
    }
  }

  const annotations = viewer.scene.annotations.children.map((a) => map.get(a));

  return annotations;
}

function createSettingsData(viewer) {
  return {
    pointBudget: viewer.getPointBudget(),
    fov: viewer.getFOV(),
    edlEnabled: viewer.getEDLEnabled(),
    edlRadius: viewer.getEDLRadius(),
    edlStrength: viewer.getEDLStrength(),
    background: viewer.getBackground(),
    minNodeSize: viewer.getMinNodeSize(),
    showBoundingBoxes: viewer.getShowBoundingBox(),
  };
}

function createSceneContentData(viewer) {
  const data = [];

  const potreeObjects = [];

  viewer.scene.scene.traverse((node) => {
    if (node.potree) {
      potreeObjects.push(node);
    }
  });

  for (const object of potreeObjects) {
    if (object.potree.file) {
      const saveObject = {
        file: object.potree.file,
      };

      data.push(saveObject);
    }
  }

  return data;
}

function createViewData(viewer) {
  const view = viewer.scene.view;

  const data = {
    position: view.position.toArray(),
    target: view.getPivot().toArray(),
  };

  return data;
}

function createClassificationData(viewer) {
  const classifications = viewer.classifications;

  const data = classifications;

  return data;
}

function createPointcloudFolderStr(viewer) {
  // Get ref to the folder str in sidebar
  const tree = viewer.sidebar.tree;

  // We're only interested in the folder structure of 'Point Clouds'
  const sidebarNodes = tree.jstree(true).get_json();
  const pointcloudNodeIdx = sidebarNodes.findIndex(
    (node) => node.id === "pointclouds"
  );
  const pointcloudNode = sidebarNodes[pointcloudNodeIdx];

  const nodes = [];

  const createNodeObj = (element) => {
    const { id, text, state, data } = element;

    // If object is empty, i.e., the data is empty, then it's a folder. We only want to push folder nodes.
    // We only need certain fields from the objects in children array.
    if (
      data &&
      Object.keys(data).length === 0 &&
      Object.getPrototypeOf(data) === Object.prototype
    ) {
      nodes.push({
        id,
        parent: tree.jstree(true).get_parent(id),
        text,
        state,
      });
    }
    // 'children' property is recursive.
    element.children && element.children.forEach(createNodeObj);
  };
  pointcloudNode.children.forEach(createNodeObj);

  return nodes;
}

export function saveProject(viewer) {
  const scene = viewer.scene;

  let time = null;

  if (
    viewer.missionSpecs.missionStartDate &&
    viewer.missionSpecs.missionStartTime
  ) {
    time = new Date(
      `${viewer.missionSpecs.missionStartDate} ${viewer.missionSpecs.missionStartTime}`
    ).toISOString();
  }

  const data = {
    type: "Potree",
    version: 1.7,
    missionTitle: viewer.missionSpecs.missionTitle,
    missionDescription: viewer.missionSpecs.missionDescription,
    missionStartDate: viewer.missionSpecs.missionStartDate,
    missionStartTime: viewer.missionSpecs.missionStartTime,
    missionStartTimeISO: time,
    settings: createSettingsData(viewer),
    view: createViewData(viewer),
    classification: createClassificationData(viewer),
    pointcloudFolderStr: createPointcloudFolderStr(viewer),
    pointclouds: scene.pointclouds
      .map(createPointcloudData)
      .filter((pcd) => pcd.nodeId),
    paths: scene.paths
      .filter((path) => path.maxMarkers !== 1)
      .map(createPathData),
    areas: scene.areas.map(createPathData),
    regions: scene.regions.map(createRegionData),
    pois: scene.paths
      .filter((path) => path.maxMarkers === 1)
      .map(createPOIData),
    measurements: scene.measurements.map(createMeasurementData),
    volumes: scene.volumes.map(createVolumeData),
    tags: scene.tags.map(createTagData),
    cameraAnimations: scene.cameraAnimations.map(createCameraAnimationData),
    profiles: scene.profiles.map(createProfileData),
    annotations: createAnnotationsData(viewer),
    orientedImages: scene.orientedImages.map(createOrientedImagesData),
    geopackages: scene.geopackages.map(createGeopackageData),
  };

  return data;
}

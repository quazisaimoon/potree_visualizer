import * as THREE from "../../libs/three.js/build/three.module.js";
import { Path } from "./Path.js";
import { Utils } from "../utils.js";
import { CameraMode } from "../defines.js";
import { EventDispatcher } from "../EventDispatcher.js";

export class PathTool extends EventDispatcher {
  constructor(viewer) {
    super();

    this.viewer = viewer;
    this.renderer = viewer.renderer;

    this.addEventListener("start_inserting_path", (e) => {
      this.viewer.dispatchEvent({
        type: "cancel_insertions",
      });
    });

    this.showLabels = true;
    this.scene = new THREE.Scene();
    this.scene.name = "scene_path";
    this.light = new THREE.PointLight(0xffffff, 1.0);
    this.scene.add(this.light);

    this.viewer.inputHandler.registerInteractiveScene(this.scene);

    this.onRemove = (e) => {
      this.scene.remove(e.path);
    };
    this.onAdd = (e) => {
      this.scene.add(e.path);
    };

    for (let path of viewer.scene.paths) {
      this.onAdd({ path: path });
    }

    viewer.addEventListener("update", this.update.bind(this));
    viewer.addEventListener(
      "render.pass.perspective_overlay",
      this.render.bind(this)
    );
    viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

    viewer.scene.addEventListener("path_added", this.onAdd);
    viewer.scene.addEventListener("path_removed", this.onRemove);
  }

  onSceneChange(e) {
    if (e.oldScene) {
      e.oldScene.removeEventListener("path_added", this.onAdd);
      e.oldScene.removeEventListener("path_removed", this.onRemove);
    }

    e.scene.addEventListener("path_added", this.onAdd);
    e.scene.addEventListener("path_removed", this.onRemove);
  }

  startInsertion(args = {}) {
    let domElement = this.viewer.renderer.domElement;

    let path = new Path();

    this.dispatchEvent({
      type: "start_inserting_path",
      path: path,
    });

    const pick = (defaul, alternative) => {
      if (defaul != null) {
        return defaul;
      } else {
        return alternative;
      }
    };

    console.log("path ---> ", path);

    path.showDistances =
      args.showDistances === null ? true : args.showDistances;
    path.showArea = pick(args.showArea, false);
    path.showEdges = pick(args.showEdges, true);
    path.closed = pick(args.closed, false);
    path.maxMarkers = pick(args.maxMarkers, Infinity);
    path.name = args.name || Utils.generateName("P");

    this.scene.add(path);

    let cancel = {
      removeLastMarker: path.maxMarkers > 3,
      callback: null,
    };

    let insertionCallback = (e) => {
      if (e.button === THREE.MOUSE.LEFT) {
        path.addMarker(path.points[path.points.length - 1].position.clone());

        if (path.points.length >= path.maxMarkers) {
          cancel.callback();
        }

        this.viewer.inputHandler.startDragging(
          path.spheres[path.spheres.length - 1]
        );
      } else if (e.button === THREE.MOUSE.RIGHT) {
        cancel.callback();
      }
    };

    cancel.callback = (e) => {
      if (cancel.removeLastMarker) {
        path.removeMarker(path.points.length - 1);
      }
      domElement.removeEventListener("mouseup", insertionCallback, false);
      this.viewer.removeEventListener("cancel_insertions", cancel.callback);
    };

    if (path.maxMarkers > 1) {
      this.viewer.addEventListener("cancel_insertions", cancel.callback);
      domElement.addEventListener("mouseup", insertionCallback, false);
    }

    path.addMarker(new THREE.Vector3(0, 0, 0));
    this.viewer.inputHandler.startDragging(
      path.spheres[path.spheres.length - 1]
    );

    this.viewer.scene.addPath(path);

    return path;
  }

  update() {
    let camera = this.viewer.scene.getActiveCamera();
    let domElement = this.renderer.domElement;
    let paths = this.viewer.scene.paths;

    const renderAreaSize = this.renderer.getSize(new THREE.Vector2());
    let clientWidth = renderAreaSize.width;
    let clientHeight = renderAreaSize.height;

    this.light.position.copy(camera.position);

    // make size independant of distance
    for (let path of paths) {
      path.lengthUnit = this.viewer.lengthUnit;
      path.lengthUnitDisplay = this.viewer.lengthUnitDisplay;
      path.update();

      // spheres
      for (let sphere of path.spheres) {
        let distance = camera.position.distanceTo(
          sphere.getWorldPosition(new THREE.Vector3())
        );
        let pr = Utils.projectedRadius(
          1,
          camera,
          distance,
          clientWidth,
          clientHeight
        );
        let scale = 15 / pr;
        sphere.scale.set(scale, scale, scale);
      }

      // metadata labels
      for (let label of path.metadataLabels) {
        let distance = camera.position.distanceTo(
          label.getWorldPosition(new THREE.Vector3())
        );
        let pr = Utils.projectedRadius(
          1,
          camera,
          distance,
          clientWidth,
          clientHeight
        );
        let scale = 70 / pr;

        const labelPos = label.position.clone();
        labelPos.add(new THREE.Vector3(0, 0, scale));
        label.position.copy(labelPos);

        label.scale.set(scale, scale, scale);
      }

      // { // name label
      // 	const label = path.pathNameLabel;
      // 	let distance = camera.position.distanceTo(label.getWorldPosition(new THREE.Vector3()));
      // 	let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
      // 	let scale = (68 / pr);

      // 	const labelPos = label.position.clone()

      // 	labelPos.sub(new THREE.Vector3(0, pr * 10, 0))

      // 	if (path.points.length === 1) {
      // 		labelPos.sub(new THREE.Vector3(scale / 3, 0, 0))
      // 	} else {
      // 		labelPos.add(new THREE.Vector3(0, 0, scale))
      // 	}

      // 	label.position.copy(labelPos);
      // 	label.scale.set(scale, scale, scale);

      // }

      {
        // edges
        const materials = [...path.edges.map((e) => e.material)];

        for (const material of materials) {
          material.resolution.set(clientWidth, clientHeight);
        }
      }

      if (!this.showMetadataLabels) {
        for (const label of path.metadataLabels) {
          label.visible = false;
        }
      }

      // if(!this.showNameLabels){
      // 	path.pathNameLabel.visible = false;
      // }
    }
  }

  render() {
    this.viewer.renderer.render(
      this.scene,
      this.viewer.scene.getActiveCamera()
    );
  }
}

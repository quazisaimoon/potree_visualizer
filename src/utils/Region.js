import * as THREE from "../../libs/three.js/build/three.module.js";
import { Utils } from "../utils.js";
import { ZoneCategory } from "../defines.js";

export class Region extends THREE.Object3D {
  constructor() {
    super();

    this.constructor.counter =
      this.constructor.counter === undefined ? 0 : this.constructor.counter + 1;
    this.points = [];
    this.spheres = [];
    this.edges = [];
    this.boxes = [];
    this.width = 1;
    this.height = 20;
    this._modifiable = true;
    this.color = new THREE.Color(0xffffff);

    this.sphereGeometry = new THREE.BoxGeometry(0.7, 0.2, 0.2);

    this.sphereMaterial = new THREE.MeshLambertMaterial({
      color: this.getZoneCategoryColor(),
      depthTest: false,
      depthWrite: false,
    });

    this.lineMaterial = new THREE.LineBasicMaterial({
      color: this.color,
      vertexColors: THREE.VertexColors,
      linewidth: 2,
      transparent: true,
      opacity: 1,
    });

    this.pressedKeys = [];
    this.metadata = null;

    this.metadataLabel = Utils.createMetadataLabel("");
    this.add(this.metadataLabel);

    window.addEventListener(
      "keydown",
      (e) => !this.pressedKeys.includes(e.code) && this.pressedKeys.push(e.code)
    );
    window.addEventListener(
      "keyup",
      (e) =>
        (this.pressedKeys = this.pressedKeys.filter((key) => key !== e.code))
    );
  }

  openModal(e) {
    let dataExists = this.metadata !== null;

    const modal = document.createElement("div");
    modal.innerHTML = `
			<form id="meta_form" class="meta_modal_wrapper">
				<div class="meta_modal_container">
					<h2>Region of Interest</h2>
					<label for="meta_title">Title:</label>
					<input 
						value="${dataExists ? this.metadata.title : ""}"
						type="text" 
						id="meta_title" 
						class="form_input"
						name="title">

					<label for="meta_description">Description:</label>			
					<textarea
						rows="2"
						id="meta_description" 
						class="form_input form_textarea" 
						name="description">${dataExists ? this.metadata.description : ""}</textarea>

					<label for="meta_task">Task:</label>			
					<textarea
						rows="4"
						id="meta_task" 
						class="form_input form_textarea" 
						name="task">${dataExists ? this.metadata.task : ""}</textarea>

					<label for="meta_category">Choose a category:</label>
					<select id="meta_category" class="form_input" name="category">
						<option ${
              dataExists && this.metadata.category === ZoneCategory.GO
                ? "selected"
                : null
            } value="${ZoneCategory.GO}">Go Zone</option>
						<option ${
              dataExists && this.metadata.category === ZoneCategory.NOGO
                ? "selected"
                : null
            } value="${ZoneCategory.NOGO}">No-Go Zone</option>
					</select>
				</div>
				<div class="meta_modal_btn_container">
					<div>
						<button 
							id="meta_modal_submit" 
							class="ui-button modal_btn" 
							type="submit"
						>${dataExists ? "Update" : "Submit"}
						</button>
						<button 
							id="meta_modal_cancel" 
							class="ui-button modal_btn"
						>Cancel
						</button>
					</div>
					${
            dataExists
              ? `
						<button
							id="meta_modal_delete"
							class="ui-button modal_btn"
						>Delete
						</button>`
              : ""
          }
				</div>
			</form>`;

    document.getElementById("potree_description").appendChild(modal);
    // document.getElementById("scene_object_metadata").appendChild(modal);

    document
      .getElementById("meta_form")
      .addEventListener("submit", (e) => this.submitMetadata(e, modal));
    document
      .getElementById("meta_modal_cancel")
      .addEventListener("click", () => this.closeModal(modal));
    dataExists &&
      document
        .getElementById("meta_modal_delete")
        .addEventListener("click", () => this.deleteMetadata(modal));
  }

  closeModal(modal) {
    modal.remove();
  }

  getZoneCategoryColor() {
    if (!this.metadata) {
      return 0xffff00;
    } else if (this.metadata.category === ZoneCategory.NONE) {
      return 0xffff00;
    } else if (this.metadata.category === ZoneCategory.GO) {
      return 0x00ff00;
    } else if (this.metadata.category === ZoneCategory.NOGO) {
      return 0xff0000;
    } else {
      return 0xffff00;
    }
  }

  submitMetadata(e, modal) {
    // This obj will be set to be metadata
    const values = {
      title: document.getElementById("meta_title").value,
      description: document.getElementById("meta_description").value,
      task: document.getElementById("meta_task").value,
      category: parseInt(document.getElementById("meta_category").value),
      sphereId: e.target.uuid,
    };

    // Require at least the title before "submitting"
    if (values.title) {
      // Update metadata instance variable
      this.metadata = values;

      // Update label
      this.metadataLabel.setText(this.metadata.title);
      this.metadataLabel.visible = true;

      // Zone category
      this.setZoneCategory(this.metadata.category);

      // Adds the category to all of the boxes
      this.boxes.forEach((box) => {
        box.zoneCategory = this.metadata.category;
      });

      // Spheres color
      this.setSpheresColor(this.spheres, this.getZoneCategoryColor());

      // Close the
      this.closeModal(modal);
    }

    e.preventDefault();
  }

  deleteMetadata(modal) {
    this.metadata = null;
    this.metadataLabel.visible = false;
    this.setZoneCategory(ZoneCategory.NONE);
    this.setSpheresColor(this.spheres, this.getZoneCategoryColor());
    this.closeModal(modal);
  }

  getSegments() {
    let segments = [];

    for (let i = 0; i < this.points.length - 1; i++) {
      let start = this.points[i].clone();
      let end = this.points[i + 1].clone();
      segments.push({ start: start, end: end });
    }

    return segments;
  }

  getSegmentMatrices() {
    let segments = this.getSegments();
    let matrices = [];

    for (let segment of segments) {
      let { start, end } = segment;

      let box = new THREE.Object3D();

      let length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
      box.scale.set(length, 10000, this.width);
      box.up.set(0, 0, 1);

      let center = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);
      let diff = new THREE.Vector3().subVectors(end, start);
      let target = new THREE.Vector3(diff.y, -diff.x, 0);

      box.position.set(0, 0, 0);
      box.lookAt(target);
      box.position.copy(center);

      box.updateMatrixWorld();
      matrices.push(box.matrixWorld);
    }

    return matrices;
  }

  addMarker(point, index = -1) {
    index >= 0 ? this.points.splice(index, 0, point) : this.points.push(point);
    // this.points.push(point);

    // Spheres
    const sphere = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
    this.add(sphere);
    index >= 0
      ? this.spheres.splice(index, 0, sphere)
      : this.spheres.push(sphere);
    // this.spheres.splice(index, 0, sphere);
    // this.spheres.push(sphere);

    if (this.metadata) {
      this.setSpheresColor(this.spheres, this.getZoneCategoryColor());
    }

    // Edges & boxes
    if (this.points.length > 1) {
      // Edges
      const lineGeometry = new THREE.Geometry();
      lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
      lineGeometry.colors.push(this.lineColor, this.lineColor, this.lineColor);

      const edge = new THREE.Line(this.lineGeometry, this.lineMaterial);
      edge.visible = true;
      this.add(edge);
      index >= 0 ? this.edges.splice(index, 0, edge) : this.edges.push(edge);
      // this.edges.splice(index, 0, edge);
      // this.edges.push(edge);

      // Boxes
      const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
      const boxMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.2,
      });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.visible = false;
      this.add(box);
      index >= 0 ? this.boxes.splice(index, 0, box) : this.boxes.push(box);
      // this.boxes.splice(index, 0, box);
      // this.boxes.push(box);
    }

    {
      // event listeners
      let drag = (e) => {
        let I = Utils.getMousePointCloudIntersection(
          e.drag.end,
          e.viewer.scene.getActiveCamera(),
          e.viewer,
          e.viewer.scene.pointclouds
        );

        if (I) {
          let i = this.spheres.indexOf(e.drag.object);
          if (i !== -1) {
            this.setPosition(i, I.location);
          }
        }
      };

      let drop = (e) => {
        let i = this.spheres.indexOf(e.drag.object);
        if (i !== -1) {
          this.dispatchEvent({
            type: "marker_dropped",
            region: this,
            index: i,
          });
        }
      };

      const mouseover = (e) => {
        // const lastSphere = this.spheres[this.spheres.length - 1];
        // console.log("last sphere: ", lastSphere.position.x);
        e.object.material.emissive.setHex(0x888888);
      };

      const mouseleave = (e) => e.object.material.emissive.setHex(0x000000);

      const click = (e) => {
        const sphereIndex = this.spheres.indexOf(sphere);

        if (
          this.pressedKeys.length === 1 &&
          this.pressedKeys.includes("AltLeft")
        ) {
          this.openModal(e);
        }

        if (
          this.pressedKeys.length === 1 &&
          this.pressedKeys.includes("KeyX")
        ) {
          this.addMarkerAfter(e, sphereIndex);
        }

        if (
          this.pressedKeys.length === 1 &&
          this.pressedKeys.includes("KeyZ")
        ) {
          this.addMarkerBefore(e, sphereIndex);
        }

        if (
          this.pressedKeys.length === 1 &&
          this.pressedKeys.includes("KeyC")
        ) {
          if (this.spheres.length >= 3) {
            this.removeMarker(sphereIndex);
          }
        }
      };

      sphere.addEventListener("drag", drag);
      sphere.addEventListener("drop", drop);
      sphere.addEventListener("mouseover", mouseover);
      sphere.addEventListener("mouseleave", mouseleave);
      sphere.addEventListener("click", click);
    }

    let event = {
      type: "marker_added",
      region: this,
      sphere: sphere,
    };

    this.dispatchEvent(event);

    // this.setPosition(this.points.length - 1, point);
    index >= 0
      ? this.setPosition(index, point)
      : this.setPosition(this.points.length - 1, point);
  }

  addMarkerAfter(e, index) {
    // arbitrary value
    const distance = 30;

    // If the sphere clicked was at the end
    if (index === this.spheres.length - 1) {
      const pointToAdd = this.getExtendPoint(distance, index);
      this.addMarker(pointToAdd, index + 1);
    } else {
      const pointToAdd = this.getCenterPoint(index, index + 1);
      this.addMarker(pointToAdd, index + 1);
    }
  }

  addMarkerBefore(e, index) {
    const distance = -50;

    if (index === 0) {
      const pointToadd = this.getExtendPoint(distance, index);
      this.addMarker(pointToadd, index);
    } else {
      const pointToadd = this.getCenterPoint(index - 1, index);
      this.addMarker(pointToadd, index);
    }
  }

  getCenterPoint(indexA, indexB) {
    const center = this.points[indexA].clone();
    center.add(this.points[indexB].clone());

    return center.multiplyScalar(0.5);
  }

  getExtendPoint(xToAdd, index) {
    const extendedPoint = this.points[index].clone();
    return extendedPoint.add(new THREE.Vector3(xToAdd, 0, 0));
  }

  removeMarker(index) {
    this.points.splice(index, 1);

    this.remove(this.spheres[index]);

    let edgeIndex = index === 0 ? 0 : index - 1;
    this.remove(this.edges[edgeIndex]);
    this.edges.splice(edgeIndex, 1);

    this.remove(this.boxes[edgeIndex]);
    this.boxes.splice(edgeIndex, 1);

    this.spheres.splice(index, 1);

    this.update();

    this.dispatchEvent({
      type: "marker_removed",
      region: this,
    });
  }

  setPosition(index, position) {
    let point = this.points[index];
    point.copy(position);

    let event = {
      type: "marker_moved",
      region: this,
      index: index,
      position: point.clone(),
    };
    this.dispatchEvent(event);

    this.update();
  }

  setWidth(width) {
    this.width = width;

    let event = {
      type: "width_changed",
      region: this,
      width: width,
    };
    this.dispatchEvent(event);

    this.update();
  }

  getWidth() {
    return this.width;
  }

  setZoneCategory(category) {
    const event = {
      type: "zone_changed",
      category: category,
    };

    this.dispatchEvent(event);
    this.update();
  }

  setSpheresColor(spheres, color) {
    spheres.forEach(
      (sphere) => (sphere.material.color = new THREE.Color(color))
    );
  }

  update() {
    if (this.points.length === 0) {
      return;
    } else if (this.points.length === 1) {
      let point = this.points[0];
      this.spheres[0].position.copy(point);

      return;
    }

    let min = this.points[0].clone();
    let max = this.points[0].clone();
    let centroid = new THREE.Vector3();
    const regionCentroid = new THREE.Vector3();
    let lastIndex = this.points.length - 1;

    for (let i = 0; i <= lastIndex; i++) {
      let point = this.points[i];
      regionCentroid.add(point);

      let sphere = this.spheres[i];
      let leftIndex = i === 0 ? lastIndex : i - 1;
      // let rightIndex = (i === lastIndex) ? 0 : i + 1;
      let leftVertex = this.points[leftIndex];
      // let rightVertex = this.points[rightIndex];
      let leftEdge = this.edges[leftIndex];
      let rightEdge = this.edges[i];
      let leftBox = this.boxes[leftIndex];
      // rightBox = this.boxes[i];

      // let leftEdgeLength = point.distanceTo(leftVertex);
      // let rightEdgeLength = point.distanceTo(rightVertex);
      // let leftEdgeCenter = new THREE.Vector3().addVectors(leftVertex, point).multiplyScalar(0.5);
      // let rightEdgeCenter = new THREE.Vector3().addVectors(point, rightVertex).multiplyScalar(0.5);
      sphere.position.copy(point);

      if (this._modifiable) {
        sphere.visible = true;
      } else {
        sphere.visible = false;
      }

      // TODO: There's no point to do these calculations if we don't show the edges/lines
      // if (leftEdge) {
      // 	leftEdge.geometry.vertices[1].copy(point);
      // 	leftEdge.geometry.verticesNeedUpdate = true;
      // 	leftEdge.geometry.computeBoundingSphere();
      // }

      // if (rightEdge) {
      // 	rightEdge.geometry.vertices[0].copy(point);
      // 	rightEdge.geometry.verticesNeedUpdate = true;
      // 	rightEdge.geometry.computeBoundingSphere();
      // }

      if (leftBox) {
        let start = leftVertex;
        let end = point;
        let length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
        leftBox.scale.set(length, 1000000, this.width);
        leftBox.up.set(0, 0, 1);

        let center = new THREE.Vector3()
          .addVectors(start, end)
          .multiplyScalar(0.5);
        let diff = new THREE.Vector3().subVectors(end, start);
        let target = new THREE.Vector3(diff.y, -diff.x, 0);

        leftBox.position.set(0, 0, 0);
        leftBox.lookAt(target);
        leftBox.position.copy(center);
      }

      centroid.add(point);

      min.min(point);
      max.max(point);
    }

    centroid.multiplyScalar(1 / this.points.length);
    regionCentroid.divideScalar(this.points.length);

    for (let i = 0; i < this.boxes.length; i++) {
      let box = this.boxes[i];

      box.position.z = min.z + (max.z - min.z) / 2;

      if (this.metadata) {
        box.zoneCategory = this.metadata.category;
      } else {
        box.zoneCategory = ZoneCategory.NONE;
      }
    }

    {
      // metadata labels
      this.metadataLabel.position.copy(regionCentroid);
    }
  }

  raycast(raycaster, intersects) {
    for (let i = 0; i < this.points.length; i++) {
      let sphere = this.spheres[i];

      sphere.raycast(raycaster, intersects);
    }

    // recalculate distances because they are not necessarely correct
    // for scaled objects.
    // see https://github.com/mrdoob/three.js/issues/5827
    // TODO: remove this once the bug has been fixed
    for (let i = 0; i < intersects.length; i++) {
      let I = intersects[i];
      I.distance = raycaster.ray.origin.distanceTo(I.point);
    }

    intersects.sort(function (a, b) {
      return a.distance - b.distance;
    });
  }

  get modifiable() {
    return this._modifiable;
  }

  set modifiable(value) {
    this._modifiable = value;
    this.update();
  }
}

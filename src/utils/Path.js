import * as THREE from "../../libs/three.js/build/three.module.js";
import { TextSprite } from "../TextSprite.js";
import { Utils } from "../utils.js";
import { Line2 } from "../../libs/three.js/lines/Line2.js";
import { LineGeometry } from "../../libs/three.js/lines/LineGeometry.js";
import { LineMaterial } from "../../libs/three.js/lines/LineMaterial.js";

export class Path extends THREE.Object3D {
  constructor() {
    super();
    // this.name = '';
    this.points = [];
    this._showDistances = false;
    this._showArea = false;
    this._closed = false;
    this._showEdges = true;
    this.maxMarkers = Number.MAX_SAFE_INTEGER;
    this.color = new THREE.Color(0xff0800);
    this.lineWidth = 2;
    this.spheres = [];
    this.edges = [];
    this.metadataLabels = [];
    this.metadatas = [];
    this.waypoints = [];
    this.pressedKeys = [];
    // this.pathNameLabel = Utils.createNameLabel();
    this.add(this.pathNameLabel);
  }

  onlyOneKey(pressedKeys, key) {
    // Makes sure no other keys are pressed except the key passed in.
    return pressedKeys.length === 1 && pressedKeys.includes(key);
  }

  createEdge() {
    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, 0, 0, 0]);

    const material = new LineMaterial({
      color: this.color,
      linewidth: this.lineWidth,
      transparent: true,
      opacity: 1,
      depthTest: true,
      depthWrite: true,
      // resolution: new THREE.Vector2(1000, 1000),
    });

    const edge = new Line2(geometry, material);

    return edge;
  }

  drawEdge() {
    for (let i = 0; i < this.points.length; i++) {
      let edge = this.edges[i];
      let lastIndex = this.points.length - 1;
      let nextIndex = i + 1 > lastIndex ? 0 : i + 1;
      let nextPoint = this.points[nextIndex];

      edge.position.copy(this.points[i].position);
      edge.geometry.setPositions([
        0,
        0,
        0,
        ...nextPoint.position.clone().sub(this.points[i].position).toArray(),
      ]);
      edge.visible = i < lastIndex || this.closed;

      if (!this.showEdges) {
        edge.visible = false;
      }

      edge.geometry.verticesNeedUpdate = true;
      edge.geometry.computeBoundingSphere();
      edge.computeLineDistances();

      this.add(edge);
    }
  }

  createSphere() {
    const geometry = new THREE.SphereGeometry(0.4, 10, 10);
    const material = new THREE.MeshLambertMaterial({
      //shading: THREE.SmoothShading,
      color: this.color,
      depthTest: false,
      depthWrite: false,
    });

    const sphere = new THREE.Mesh(geometry, material);

    return sphere;
  }

  drawSphere(idx, isPoi = false) {
    if (this.points.length > 0 && this.spheres[idx]) {
      let sphere = this.spheres[idx];
      sphere.position.copy(this.points[idx].position);
      sphere.material.color = this.color;

      if (this.maxMarkers === 1 || isPoi) {
        sphere.visible = true;
      } else {
        sphere.visible = false;
      }

      this.add(sphere);
    }
  }

  // drawMetadataLabels(){
  // 	for (let i = 0; i < this.spheres.length; i++) {
  // 		const sphere = this.spheres[i];

  // 		this.metadataLabels.forEach((label)=> {
  // 			if (sphere.uuid === label.sphereId) {
  // 				label.position.copy(sphere.position.clone());
  // 				label.visible = true;
  // 				this.add(label);

  // 			}
  // 		})
  // 	}
  // }

  modifyMetadata(e) {
    if (this.onlyOneKey(this.pressedKeys, "AltLeft")) {
      const createModal = (data, dataExists) => {
        let modal = document.createElement("div");

        modal.innerHTML = `
				<form id="meta_form" class="meta_modal_wrapper">

					<div class="meta_modal_container">
						<label for="meta_title">Title:</label>
						<input 
							value="${data.title}"
							type="text" 
							id="meta_title" 
							class="form_input" 
							name="title"
						>
						
						<label for="meta_description">Description:</label>			
						<textarea
							rows="4"
							id="meta_description" 
							class="form_input form_textarea" 
							name="description">${data.description}</textarea>

						<label for="meta_time">Time:</label>
						<div style="width: 100%; display:flex; flex-direction:row; justify-content:space-between; align-items: center;">
							<input 
								class="form_input"
								type="number" 
								id="meta_time" 
								name="meta_time"
								min="0" max="100"
								placeholder="1.0" 
								step="0.01"
								value=${data.time}
							>
							<span style="margin-left: 10px;">hours</span>
						</div>
						
					</div>
					
					<div class="meta_modal_btn_container">
						<div>
							<button 
								id="meta_modal_submit"
								class="ui-button ui-state-default modal_btn" 
								type="submit"
							>${dataExists ? "Update" : "Submit"}
							</button>

							<button 
								id="meta_modal_cancel" 
								class="ui-button ui-state-default modal_btn"
							>Cancel
							</button>
						</div>
						${
              dataExists
                ? `
							<button
								id="meta_modal_delete"
								class="ui-button ui-state-default modal_btn"
							>Delete
							</button>`
                : `<span></span>`
            }
					</div>
				</form>`;

        return modal;
      };

      const deleteMetadata = (data, modal) => {
        //Delete metadata obj.
        this.metadatas = this.metadatas.filter(
          (metadata) => metadata.sphereId !== data.sphereId
        );

        // Delete+hide labels. Hacky, but works..
        this.metadataLabels.forEach((label) => {
          if (label.sphereId === data.sphereId) {
            label.visible = false;
          }
        });

        this.metadataLabels = this.metadataLabels.filter(
          (label) => label.sphereId !== data.sphereId
        );

        // Close the modal
        modal.remove();
      };

      const submitMetadata = (e, data, modal) => {
        // If metadata in that sphere/point doesn't exist, push the metadata object to the array. Create a new label and push it to its array.
        if (
          !this.metadatas.some(
            (metadata) => metadata.sphereId === data.sphereId
          )
        ) {
          // metadata obj --> metadatas
          this.metadatas.push(data);

          // create label --> metadataLabels
          const metadataLabel = Utils.createMetadataLabel(
            data.title,
            data.sphereId
          );
          this.add(metadataLabel);
          this.metadataLabels.push(metadataLabel);

          // Else, update that specific object in metadatas array and the label's title.
        } else {
          this.metadatas = this.metadatas.map((metadata) =>
            metadata.sphereId === data.sphereId
              ? {
                  ...metadata,
                  title: data.title,
                  description: data.description,
                  time: data.time,
                }
              : metadata
          );

          this.metadataLabels.forEach(
            (label) =>
              label.sphereId === data.sphereId && label.setText(data.title)
          );
        }

        e.preventDefault();
        modal.remove();
        // this.drawMetadataLabels()
      };

      const data = {
        title: "",
        description: "",
        time: "0",
        sphereId: e.target.uuid,
      };

      let dataExists = false;

      // If the sphere the user clicked already has metadata, populate the data obj with these values.
      this.metadatas.some((metadata) => {
        if (this.hasOwnProperty("area")) {
          data.title = metadata.title;
          data.description = metadata.description;
          data.sphereId = metadata.sphereId;

          dataExists = true;
        }

        if (metadata.sphereId === e.target.uuid) {
          data.title = metadata.title;
          data.description = metadata.description;
          data.time = metadata.time;
          data.sphereId = metadata.sphereId;

          dataExists = true;
        }
      });

      // Create the modal and append to the DOM. Pass in the data obj which is empty if there's no previously saved data, or the populated version, if there is.
      const modal = createModal(data, dataExists);
      document.getElementById("potree_description").appendChild(modal);

      // Get references to elements in modal.
      const form = document.getElementById("meta_form");
      const titleField = document.getElementById("meta_title");
      const descriptionField = document.getElementById("meta_description");
      const timeField = document.getElementById("meta_time");
      const cancelBtn = document.getElementById("meta_modal_cancel");
      const deleteBtn = document.getElementById("meta_modal_delete");

      // Add event listeners to modal elements.
      form.addEventListener("submit", (e) => submitMetadata(e, data, modal));

      titleField.addEventListener(
        "change",
        (e) => (data.title = e.target.value)
      );
      descriptionField.addEventListener(
        "change",
        (e) => (data.description = e.target.value)
      );
      timeField.addEventListener("change", (e) => (data.time = e.target.value));

      cancelBtn.addEventListener("click", () => modal.remove());

      deleteBtn &&
        deleteBtn.addEventListener("click", () => deleteMetadata(data, modal));
    }
  }

  drag(e) {
    let I = Utils.getMousePointCloudIntersection(
      e.drag.end,
      e.viewer.scene.getActiveCamera(),
      e.viewer,
      e.viewer.scene.pointclouds,
      { pickClipped: true }
    );

    if (I) {
      let i = this.spheres.indexOf(e.drag.object);
      if (i !== -1) {
        let point = this.points[i];

        // loop through current keys and cleanup ones that will be orphaned
        for (let key of Object.keys(point)) {
          if (!I.point[key]) {
            delete point[key];
          }
        }

        for (let key of Object.keys(I.point).filter((e) => e !== "position")) {
          point[key] = I.point[key];
        }

        this.setPosition(i, I.location);
      }

      this.drawSphere(i);
      this.drawEdge();
      // this.drawMetadataLabels()
    }
  }

  /**
   * sphereId is necessary because of stored metadata - otherwise a random new id would be created that would not match with the id set in json
   */
  addMarker(point, sphereId, idx, isPoi = false) {
    if (point.x != null) {
      point = { position: point };
    } else if (point instanceof Array) {
      point = { position: new THREE.Vector3(...point) };
    }
    idx >= 0 ? this.points.splice(idx, 0, point) : this.points.push(point);

    // sphere
    let sphere = this.createSphere();
    if (sphereId) sphere.uuid = sphereId;
    idx >= 0 ? this.spheres.splice(idx, 0, sphere) : this.spheres.push(sphere);
    const sphereIdx = this.spheres.indexOf(sphere);
    this.drawSphere(sphereIdx, isPoi);

    // edge
    const edge = this.createEdge();
    idx >= 0 ? this.edges.splice(idx, 0, edge) : this.edges.push(edge);
    this.drawEdge();

    {
      // Event Listeners
      const createLabelsFromMetadatas = () => {
        this.metadatas.forEach((metadata) => {
          if (metadata.sphereId === sphere.uuid) {
            const metadataLabel = Utils.createMetadataLabel(
              metadata.title,
              metadata.sphereId
            );
            this.add(metadataLabel);
            this.metadataLabels.push(metadataLabel);
          }
        });
      };

      let drop = (e) => {
        let i = this.spheres.indexOf(e.drag.object);
        if (i !== -1) {
          this.dispatchEvent({
            type: "marker_dropped",
            path: this,
            index: i,
          });
        }
      };

      let mouseover = (e) => {
        // console.log("hovered over a sphere: ", this.spheres.indexOf(sphere));
        e.object.material.emissive.setHex(0x888888);
      };

      let mouseleave = (e) => {
        e.object.material.emissive.setHex(0x000000);
      };

      const extendPath = () => {
        const idx = this.spheres.indexOf(sphere);

        const getCenterPoint = (idxA, idxB) => {
          const center = this.points[idxA].position.clone();
          center.add(this.points[idxB].position.clone());

          return center.multiplyScalar(0.5);
        };

        const getExtendPoint = (xToAdd) => {
          let extension = this.points[idx].position.clone();
          extension = extension.add(new THREE.Vector3(xToAdd, 0, 0));
          return extension;
        };

        // Add prev
        if (this.onlyOneKey(this.pressedKeys, "KeyZ")) {
          if (idx === 0) {
            this.addMarker(getExtendPoint(-20), null, idx);
          } else {
            this.addMarker(getCenterPoint(idx - 1, idx), null, idx);
          }
        }

        // Add next
        if (this.onlyOneKey(this.pressedKeys, "KeyX")) {
          if (idx === this.points.length - 1) {
            this.addMarker(getExtendPoint(20), null, idx + 1);
          } else {
            this.addMarker(getCenterPoint(idx, idx + 1), null, idx + 1);
          }
        }
      };

      const removeMarkerFromPath = () => {
        const idx = this.spheres.indexOf(sphere);

        if (this.onlyOneKey(this.pressedKeys, "KeyC")) {
          this.removeMarker(idx);
        }
      };

      // If metadatas has been imported, create labels based on it.
      if (this.metadatas) {
        createLabelsFromMetadatas();
      }

      // Add an event listener to the sphere
      sphere.addEventListener("click", (e) => this.modifyMetadata(e));

      // As soon as a key is pressed, it's code is pushed to an array - which keeps track of the currently pressed down keys.
      window.addEventListener("keydown", (e) => {
        !this.pressedKeys.includes(e.code) && this.pressedKeys.push(e.code);
      });

      // If a key is released, the pressedKeys array is updated by filtering out the key that was released.
      window.addEventListener("keyup", (e) => {
        this.pressedKeys = this.pressedKeys.filter((key) => key !== e.code);
      });

      sphere.addEventListener(
        "click",
        () => this.maxMarkers > 1 && extendPath()
      );
      sphere.addEventListener(
        "click",
        () => this.spheres.length > 2 && removeMarkerFromPath()
      );

      sphere.addEventListener("drag", (e) => this.drag(e));
      sphere.addEventListener("drop", drop);
      sphere.addEventListener("mouseover", mouseover);
      sphere.addEventListener("mouseleave", mouseleave);
    }

    let event = {
      type: "marker_added",
      path: this,
      sphere: sphere,
    };
    this.dispatchEvent(event);

    idx >= 0
      ? this.setMarker(idx, point)
      : this.setMarker(this.points.length - 1, point);
  }

  removeMarker(index) {
    // Note: metadata(labels) removal is hacky and mostly duplicates already existing code. Metadata code needs a refactor. This should be replaced.

    this.metadataLabels.forEach((label) => {
      if (label.sphereId === this.spheres[index].uuid) {
        label.visible = false;
      }
    });

    this.metadataLabels = this.metadataLabels.filter(
      (label) => label.sphereId !== this.spheres[index].uuid
    );

    this.metadatas = this.metadatas.filter(
      (metadata) => metadata.sphereId !== this.spheres[index].uuid
    );

    this.points.splice(index, 1);

    this.remove(this.spheres[index]);

    let edgeIndex = index === 0 ? 0 : index - 1;
    this.remove(this.edges[edgeIndex]);
    this.edges.splice(edgeIndex, 1);

    this.drawEdge();

    // this.remove(this.edgeLabels[edgeIndex]);
    // this.edgeLabels.splice(edgeIndex, 1);

    this.spheres.splice(index, 1);

    this.update();

    this.dispatchEvent({ type: "marker_removed", path: this });
  }

  setMarker(index, point) {
    this.points[index] = point;

    let event = {
      type: "marker_moved",
      path: this,
      index: index,
      position: point.position.clone(),
    };
    this.dispatchEvent(event);

    this.update();
  }

  setPosition(index, position) {
    let point = this.points[index];
    point.position.copy(position);

    let event = {
      type: "marker_moved",
      path: this,
      index: index,
      position: position.clone(),
    };
    this.dispatchEvent(event);

    this.update();
  }

  getArea() {
    let area = 0;
    let j = this.points.length - 1;

    for (let i = 0; i < this.points.length; i++) {
      let p1 = this.points[i].position;
      let p2 = this.points[j].position;
      area += (p2.x + p1.x) * (p1.y - p2.y);
      j = i;
    }

    return Math.abs(area / 2);
  }

  getTotalDistance() {
    if (this.points.length === 0) {
      return 0;
    }

    let distance = 0;

    for (let i = 1; i < this.points.length; i++) {
      let prev = this.points[i - 1].position;
      let curr = this.points[i].position;
      let d = prev.distanceTo(curr);

      distance += d;
    }

    if (this.closed && this.points.length > 1) {
      let first = this.points[0].position;
      let last = this.points[this.points.length - 1].position;
      let d = last.distanceTo(first);

      distance += d;
    }

    return distance;
  }

  update() {
    if (this.points.length === 0) {
      return;
    }

    let lastIndex = this.points.length - 1;

    let centroid = new THREE.Vector3();
    for (let i = 0; i <= lastIndex; i++) {
      let point = this.points[i];
      centroid.add(point.position);
    }
    centroid.divideScalar(this.points.length);

    for (let i = 0; i <= lastIndex; i++) {
      let index = i;
      this.index = index;
      this.lastIndex = lastIndex;
      let nextIndex = i + 1 > lastIndex ? 0 : i + 1;
      let previousIndex = i === 0 ? lastIndex : i - 1;

      // points
      let point = this.points[index];
      let nextPoint = this.points[nextIndex];
      let previousPoint = this.points[previousIndex];

      {
        // metadata labels
        const sphere = this.spheres[i];
        this.metadataLabels.forEach((label) => {
          if (label.sphereId === sphere.uuid) {
            let labelPos = point.position.clone();
            label.position.copy(labelPos);
            label.visible = true;
          }
        });
      }

      // { // name label
      // 	this.pathNameLabel.position.copy(centroid);
      // 	this.pathNameLabel.visible = true;
      // 	this.pathNameLabel.setText(this.name);
      // }
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

  get showEdges() {
    return this._showEdges;
  }

  set showEdges(value) {
    this._showEdges = value;
    this.update();
  }

  get showArea() {
    return this._showArea;
  }

  set showArea(value) {
    this._showArea = value;
    this.update();
  }

  get closed() {
    return this._closed;
  }

  set closed(value) {
    this._closed = value;
    this.update();
  }

  get showDistances() {
    return this._showDistances;
  }

  set showDistances(value) {
    this._showDistances = value;
    this.update();
  }
}

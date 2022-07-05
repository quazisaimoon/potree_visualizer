import {Path} from "./Path"
import * as THREE from "../../libs/three.js/build/three.module.js";

export class Area extends Path {
    constructor(){
        super();
		this.color;
		this.lineWidth = 0;
		this._showEdges = false;
		this._closed = true;
        this.area = "area";
    }

	getColor() {
	
		const color = window.prompt("Enter a color name or leave empty to generate a random color. \n\nred, \nblue, \norange, \ngreen, \npurple, \nfirebrick \n...");

		if (color === "") {
			return this.genRandomColor();
		}
	
		if (color === null) {
			throw new Error("Canceled");
		}

		return new THREE.Color(color);
	
	}

	genRandomColor(min = 0, max = 255) {
		const c1 =  min + Math.floor(Math.random() * (max - min + 1));
		const c2 =  min + Math.floor(Math.random() * (max - min + 1));
		const c3 =  min + Math.floor(Math.random() * (max - min + 1));

		return new THREE.Color(`rgb(${c1}, ${c2}, ${c3})`);
	}


	createShape() {
		/**
		 * https://stackoverflow.com/questions/50272399/three-js-2d-object-in-3d-space-by-vertices/50274103#50274103
		*/
		
		const pts = this.points.map(p => {
			return new THREE.Vector3(p.position.x, p.position.y, p.position.z);
		});

		// const tri = new THREE.Triangle(pts[2], pts[1], pts[0]);
		// const normal = new THREE.Vector3();
		// tri.getNormal(normal);

		// const baseNormal = new THREE.Vector3(0, 0, 1);
		// const quaternion = new THREE.Quaternion().setFromUnitVectors(normal, baseNormal);

		// const tempPoints = pts.map(p => {
		// 	return p.clone().applyQuaternion(quaternion);
		// })

		const shape = new THREE.Shape(pts);
		const shapeGeom = new THREE.ShapeGeometry(shape);
		const shapeMaterial = new THREE.MeshBasicMaterial({
			color: this.color,
			side: THREE.DoubleSide,
			wireframe: false,
			transparent: true,
			opacity: 0.4,
			depthTest: true,
			depthWrite: false,
		})

		const mesh = new THREE.Mesh(shapeGeom, shapeMaterial);
		mesh.renderOrder = 20;

		return {mesh, pts}
	}

	drawShape() {
		this.remove(this.shape);

		if (this.points.length > 2) {
			const {mesh, pts} = this.createShape()
			this.shape = mesh
			this.shape.geometry.vertices = pts;
			this.shape.geometry.verticesNeedUpdate = true
			this.shape.geometry.computeBoundingBox();
			this.add(this.shape)
		}
	}

	addMarker(point, sphereId, idx){
		super.addMarker(point, sphereId, idx);

		this.drawShape();
	}

	drag(e) {
		super.drag(e);

		this.drawShape();
	}


    update(){
        super.update();

        let lastIndex = this.points.length - 1;
		let centroid = new THREE.Vector3();

		for (let i = 0; i <= lastIndex; i++) {
			let point = this.points[i];
			centroid.add(point.position);
		}

		centroid.divideScalar(this.points.length);
        
        { // metadata labels
            this.metadataLabels.forEach((label)=> {
                let labelPos = centroid.clone();
                label.position.copy(labelPos);
                label.visible = true;
            })

        }
    }

}

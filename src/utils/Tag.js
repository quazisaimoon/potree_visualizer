import * as THREE from "../../libs/three.js/build/three.module.js";
import {TextSprite} from "../TextSprite.js";

export class Tag extends THREE.Object3D {
	constructor (args = {}) {
		super();

		if (this.constructor.name === "Tag") {
			console.warn("Can't create object of class Tag directly. Use the class TagBox instead.");
		}

		//console.log(this);
		//console.log(this.constructor);
		//console.log(this.constructor.name);

		this._clip = args.clip || false;
		this._visible = true;
		this.showTagLabel = true;
		this._modifiable = args.modifiable || true;

		this.label = new TextSprite('0');
		this.label.setBorderColor({r: 0, g: 255, b: 0, a: 0.0});
		this.label.setBackgroundColor({r: 0, g: 255, b: 0, a: 0.0});
		this.label.material.depthTest = false;
		this.label.material.depthWrite = false;
		this.label.material.transparent = true;
		this.label.position.y -= 0.5;
		this.add(this.label);

		this.label.updateMatrixWorld = () => {
			const tagWorldPos = new THREE.Vector3();
			tagWorldPos.setFromMatrixPosition(this.matrixWorld);
			this.label.position.copy(tagWorldPos);
			this.label.updateMatrix();
			this.label.matrixWorld.copy(this.label.matrix);
			this.label.matrixWorldNeedsUpdate = false;

			for (let i = 0, l = this.label.children.length; i < l; i++) {
				this.label.children[ i ].updateMatrixWorld(true);
			}
		};

		this.pressedKeys = [];
		this.metadata = null;

		
		{ // event listeners
			window.addEventListener("keydown", (e) => !this.pressedKeys.includes(e.code) && this.pressedKeys.push(e.code));
			window.addEventListener("keyup", (e) => this.pressedKeys = this.pressedKeys.filter(key => key !== e.code));

			this.addEventListener('select', e => {
				if (this.pressedKeys.length === 1 && this.pressedKeys.includes("ControlLeft")) {
					this.openModal(e);
				}
			});

			this.addEventListener('deselect', e => {
				//
			});
		}

	}

	get visible(){
		return this._visible;
	}

	set visible(value){
		if(this._visible !== value){
			this._visible = value;

			this.dispatchEvent({type: "visibility_changed", object: this});
		}
	}

	openModal(e) {
		let dataExists = this.metadata !== null;

		const modal =  document.createElement("div");
		modal.innerHTML = `
			<form id="meta_form" class="meta_modal_wrapper">
				<div class="meta_modal_container">

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
					${dataExists ? `
						<button
							id="meta_modal_delete"
							class="ui-button ui-state-default modal_btn"
						>Delete
						</button>` : ""
					}
				</div>
			</form>`;

			document.getElementById("potree_description").appendChild(modal);

			document.getElementById("meta_form").addEventListener("submit", (e) => this.submitMetadata(e, modal));
			document.getElementById("meta_modal_cancel").addEventListener("click", () => this.closeModal(modal));
			dataExists && document.getElementById("meta_modal_delete").addEventListener("click", () => this.deleteMetadata(modal));
	}

	closeModal(modal) {
		modal.remove();
	}

	submitMetadata(e, modal) {
		const values = {
			title: document.getElementById('meta_title').value,
			description: document.getElementById('meta_description').value,
			task: document.getElementById('meta_task').value,
		};

		if (values.title) {
			this.metadata = values;
			this.closeModal(modal);
		}
		
		e.preventDefault();
	}

	deleteMetadata(modal) {
		this.metadata = null;
		this.closeModal(modal);
	}

	getTag () {
		console.warn("override this in subclass");
	}

	update () {
		// 
	};

	raycast (raycaster, intersects) {
		// 
	}

	get clip () {
		return this._clip;
	}

	set clip (value) {
		if(this._clip !== value){
			this._clip = value;

			this.update();

			this.dispatchEvent({
				type: "clip_changed",
				object: this
			});
		}
		
	}

	get modifieable () {
		return this._modifiable;
	}

	set modifieable (value) {
		this._modifiable = value;

		this.update();
	}
};


export class TagBox extends Tag {
	constructor(args = {}){
		super(args);

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = 'box_' + this.constructor.counter;

		const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();

		const boxFrameGeometry = new THREE.Geometry();

		{
			const Vector3 = THREE.Vector3;

			boxFrameGeometry.vertices.push(

				// bottom
				new Vector3(-0.5, -0.5, 0.5),
				new Vector3(0.5, -0.5, 0.5),
				new Vector3(0.5, -0.5, 0.5),
				new Vector3(0.5, -0.5, -0.5),
				new Vector3(0.5, -0.5, -0.5),
				new Vector3(-0.5, -0.5, -0.5),
				new Vector3(-0.5, -0.5, -0.5),
				new Vector3(-0.5, -0.5, 0.5),
				// top
				new Vector3(-0.5, 0.5, 0.5),
				new Vector3(0.5, 0.5, 0.5),
				new Vector3(0.5, 0.5, 0.5),
				new Vector3(0.5, 0.5, -0.5),
				new Vector3(0.5, 0.5, -0.5),
				new Vector3(-0.5, 0.5, -0.5),
				new Vector3(-0.5, 0.5, -0.5),
				new Vector3(-0.5, 0.5, 0.5),
				// sides
				new Vector3(-0.5, -0.5, 0.5),
				new Vector3(-0.5, 0.5, 0.5),
				new Vector3(0.5, -0.5, 0.5),
				new Vector3(0.5, 0.5, 0.5),
				new Vector3(0.5, -0.5, -0.5),
				new Vector3(0.5, 0.5, -0.5),
				new Vector3(-0.5, -0.5, -0.5),
				new Vector3(-0.5, 0.5, -0.5),

			);

		}

		this.material = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			transparent: true,
			opacity: 0.3,
			depthTest: true,
			depthWrite: false
		});

		this.box = new THREE.Mesh(boxGeometry, this.material);
		this.box.geometry.computeBoundingBox();
		this.boundingBox = this.box.geometry.boundingBox;

		this.add(this.box);

		this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
		// this.frame.mode = THREE.Lines;
		this.add(this.frame);

		this.update();
	}

	update(){
		this.boundingBox = this.box.geometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());

		if (this._clip) {
			this.box.visible = false;
			this.label.visible = false;
		} else {
			this.box.visible = true;
			this.label.visible = this.showTagLabel;
		}
	}

	raycast (raycaster, intersects) {
		let is = [];
		this.box.raycast(raycaster, is);

		if (is.length > 0) {
			let I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	}

	getVolume(){
		return Math.abs(this.scale.x * this.scale.y * this.scale.z);
	}

};


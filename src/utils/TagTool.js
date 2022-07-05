import * as THREE from "../../libs/three.js/build/three.module.js";
import {Tag, TagBox} from "./Tag.js";
import {Utils} from "../utils.js";
import { EventDispatcher } from "../EventDispatcher.js";

export class TagTool extends EventDispatcher{
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_tag', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.showLabels = true;

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_tag';

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = e => {
			this.scene.remove(e.tag);
		};

		this.onAdd = e => {
			this.scene.add(e.tag);
		};

		for (let tag of viewer.scene.tags) {
			this.onAdd({tag: tag});
		}

		this.viewer.inputHandler.addEventListener('delete', e => {
			let tags = e.selection.filter(e => (e instanceof Tag));
			tags.forEach(e => this.viewer.scene.removeTag(e));
		});

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.scene", e => this.render(e));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('tag_added', this.onAdd);
		viewer.scene.addEventListener('tag_removed', this.onRemove);
	}

	onSceneChange(e) {
		if (e.oldScene) {
			e.oldScene.removeEventListeners('tag_added', this.onAdd);
			e.oldScene.removeEventListeners('tag_removed', this.onRemove);
		}

		e.scene.addEventListener('tag_added', this.onAdd);
		e.scene.addEventListener('tag_removed', this.onRemove);
	}

	startInsertion (args = {}) {
		let tag;

		if (args.type) {
			tag = new args.type();
		} else {
			tag = new TagBox();
		}
		
		tag.clip = args.clip || false;
		tag.name = args.name || Utils.generateName("T");

		this.dispatchEvent({
			type: 'start_inserting_tag',
			tag: tag
		});

		this.viewer.scene.addTag(tag);
		this.scene.add(tag);

		let cancel = {
			callback: null
		};

		let drag = e => {
			let camera = this.viewer.scene.getActiveCamera();
			
			let I = Utils.getMousePointCloudIntersection(
				e.drag.end, 
				this.viewer.scene.getActiveCamera(), 
				this.viewer, 
				this.viewer.scene.pointclouds, 
				{pickClipped: false});

			if (I) {
				tag.position.copy(I.location);

				let wp = tag.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
				// let pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				let w = Math.abs((wp.z / 10));
				tag.scale.set(w, w, w);
			}
		};

		let drop = e => {
			tag.removeEventListener('drag', drag);
			tag.removeEventListener('drop', drop);

			cancel.callback();
		};

		cancel.callback = e => {
			tag.removeEventListener('drag', drag);
			tag.removeEventListener('drop', drop);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		tag.addEventListener('drag', drag);
		tag.addEventListener('drop', drop);
		this.viewer.addEventListener('cancel_insertions', cancel.callback);

		this.viewer.inputHandler.startDragging(tag);

		return tag;
	}

	update(){
		if (!this.viewer.scene) {
			return;
		}
		
		let camera = this.viewer.scene.getActiveCamera();
		let renderAreaSize = this.viewer.renderer.getSize(new THREE.Vector2());
		let clientWidth = renderAreaSize.width;
		let clientHeight = renderAreaSize.height;

		let tags = this.viewer.scene.tags;

		for (let tag of tags) {
			let label = tag.label;
			
			{
				let distance = label.position.distanceTo(camera.position);
				let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			let calculatedVolume = tag.getVolume();
			calculatedVolume = calculatedVolume / Math.pow(this.viewer.lengthUnit.unitspermeter, 3) * Math.pow(this.viewer.lengthUnitDisplay.unitspermeter, 3);  //convert to cubic meters then to the cubic display unit
			// let text = Utils.addCommas(calculatedVolume.toFixed(3)) + ' ' + this.viewer.lengthUnitDisplay.code + '\u00B3';
			const text = tag.name;

			label.setText(text);

			if (!this.showNameLabels) {
				label.visible = false;
			}
		}
	}

	render(params) {
		const renderer = this.viewer.renderer;
		const oldTarget = renderer.getRenderTarget();
		
		if (params.renderTarget) {
			renderer.setRenderTarget(params.renderTarget);
		}

		renderer.render(this.scene, this.viewer.scene.getActiveCamera());
		renderer.setRenderTarget(oldTarget);
	}

}


import * as THREE from "../../libs/three.js/build/three.module.js";
import {Region} from "./Region.js";
import {Utils} from "../utils.js";
import { EventDispatcher } from "../EventDispatcher.js";
import {ZoneCategory} from "../defines.js";


export class RegionTool extends EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_region', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.showLabels = true;
		this.showMetadataLabels = false;
		this.scene = new THREE.Scene();
		this.scene.name = 'scene_region';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = e => this.scene.remove(e.region);
		this.onAdd = e => this.scene.add(e.region);

		for(let region of viewer.scene.regions){
			this.onAdd({region: region});
		}

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('region_added', this.onAdd);
		viewer.scene.addEventListener('region_removed', this.onRemove);
	}

	onSceneChange(e){
		if(e.oldScene){
			e.oldScene.removeEventListeners('region_added', this.onAdd);
			e.oldScene.removeEventListeners('region_removed', this.onRemove);
		}

		e.scene.addEventListener('region_added', this.onAdd);
		e.scene.addEventListener('region_removed', this.onRemove);		
	}

	startInsertion (args = {}) {
		let domElement = this.viewer.renderer.domElement;

		let region = new Region();
		region.name = args.name || Utils.generateName("R");

		// region.addEventListener('zone_changed', (e) => console.log("e.category: ", e.category, "ZoneCategory: ", ZoneCategory));
		region.addEventListener('zone_changed', (e) => this.viewer.setZoneCategory(e.category));		

		this.dispatchEvent({
			type: 'start_inserting_region',
			region: region
		});

		this.scene.add(region);

		let cancel = {
			callback: null
		};

		let insertionCallback = (e) => {
			if(e.button === THREE.MOUSE.LEFT){
				if(region.points.length <= 1){
					let camera = this.viewer.scene.getActiveCamera();
					let distance = camera.position.distanceTo(region.points[0]);
					let clientSize = this.viewer.renderer.getSize(new THREE.Vector2());
					let pr = Utils.projectedRadius(1, camera, distance, clientSize.width, clientSize.height);
					let width = (10 / pr);

					region.setWidth(width);
				}

				region.addMarker(region.points[region.points.length - 1].clone());

				this.viewer.inputHandler.startDragging(
					region.spheres[region.spheres.length - 1]);
			} else if (e.button === THREE.MOUSE.RIGHT) {
				cancel.callback();
			}
		};

		cancel.callback = e => {
			region.removeMarker(region.points.length - 1);
			domElement.removeEventListener('mouseup', insertionCallback, false);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		this.viewer.addEventListener('cancel_insertions', cancel.callback);
		domElement.addEventListener('mouseup', insertionCallback, false);

		region.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			region.spheres[region.spheres.length - 1]);

		this.viewer.scene.addRegion(region);

		return region;
	}
	
	update() {
		let camera = this.viewer.scene.getActiveCamera();
		let regions = this.viewer.scene.regions;
		let renderAreaSize = this.viewer.renderer.getSize(new THREE.Vector2());
		let clientWidth = renderAreaSize.width;
		let clientHeight = renderAreaSize.height;

		this.light.position.copy(camera.position);

		// Make size independant of distance
		for (const region of regions) {
			for (const sphere of region.spheres) {				
				const distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = (15 / pr);

				sphere.scale.set(scale, scale, scale);
			}

			// Metadata labels
			const distance = camera.position.distanceTo(region.metadataLabel.getWorldPosition(new THREE.Vector3()));
			const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
			const scale = (70 / pr);

			const labelPos = region.metadataLabel.position.clone();
			// labelPos.add(new THREE.Vector3(0, 0, scale))
			region.metadataLabel.position.copy(labelPos);
			region.metadataLabel.scale.set(scale, scale, scale);

			if (region.metadataLabel.text && region.metadata) {
				region.metadataLabel.visible = true;
			}

			if (!this.showMetadataLabels) {
				region.metadataLabel.visible = false;
			}
		}
	}

	render(){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}

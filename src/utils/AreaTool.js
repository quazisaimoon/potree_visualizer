
import * as THREE from "../../libs/three.js/build/three.module.js";
import {Area} from "./Area.js";
import {Utils} from "../utils.js";
import {CameraMode} from "../defines.js";
import { EventDispatcher } from "../EventDispatcher.js";

export class AreaTool extends EventDispatcher{
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_area', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.showLabels = true;
		this.scene = new THREE.Scene();
		this.scene.name = 'scene_area';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = (e) => { this.scene.remove(e.area);};
		this.onAdd = e => {this.scene.add(e.area);};

		for(let area of viewer.scene.areas){
			this.onAdd({area: area});
		}

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('area_added', this.onAdd);
		viewer.scene.addEventListener('area_removed', this.onRemove);
	}

	onSceneChange(e){
		if(e.oldScene){
			e.oldScene.removeEventListener('area_added', this.onAdd);
			e.oldScene.removeEventListener('area_removed', this.onRemove);
		}

		e.scene.addEventListener('area_added', this.onAdd);
		e.scene.addEventListener('area_removed', this.onRemove);
	}

	startInsertion (args = {}) {
		let domElement = this.viewer.renderer.domElement;

		let area = new Area();

		this.dispatchEvent({
			type: 'start_inserting_area',
			area: area
		});

		const pick = (defaul, alternative) => {
			if(defaul != null){
				return defaul;
			}else{
				return alternative;
			}
		};

		area.showDistances = (args.showDistances === null) ? true : args.showDistances;
		area.showArea = pick(args.showArea, false);
		area.showEdges = pick(args.showEdges, true);
		area.closed = pick(args.closed, false);
		area.maxMarkers = pick(args.maxMarkers, Infinity);
		area.name = args.name || Utils.generateName("A");
		area.color = area.getColor();

		this.scene.add(area);

		let cancel = {
			removeLastMarker: area.maxMarkers > 3,
			callback: null
		};

		let insertionCallback = (e) => {
			if (e.button === THREE.MOUSE.LEFT) {
				area.addMarker(area.points[area.points.length - 1].position.clone());

				

				if (area.points.length >= area.maxMarkers) {
					cancel.callback();
				}

				this.viewer.inputHandler.startDragging(
					area.spheres[area.spheres.length - 1]);
			} else if (e.button === THREE.MOUSE.RIGHT) {
				cancel.callback();
			}
		};

		cancel.callback = e => {
			if (cancel.removeLastMarker) {
				area.removeMarker(area.points.length - 1);
			}
			domElement.removeEventListener('mouseup', insertionCallback, false);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		if (area.maxMarkers > 1) {
			this.viewer.addEventListener('cancel_insertions', cancel.callback);
			domElement.addEventListener('mouseup', insertionCallback, false);
		}

		area.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			area.spheres[area.spheres.length - 1]);

		this.viewer.scene.addArea(area);

		return area;
	}
	
	update(){
		let camera = this.viewer.scene.getActiveCamera();
		let domElement = this.renderer.domElement;
		let areas = this.viewer.scene.areas;

		const renderAreaSize = this.renderer.getSize(new THREE.Vector2());
		let clientWidth = renderAreaSize.width;
		let clientHeight = renderAreaSize.height;

		this.light.position.copy(camera.position);

		// make size independant of distance
		for (let area of areas) {
			area.lengthUnit = this.viewer.lengthUnit;
			area.lengthUnitDisplay = this.viewer.lengthUnitDisplay;
			area.update();

			// spheres
			for(let sphere of area.spheres){
				let distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
				let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
			
			// metadata labels
			for(let label of area.metadataLabels){
				let distance = camera.position.distanceTo(label.getWorldPosition(new THREE.Vector3()));
				let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				let scale = (70 / pr);

				if(Potree.debug.scale){
					scale = (Potree.debug.scale / pr);
				}

				const labelPos = label.position.clone();
				labelPos.add(new THREE.Vector3(0, 0, scale))
				label.position.copy(labelPos);

				label.scale.set(scale, scale, scale);
			}

			// { // area name label
			// 	let label = area.pathNameLabel;
			// 	let distance = label.position.distanceTo(camera.position);
			// 	let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
			// 	let scale = (70 / pr);

			// 	const labelPos = label.position.clone();
			// 	labelPos.sub(new THREE.Vector3(scale, 0, 0))
			// 	labelPos.add(new THREE.Vector3(0, 0, scale))
			// 	label.position.copy(labelPos);
			
			// 	label.scale.set(scale, scale, scale);
			// }


			{ // edges
				const materials = [
					...area.edges.map( (e) => e.material),
				];

				for(const material of materials){
					material.resolution.set(clientWidth, clientHeight);
				}
			}

			if(!this.showMetadataLabels){
				for(const label of area.metadataLabels){
					label.visible = false;
				}
			}

			// if(!this.showNameLabels){
			// 	area.pathNameLabel.visible = false;
			// }
		}
	}

	render(){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}
};

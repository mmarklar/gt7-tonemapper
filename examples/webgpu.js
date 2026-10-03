import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { gt7ToneMapping, gt7Uniforms } from '../src/GT7ToneMappingNode.js';

// Add these lines after creating your renderer, scene, and camera.
renderer.toneMapping = THREE.NoToneMapping;

const scenePass = pass( scene, camera );

const pipeline = new THREE.RenderPipeline( renderer );
pipeline.outputNode = gt7ToneMapping( scenePass );

// Parameters are live uniforms — no rebuild.
gt7Uniforms.displayPeakLuminance.value = 250;

function render() {
	pipeline.render();
}

export { render };

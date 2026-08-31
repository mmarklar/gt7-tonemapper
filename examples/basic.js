import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GT7ToneMappingPass } from '../src/index.js';

// Add these lines after creating your renderer, scene, and camera.
renderer.toneMapping = THREE.NoToneMapping;

const composer = new EffectComposer( renderer );
composer.addPass( new RenderPass( scene, camera ) );
composer.addPass( new GT7ToneMappingPass( { displayPeakLuminance: 250 } ) );
composer.addPass( new OutputPass() );

function render() {
	composer.render();
}

export { render };

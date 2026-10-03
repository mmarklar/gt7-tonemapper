# GT7 Tone Mapper for three.js

A drop-in post-processing implementation of Polyphony Digital's Gran Turismo 7 tone mapper. It uses the published GT7 curve and the ICtCp chroma mapping stage, with three.js linear-sRGB input/output conversion.

## Install

```sh
npm install gt7-tonemapper three
```

## Use

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GT7ToneMappingPass } from 'gt7-tonemapper';

renderer.toneMapping = THREE.NoToneMapping;

const composer = new EffectComposer( renderer );
composer.addPass( new RenderPass( scene, camera ) );
composer.addPass( new GT7ToneMappingPass() ); // SDR, 250-nit paper white
composer.addPass( new OutputPass() );          // sRGB output encoding
```

## Use with WebGPURenderer

The pass above is WebGL only — it is built on `EffectComposer`, which the node
pipeline does not use. For `WebGPURenderer`, take the TSL node instead:

```js
import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { gt7ToneMapping, gt7Uniforms } from 'gt7-tonemapper/node';

renderer.toneMapping = THREE.NoToneMapping;

const pipeline = new THREE.RenderPipeline( renderer );
pipeline.outputNode = gt7ToneMapping( pass( scene, camera ) );
```

Same operator, same defaults. It takes and returns a `vec4` in linear-sRGB, so it
wraps any node in the output chain and must come before the pipeline's own output
color transform — which `RenderPipeline` applies for you, and which still performs
the sRGB encode when the renderer's tone mapping is `NoToneMapping`.

The parameters are uniforms here rather than constructor options: write
`gt7Uniforms.displayPeakLuminance.value` and it takes effect on the next frame with
no shader rebuild. Swapping the operator in or out at runtime does need a rebuild —
reassign `pipeline.outputNode` and set `pipeline.needsUpdate = true`.

This entry point imports from `three/tsl` and nothing else, so it does not pull
`three` core in alongside your `three/webgpu`.

`GT7ToneMappingPass` accepts `displayPeakLuminance`, `sdrCorrection`, `blendRatio`, `fadeStart`, and `fadeEnd`. Defaults reproduce the published SDR configuration: 250 nits, a 0.4 SDR correction, 0.6 blend, and chroma fade from 0.98 to 1.16. For an HDR output pipeline, set `sdrCorrection: 1` and use the target display peak.

The pass expects linear-sRGB, which is three.js's default working color space, and performs its internal math in Rec.2020 / ICtCp. Do not put `OutputPass` before it.

## Attribution

This implementation is based on Polyphony Digital's MIT-licensed reference implementation from *Driving Toward Reality: Physically Based Tone Mapping and Perceptual Fidelity in Gran Turismo 7* (SIGGRAPH 2025). [cpp](https://blog.selfshadow.com/publications/s2025-shading-course/pdi/supplemental/gt7_tone_mapping.cpp)

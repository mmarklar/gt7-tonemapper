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

`GT7ToneMappingPass` accepts `displayPeakLuminance`, `sdrCorrection`, `blendRatio`, `fadeStart`, and `fadeEnd`. Defaults reproduce the published SDR configuration: 250 nits, a 0.4 SDR correction, 0.6 blend, and chroma fade from 0.98 to 1.16. For an HDR output pipeline, set `sdrCorrection: 1` and use the target display peak.

The pass expects linear-sRGB, which is three.js's default working color space, and performs its internal math in Rec.2020 / ICtCp. Do not put `OutputPass` before it.

## Attribution

This implementation is based on Polyphony Digital's MIT-licensed reference implementation from *Driving Toward Reality: Physically Based Tone Mapping and Perceptual Fidelity in Gran Turismo 7* (SIGGRAPH 2025).

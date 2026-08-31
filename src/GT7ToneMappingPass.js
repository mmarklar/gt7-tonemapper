import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GT7ToneMappingShader } from './GT7ToneMappingShader.js';

/**
 * Post-processing pass for the GT7 tone mapper.
 *
 * Add this after RenderPass and before OutputPass. Keep the renderer's native
 * tone mapping disabled so HDR scene values reach this pass unchanged.
 */
export class GT7ToneMappingPass extends ShaderPass {

	constructor( options = {} ) {

		super( GT7ToneMappingShader );

		const peak = options.displayPeakLuminance ?? 250;
		this.displayPeakLuminance = peak;
		this.sdrCorrection = options.sdrCorrection ?? 100 / peak;
		this.blendRatio = options.blendRatio ?? 0.6;
		this.fadeStart = options.fadeStart ?? 0.98;
		this.fadeEnd = options.fadeEnd ?? 1.16;

	}

	get displayPeakLuminance() { return this.uniforms.displayPeakLuminance.value; }
	set displayPeakLuminance( value ) { this.uniforms.displayPeakLuminance.value = value; }

	get sdrCorrection() { return this.uniforms.sdrCorrection.value; }
	set sdrCorrection( value ) { this.uniforms.sdrCorrection.value = value; }

	get blendRatio() { return this.uniforms.blendRatio.value; }
	set blendRatio( value ) { this.uniforms.blendRatio.value = value; }

	get fadeStart() { return this.uniforms.fadeStart.value; }
	set fadeStart( value ) { this.uniforms.fadeStart.value = value; }

	get fadeEnd() { return this.uniforms.fadeEnd.value; }
	set fadeEnd( value ) { this.uniforms.fadeEnd.value = value; }
}

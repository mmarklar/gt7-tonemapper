import type { Node, UniformNode } from 'three/webgpu';

/**
 * The GT7 operator's five parameters, live.
 *
 * Writing a `.value` takes effect on the next frame with no shader rebuild, so
 * these are what a tuning UI should drive.
 */
export declare const gt7Uniforms: {
	/** Peak luminance of the target display, in nits. Default 250. */
	displayPeakLuminance: UniformNode<'float', number>;
	/** Scales the operator's output back into 0-1 for an SDR framebuffer.
	 *  Default 0.4, which is `100 / displayPeakLuminance`. Set to 1 for HDR. */
	sdrCorrection: UniformNode<'float', number>;
	/** How far to blend from the per-channel curve toward the ICtCp
	 *  chroma-mapped result. Default 0.6. */
	blendRatio: UniformNode<'float', number>;
	/** Intensity, as a fraction of peak, at which chroma starts fading to
	 *  white. Default 0.98. */
	fadeStart: UniformNode<'float', number>;
	/** Intensity, as a fraction of peak, at which chroma has fully faded.
	 *  Default 1.16. */
	fadeEnd: UniformNode<'float', number>;
};

/**
 * Apply the GT7 tone mapper to a linear-sRGB color.
 *
 * Takes and returns a `vec4` with alpha passed through, so it can wrap a
 * `pass()` — or any other node — in a render pipeline's output chain. The
 * renderer's own tone mapping must be `NoToneMapping`, and this must come
 * before the output color transform.
 */
export declare function gt7ToneMapping( color: Node ): Node;

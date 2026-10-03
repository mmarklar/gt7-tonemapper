/**
 * The published GT7 parameters, in one place.
 *
 * Shared by the TSL node in `GT7ToneMappingNode.js`. The GLSL in
 * `GT7ToneMappingShader.js` still carries its own literals — a `const float` in
 * a shader source string cannot import anything — and the node test asserts the
 * two agree, so this file is the place to change a number and the test is what
 * catches a change made in only one of them.
 */

/** SDR reference white, in nits. The unit the operator's input is measured in:
 *  a scene value of 1.0 means this many nits, which is what makes
 *  `displayPeakLuminance / REFERENCE_LUMINANCE` the peak in scene units. */
export const REFERENCE_LUMINANCE = 100.0;

/**
 * The five tunable parameters, at the published SDR configuration: a 250-nit
 * display, a 0.4 SDR correction, a 0.6 blend toward the chroma-mapped result,
 * and a chroma fade running from 0.98 to 1.16 of peak intensity.
 *
 * `sdrCorrection` is the one worth understanding before changing it. It is
 * `REFERENCE_LUMINANCE / displayPeakLuminance`, and it is what scales the
 * operator's 250-nit output back into the 0-1 an SDR framebuffer can hold —
 * which is why diffuse white lands near 0.4 rather than near 1. Set it to 1 and
 * use the real display peak for an HDR output pipeline.
 */
export const GT7_DEFAULTS = {
	displayPeakLuminance: 250.0,
	sdrCorrection: 0.4,
	blendRatio: 0.6,
	fadeStart: 0.98,
	fadeEnd: 1.16
};

/**
 * The shape of the curve itself, which is not tunable — these are the published
 * coefficients and changing one stops it being the GT7 curve.
 *
 * `alpha` and `linearSection` set where the straight middle of the curve sits
 * and how steep it is; `grayPoint` is where the toe has finished blending into
 * it; `toeStrength` is the toe's exponent.
 */
export const GT7_CURVE = {
	alpha: 0.25,
	grayPoint: 0.538,
	linearSection: 0.444,
	toeStrength: 1.280
};

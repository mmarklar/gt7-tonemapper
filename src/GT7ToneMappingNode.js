/**
 * Gran Turismo 7 tone mapping operator, as a TSL node.
 *
 * The same operator as `GT7ToneMappingShader.js`, ported for three.js's node
 * material system so it can be used with `WebGPURenderer` and `RenderPipeline`
 * (formerly `PostProcessing`), where the WebGL `EffectComposer` passes do not
 * apply. Both are ports of the implementation released by Polyphony Digital
 * under the MIT License in "Driving Toward Reality: Physically Based Tone
 * Mapping and Perceptual Fidelity in Gran Turismo 7" (SIGGRAPH 2025).
 *
 * Input and output are linear-sRGB, three.js's default working color space, so
 * this belongs *before* the pipeline's output color transform and the renderer's
 * own tone mapping must be off:
 *
 * ```js
 * renderer.toneMapping = THREE.NoToneMapping;
 *
 * const pipeline = new THREE.RenderPipeline( renderer );
 * pipeline.outputNode = gt7ToneMapping( pass( scene, camera ) );
 * ```
 *
 * The operator itself runs in Rec.2020 and ICtCp.
 *
 * This module imports from `three/tsl` and nothing else. Not an accident: it
 * keeps the node renderer-agnostic, and it keeps a consumer that only wants the
 * node from pulling `three` core in beside its `three/webgpu`, which would ship
 * two copies of the library.
 */

import { Fn, float, max, min, mix, pow, clamp, exp, smoothstep, uniform, vec3, vec4 } from 'three/tsl';
import { GT7_CURVE, GT7_DEFAULTS, REFERENCE_LUMINANCE } from './GT7Constants.js';

/**
 * The operator's five parameters, live.
 *
 * Uniforms rather than baked constants so they can be dialled in a running
 * application with no shader rebuild — which is the whole point of having them
 * be parameters. Defaults are the published SDR configuration; see
 * `GT7Constants.js` for what each one does.
 */
export const gt7Uniforms = {
	displayPeakLuminance: uniform( GT7_DEFAULTS.displayPeakLuminance ),
	sdrCorrection: uniform( GT7_DEFAULTS.sdrCorrection ),
	blendRatio: uniform( GT7_DEFAULTS.blendRatio ),
	fadeStart: uniform( GT7_DEFAULTS.fadeStart ),
	fadeEnd: uniform( GT7_DEFAULTS.fadeEnd )
};

const PQ_N = 2610.0 / 16384.0;
const PQ_M = 2523.0 / 32.0;
const PQ_C1 = 3424.0 / 4096.0;
const PQ_C2 = 2413.0 / 128.0;
const PQ_C3 = 2392.0 / 128.0;

// The four color matrices are written out as explicit per-component sums rather
// than as `mat3` multiplies. `mat3( ... )` takes its arguments in column-major
// order, which is the transpose of how these coefficients read on the page, so
// the terse version is the version that is silently wrong half the time.

const linearSRGBToRec2020 = /*@__PURE__*/ Fn( ( [ c ] ) => vec3(
	c.r.mul( 0.6274040 ).add( c.g.mul( 0.3292820 ) ).add( c.b.mul( 0.0433136 ) ),
	c.r.mul( 0.0690970 ).add( c.g.mul( 0.9195400 ) ).add( c.b.mul( 0.0113612 ) ),
	c.r.mul( 0.0163916 ).add( c.g.mul( 0.0880132 ) ).add( c.b.mul( 0.8955952 ) )
) );

const rec2020ToLinearSRGB = /*@__PURE__*/ Fn( ( [ c ] ) => vec3(
	c.r.mul(  1.6604910 ).sub( c.g.mul( 0.5876411 ) ).sub( c.b.mul( 0.0728499 ) ),
	c.r.mul( -0.1245505 ).add( c.g.mul( 1.1328999 ) ).sub( c.b.mul( 0.0083494 ) ),
	c.r.mul( -0.0181508 ).sub( c.g.mul( 0.1005789 ) ).add( c.b.mul( 1.1187297 ) )
) );

const pqEncode = /*@__PURE__*/ Fn( ( [ luminance ] ) => {

	const p = pow( max( luminance.div( 10000.0 ), 0.0 ), PQ_N );
	return pow( float( PQ_C1 ).add( p.mul( PQ_C2 ) ).div( float( 1.0 ).add( p.mul( PQ_C3 ) ) ), PQ_M );

} );

const pqDecode = /*@__PURE__*/ Fn( ( [ signal ] ) => {

	const p = pow( clamp( signal, 0.0, 1.0 ), 1.0 / PQ_M );
	return pow( max( p.sub( PQ_C1 ), 0.0 ).div( float( PQ_C2 ).sub( p.mul( PQ_C3 ) ) ), 1.0 / PQ_N ).mul( 10000.0 );

} );

const rec2020ToICtCp = /*@__PURE__*/ Fn( ( [ physicalRgb ] ) => {

	const lms = pqEncode( vec3(
		physicalRgb.r.mul( 1688.0 ).add( physicalRgb.g.mul( 2146.0 ) ).add( physicalRgb.b.mul( 262.0 ) ).div( 4096.0 ),
		physicalRgb.r.mul(  683.0 ).add( physicalRgb.g.mul( 2951.0 ) ).add( physicalRgb.b.mul( 462.0 ) ).div( 4096.0 ),
		physicalRgb.r.mul(   99.0 ).add( physicalRgb.g.mul(  309.0 ) ).add( physicalRgb.b.mul( 3688.0 ) ).div( 4096.0 )
	) ).toVar();

	return vec3(
		lms.r.add( lms.g ).mul( 0.5 ),
		lms.r.mul(  6610.0 ).sub( lms.g.mul( 13613.0 ) ).add( lms.b.mul( 7003.0 ) ).div( 4096.0 ),
		lms.r.mul( 17933.0 ).sub( lms.g.mul( 17390.0 ) ).sub( lms.b.mul(  543.0 ) ).div( 4096.0 )
	);

} );

const iCtCpToRec2020 = /*@__PURE__*/ Fn( ( [ ictcp ] ) => {

	const lms = pqDecode( vec3(
		ictcp.r.add( ictcp.g.mul( 0.00860904 ) ).add( ictcp.b.mul( 0.11103000 ) ),
		ictcp.r.sub( ictcp.g.mul( 0.00860904 ) ).sub( ictcp.b.mul( 0.11103000 ) ),
		ictcp.r.add( ictcp.g.mul( 0.56003100 ) ).sub( ictcp.b.mul( 0.32062700 ) )
	) ).toVar();

	return max( vec3( 0.0 ), vec3(
		lms.r.mul(  3.4366100 ).sub( lms.g.mul( 2.5064500 ) ).add( lms.b.mul( 0.0698454 ) ),
		lms.r.mul( -0.7913300 ).add( lms.g.mul( 1.9836000 ) ).sub( lms.b.mul( 0.1922710 ) ),
		lms.r.mul( -0.0259499 ).sub( lms.g.mul( 0.0989137 ) ).add( lms.b.mul( 1.1248600 ) )
	) );

} );

/**
 * The GT7 curve: a power-function toe blended into a straight middle section,
 * closing into an exponential shoulder at `linearSection * peakIntensity`.
 *
 * The GLSL guards its input with an early `if ( x < 0.0 ) return 0.0`. Here that
 * is a `max` at entry, which is the same thing — the toe is zero at zero — and
 * avoids a branch that would have to be an `If` block. Both arms of the
 * remaining `select` are evaluated, which is safe: neither divides, and
 * `pow( 0, toeStrength )` is 0 rather than a NaN.
 */
const gt7Curve = /*@__PURE__*/ Fn( ( [ input, peakIntensity ] ) => {

	const x = max( input, 0.0 ).toVar();

	const k = float( ( GT7_CURVE.linearSection - 1.0 ) / ( GT7_CURVE.alpha - 1.0 ) ).toVar();
	const ka = peakIntensity.mul( k.add( GT7_CURVE.linearSection ) );
	const kb = peakIntensity.negate().mul( k ).mul( exp( k.reciprocal().mul( GT7_CURVE.linearSection ) ) );
	const kc = k.mul( peakIntensity ).reciprocal().negate();

	const linearWeight = smoothstep( 0.0, GT7_CURVE.grayPoint, x );
	const toe = pow( x.div( GT7_CURVE.grayPoint ), GT7_CURVE.toeStrength ).mul( GT7_CURVE.grayPoint );

	return x.lessThan( peakIntensity.mul( GT7_CURVE.linearSection ) ).select(
		mix( toe, x, linearWeight ),
		ka.add( kb.mul( exp( x.mul( kc ) ) ) )
	);

} );

/**
 * The operator proper, on a Rec.2020 color.
 *
 * Two results are computed and blended: the curve applied per channel, which
 * skews hue as channels clip at different points, and the same luminance carried
 * back onto the *source* chroma through ICtCp, which holds hue but oversaturates.
 * `blendRatio` picks the mix; `fadeStart`/`fadeEnd` roll the chroma off to white
 * as intensity approaches peak, so the brightest pixels desaturate rather than
 * hitting the gamut boundary and shifting hue.
 */
const gt7ToneMap = /*@__PURE__*/ Fn( ( [ color ] ) => {

	const peak = gt7Uniforms.displayPeakLuminance.div( REFERENCE_LUMINANCE ).toVar();

	const sourceIctcp = rec2020ToICtCp( color.mul( REFERENCE_LUMINANCE ) ).toVar();
	const skewed = vec3(
		gt7Curve( color.r, peak ),
		gt7Curve( color.g, peak ),
		gt7Curve( color.b, peak )
	).toVar();
	const skewedIctcp = rec2020ToICtCp( skewed.mul( REFERENCE_LUMINANCE ) ).toVar();

	const targetI = rec2020ToICtCp( vec3( gt7Uniforms.displayPeakLuminance ) ).r;
	const chromaScale = float( 1.0 ).sub(
		smoothstep( gt7Uniforms.fadeStart, gt7Uniforms.fadeEnd, sourceIctcp.r.div( targetI ) )
	);

	const gamutMapped = iCtCpToRec2020( vec3(
		skewedIctcp.r,
		sourceIctcp.g.mul( chromaScale ),
		sourceIctcp.b.mul( chromaScale )
	) ).div( REFERENCE_LUMINANCE );

	return min( mix( skewed, gamutMapped, gt7Uniforms.blendRatio ), vec3( peak ) ).mul( gt7Uniforms.sdrCorrection );

} );

/**
 * Apply the GT7 tone mapper to a linear-sRGB color.
 *
 * Takes and returns a `vec4`, passing alpha through untouched, so it can wrap a
 * `pass()` or any other node in a pipeline's output chain directly.
 */
export const gt7ToneMapping = /*@__PURE__*/ Fn( ( [ color ] ) => {

	const rec2020 = linearSRGBToRec2020( max( color.rgb, 0.0 ) );
	return vec4( rec2020ToLinearSRGB( gt7ToneMap( rec2020 ) ), color.a );

} );

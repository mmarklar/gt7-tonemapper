import test from 'node:test';
import assert from 'node:assert/strict';
import { GT7ToneMappingShader } from '../src/GT7ToneMappingShader.js';
import { GT7_CURVE, GT7_DEFAULTS, REFERENCE_LUMINANCE } from '../src/GT7Constants.js';

// The TSL node in GT7ToneMappingNode.js is a hand transcription of the GLSL in
// GT7ToneMappingShader.js, and the two cannot import from each other — a
// `const float` inside a shader source string is text, not a value. These tests
// are what stands in for that: they read the numbers back out of the GLSL and
// assert the shared constants still agree with them, so a parameter changed in
// one place fails here rather than showing up as a quiet difference between the
// WebGL and WebGPU paths.
//
// The node itself is not imported. That would pull in `three`, which is a peer
// dependency this package does not install, and `npm test` should keep working
// with no node_modules at all.

/** Pull `const float NAME = <number>;` out of the fragment shader. */
function shaderConstant( name ) {

	const match = GT7ToneMappingShader.fragmentShader.match(
		new RegExp( `const float ${ name }\\s*=\\s*(-?[0-9.]+)` )
	);
	assert.ok( match, `${ name } is no longer a top-level const in the fragment shader` );
	return Number( match[ 1 ] );

}

/** Pull `const float NAME = <number>;` out of the body of gt7Curve. */
function curveConstant( name ) {

	const body = GT7ToneMappingShader.fragmentShader.match( /float gt7Curve\([^]*?\n\t\t}/ );
	assert.ok( body, 'gt7Curve is no longer a top-level function in the fragment shader' );
	const match = body[ 0 ].match( new RegExp( `const float ${ name }\\s*=\\s*(-?[0-9.]+)` ) );
	assert.ok( match, `${ name } is no longer a const inside gt7Curve` );
	return Number( match[ 1 ] );

}

test( 'the shared parameter defaults match the shader uniforms', () => {

	for ( const [ name, value ] of Object.entries( GT7_DEFAULTS ) ) {

		assert.ok( GT7ToneMappingShader.uniforms[ name ], `shader has no ${ name } uniform` );
		assert.equal( GT7ToneMappingShader.uniforms[ name ].value, value, `${ name } drifted` );

	}

	// Every uniform except the input texture is a parameter, so the two sets
	// have to be the same size — a new uniform in the shader must reach the node.
	const parameters = Object.keys( GT7ToneMappingShader.uniforms ).filter( ( n ) => n !== 'tDiffuse' );
	assert.deepEqual( parameters.sort(), Object.keys( GT7_DEFAULTS ).sort() );

} );

test( 'the shared curve constants match the shader', () => {

	assert.equal( REFERENCE_LUMINANCE, shaderConstant( 'REFERENCE_LUMINANCE' ) );
	assert.equal( GT7_CURVE.alpha, curveConstant( 'alpha' ) );
	assert.equal( GT7_CURVE.grayPoint, curveConstant( 'grayPoint' ) );
	assert.equal( GT7_CURVE.linearSection, curveConstant( 'linearSection' ) );
	assert.equal( GT7_CURVE.toeStrength, curveConstant( 'toeStrength' ) );

} );

test( 'sdrCorrection is the reference-to-peak ratio the pass derives', () => {

	// GT7ToneMappingPass computes `100 / peak` when the caller gives a peak but
	// no correction. The shipped default pair has to be consistent with that, or
	// the node and the pass disagree about what "the published SDR config" is.
	assert.equal( GT7_DEFAULTS.sdrCorrection, REFERENCE_LUMINANCE / GT7_DEFAULTS.displayPeakLuminance );

} );

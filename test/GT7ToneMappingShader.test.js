import test from 'node:test';
import assert from 'node:assert/strict';
import { GT7ToneMappingShader } from '../src/GT7ToneMappingShader.js';

function curve( x, peak = 2.5 ) {
	if ( x < 0 ) return 0;
	const k = ( 0.444 - 1 ) / ( 0.25 - 1 );
	const ka = peak * ( 0.444 + k );
	const kb = -peak * k * Math.exp( 0.444 / k );
	const kc = -1 / ( k * peak );
	const t = Math.min( 1, Math.max( 0, x / 0.538 ) );
	const linearWeight = t * t * ( 3 - 2 * t );
	const toe = 0.538 * ( x / 0.538 ) ** 1.280;
	return x < 0.444 * peak ? toe * ( 1 - linearWeight ) + x * linearWeight : ka + kb * Math.exp( x * kc );
}

test( 'GT7 curve has the published toe, linear blend, and shoulder', () => {
	assert.equal( curve( -1 ), 0 );
	assert.ok( curve( 0.01 ) > 0 && curve( 0.01 ) < 0.01 );
	assert.ok( curve( 1.0 ) > 0.99 && curve( 1.0 ) < 1.01 );
	// The curve rolls off above peak; the final operator then clamps to peak.
	assert.ok( curve( 1000 ) < 2.964 );
	assert.ok( curve( 1000 ) > curve( 10 ) );
} );

test( 'shader contains the Rec.2020 / ICtCp color-volume mapping pipeline', () => {
	const source = GT7ToneMappingShader.fragmentShader;
	for ( const identifier of [
		'linearSRGBToRec2020', 'rec2020ToICtCp', 'iCtCpToRec2020',
		'rec2020ToLinearSRGB', 'pqEncode', 'pqDecode', 'gt7Curve'
	] ) assert.match( source, new RegExp( `\\b${ identifier }\\b` ) );
	assert.match( source, /sdrCorrection \* min\( mix\( skewed, gamutMapped, blendRatio \)/ );
} );

test( 'published SDR defaults are exposed', () => {
	assert.equal( GT7ToneMappingShader.uniforms.displayPeakLuminance.value, 250 );
	assert.equal( GT7ToneMappingShader.uniforms.sdrCorrection.value, 0.4 );
	assert.equal( GT7ToneMappingShader.uniforms.blendRatio.value, 0.6 );
} );

/**
 * Gran Turismo 7 tone mapping operator.
 *
 * Based on the implementation released by Polyphony Digital under the MIT
 * License in "Driving Toward Reality: Physically Based Tone Mapping and
 * Perceptual Fidelity in Gran Turismo 7" (SIGGRAPH 2025).
 *
 * Input and output are linear-sRGB, as used by three.js's default working
 * color space. The operator itself runs in Rec.2020 and ICtCp.
 */

export const GT7ToneMappingShader = {

	name: 'GT7ToneMappingShader',

	uniforms: {
		tDiffuse: { value: null },
		displayPeakLuminance: { value: 250.0 },
		sdrCorrection: { value: 0.4 },
		blendRatio: { value: 0.6 },
		fadeStart: { value: 0.98 },
		fadeEnd: { value: 1.16 }
	},

	vertexShader: /* glsl */`
		varying vec2 vUv;

		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}
	`,

	fragmentShader: /* glsl */`
		uniform sampler2D tDiffuse;
		uniform float displayPeakLuminance;
		uniform float sdrCorrection;
		uniform float blendRatio;
		uniform float fadeStart;
		uniform float fadeEnd;
		varying vec2 vUv;

		const float REFERENCE_LUMINANCE = 100.0;
		const float PQ_N = 2610.0 / 16384.0;
		const float PQ_M = 2523.0 / 32.0;
		const float PQ_C1 = 3424.0 / 4096.0;
		const float PQ_C2 = 2413.0 / 128.0;
		const float PQ_C3 = 2392.0 / 128.0;

		vec3 linearSRGBToRec2020( vec3 c ) {
			return vec3(
				0.6274040 * c.r + 0.3292820 * c.g + 0.0433136 * c.b,
				0.0690970 * c.r + 0.9195400 * c.g + 0.0113612 * c.b,
				0.0163916 * c.r + 0.0880132 * c.g + 0.8955952 * c.b
			);
		}

		vec3 rec2020ToLinearSRGB( vec3 c ) {
			return vec3(
				 1.6604910 * c.r - 0.5876411 * c.g - 0.0728499 * c.b,
				-0.1245505 * c.r + 1.1328999 * c.g - 0.0083494 * c.b,
				-0.0181508 * c.r - 0.1005789 * c.g + 1.1187297 * c.b
			);
		}

		vec3 pqEncode( vec3 luminance ) {
			vec3 p = pow( max( luminance / 10000.0, 0.0 ), vec3( PQ_N ) );
			return pow( ( PQ_C1 + PQ_C2 * p ) / ( 1.0 + PQ_C3 * p ), vec3( PQ_M ) );
		}

		vec3 pqDecode( vec3 signal ) {
			vec3 p = pow( clamp( signal, 0.0, 1.0 ), vec3( 1.0 / PQ_M ) );
			return 10000.0 * pow( max( p - PQ_C1, 0.0 ) / ( PQ_C2 - PQ_C3 * p ), vec3( 1.0 / PQ_N ) );
		}

		vec3 rec2020ToICtCp( vec3 physicalRgb ) {
			vec3 lms = vec3(
				( 1688.0 * physicalRgb.r + 2146.0 * physicalRgb.g + 262.0 * physicalRgb.b ) / 4096.0,
				( 683.0 * physicalRgb.r + 2951.0 * physicalRgb.g + 462.0 * physicalRgb.b ) / 4096.0,
				( 99.0 * physicalRgb.r + 309.0 * physicalRgb.g + 3688.0 * physicalRgb.b ) / 4096.0
			);
			lms = pqEncode( lms );
			return vec3(
				0.5 * ( lms.r + lms.g ),
				( 6610.0 * lms.r - 13613.0 * lms.g + 7003.0 * lms.b ) / 4096.0,
				( 17933.0 * lms.r - 17390.0 * lms.g - 543.0 * lms.b ) / 4096.0
			);
		}

		vec3 iCtCpToRec2020( vec3 ictcp ) {
			vec3 lms = pqDecode( vec3(
				ictcp.r + 0.00860904 * ictcp.g + 0.11103000 * ictcp.b,
				ictcp.r - 0.00860904 * ictcp.g - 0.11103000 * ictcp.b,
				ictcp.r + 0.56003100 * ictcp.g - 0.32062700 * ictcp.b
			) );
			return max( vec3( 0.0 ), vec3(
				 3.4366100 * lms.r - 2.5064500 * lms.g + 0.0698454 * lms.b,
				-0.7913300 * lms.r + 1.9836000 * lms.g - 0.1922710 * lms.b,
				-0.0259499 * lms.r - 0.0989137 * lms.g + 1.1248600 * lms.b
			) );
		}

		float gt7Curve( float x, float peakIntensity ) {
			if ( x < 0.0 ) return 0.0;

			const float alpha = 0.25;
			const float grayPoint = 0.538;
			const float linearSection = 0.444;
			const float toeStrength = 1.280;
			float k = ( linearSection - 1.0 ) / ( alpha - 1.0 );
			float ka = peakIntensity * ( linearSection + k );
			float kb = -peakIntensity * k * exp( linearSection / k );
			float kc = -1.0 / ( k * peakIntensity );
			float linearWeight = smoothstep( 0.0, grayPoint, x );
			float toe = grayPoint * pow( x / grayPoint, toeStrength );

			return x < linearSection * peakIntensity
				? mix( toe, x, linearWeight )
				: ka + kb * exp( x * kc );
		}

		vec3 gt7ToneMap( vec3 color ) {
			float peak = displayPeakLuminance / REFERENCE_LUMINANCE;
			vec3 sourceIctcp = rec2020ToICtCp( color * REFERENCE_LUMINANCE );
			vec3 skewed = vec3(
				gt7Curve( color.r, peak ),
				gt7Curve( color.g, peak ),
				gt7Curve( color.b, peak )
			);
			vec3 skewedIctcp = rec2020ToICtCp( skewed * REFERENCE_LUMINANCE );
			float targetI = rec2020ToICtCp( vec3( displayPeakLuminance ) ).r;
			float chromaScale = 1.0 - smoothstep( fadeStart, fadeEnd, sourceIctcp.r / targetI );
			vec3 gamutMapped = iCtCpToRec2020( vec3(
				skewedIctcp.r,
				sourceIctcp.g * chromaScale,
				sourceIctcp.b * chromaScale
			) ) / REFERENCE_LUMINANCE;

			return sdrCorrection * min( mix( skewed, gamutMapped, blendRatio ), vec3( peak ) );
		}

		void main() {
			vec4 texel = texture2D( tDiffuse, vUv );
			vec3 rec2020 = linearSRGBToRec2020( max( texel.rgb, 0.0 ) );
			gl_FragColor = vec4( rec2020ToLinearSRGB( gt7ToneMap( rec2020 ) ), texel.a );
		}
	`
};

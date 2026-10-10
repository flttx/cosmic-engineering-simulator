import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import { AdditiveBlending, Group, ShaderMaterial, SRGBColorSpace, TextureLoader } from 'three';
import type { Texture } from 'three';
import { useThree } from '@react-three/fiber';
import type { SceneProps } from '../types';

export const SOLAR_RADIUS = 10.4;

const vertexShader = `
varying vec3 observationNormal;
varying vec3 viewNormal;
varying vec3 viewDirection;
void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  viewNormal = normalize(normalMatrix * normal);
  vec3 forward = normalize(-modelViewMatrix[3].xyz);
  vec3 up = abs(forward.y) < .99 ? vec3(0.,1.,0.) : vec3(1.,0.,0.);
  vec3 right = normalize(cross(up,forward));
  up = cross(forward,right);
  observationNormal = vec3(dot(viewNormal,right),dot(viewNormal,up),dot(viewNormal,forward));
  viewDirection = normalize(-viewPosition.xyz);
  gl_Position = projectionMatrix * viewPosition;
}`;

// ponytail: keep a single SDO disk facing the observer; a rotating measured surface needs a full-sphere dataset.
const fragmentShader = `
uniform sampler2D observation;
uniform float ready;
varying vec3 observationNormal;
varying vec3 viewNormal;
varying vec3 viewDirection;
void main() {
  vec3 p = normalize(observationNormal);
  float mu = clamp(dot(normalize(viewNormal),normalize(viewDirection)),0.0,1.0);
  vec2 sampleUV = p.xy * .418 + .5;
  vec3 observed = texture2D(observation,sampleUV).rgb;
  vec3 color = observed * (.8 + .2 * mu);
  vec3 fallback = vec3(.55,.20,.035) * (.4+.6*mu);
  gl_FragColor = vec4(mix(fallback,color,ready),1.0);
  #include <colorspace_fragment>
}`;

const haloFragment = `
varying vec2 haloUV;
void main() {
  float radius = length((haloUV-.5)*2.0);
  float edge = 1.0/1.16;
  float light = exp(-max(radius-edge,0.0)*48.0)*.14;
  light *= smoothstep(edge-.012,edge+.012,radius);
  light *= 1.0-smoothstep(.96,1.0,radius);
  gl_FragColor = vec4(vec3(1.0,.57,.10),light);
}`;

export default function StellarBody({ state, onSelect, onFocus, onSolarStatus }: Pick<SceneProps, 'state' | 'onSelect' | 'onFocus' | 'onSolarStatus'>) {
  const material = useRef<ShaderMaterial>(null);
  const halo = useRef<Group>(null);
  const gl = useThree(value => value.gl);
  const uniforms = useMemo(() => ({ observation: { value: null as Texture | null }, ready: { value: 0 } }), []);
  useEffect(() => {
    const shader = material.current;
    if (!shader) return;
    let disposed = false;
    let texture: Texture | null = null;
    shader.uniforms.ready.value = 0;
    onSolarStatus('loading');
    new TextureLoader().load('/assets/solar/nasa_aia_171.jpg', result => {
      if (disposed) { result.dispose(); return; }
      texture = result;
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      shader.uniforms.observation.value = texture;
      shader.uniforms.ready.value = 1;
      onSolarStatus('ready');
    }, undefined, () => { if (!disposed) onSolarStatus('fallback'); });
    return () => { disposed = true; texture?.dispose(); };
  }, [gl, uniforms, onSolarStatus]);
  useFrame(({ camera }) => {
    if (!material.current) return;
    const distance = camera.position.length();
    // Match the perspective silhouette; this is restrained lens scatter, not visible corona or vacuum fog.
    const correction = distance > SOLAR_RADIUS ? distance / Math.sqrt(distance * distance - SOLAR_RADIUS * SOLAR_RADIUS) : 1;
    halo.current?.scale.setScalar(correction);
  });
  return <group><mesh onClick={event => { event.stopPropagation(); if (event.delta < 4) onSelect('sun'); }} onDoubleClick={event => { event.stopPropagation(); onFocus('sun'); }}>
    <sphereGeometry args={[SOLAR_RADIUS, state.quality === 'low' ? 64 : 96, state.quality === 'low' ? 48 : 64]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} toneMapped={false} />
  </mesh>
    <Billboard ref={halo}><mesh renderOrder={1} raycast={() => undefined}>
      <planeGeometry args={[SOLAR_RADIUS * 2.32, SOLAR_RADIUS * 2.32]} />
      <shaderMaterial uniforms={uniforms} vertexShader="varying vec2 haloUV; void main(){haloUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}" fragmentShader={haloFragment} transparent depthWrite={false} depthTest blending={AdditiveBlending} toneMapped={false} />
    </mesh></Billboard>
  </group>;
}

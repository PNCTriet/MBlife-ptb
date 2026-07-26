"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import * as THREE from "three";

const PARTICLE_COUNT = 400;

function createParticlePositions(): Float32Array {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  let seed = 1987;

  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (random() - 0.5) * 24;
    positions[i * 3 + 1] = (random() - 0.5) * 14;
    positions[i * 3 + 2] = (random() - 0.5) * 12;
  }

  return positions;
}

const PARTICLE_POSITIONS = createParticlePositions();

function GoldRing() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.15;
      ref.current.rotation.y += delta * 0.25;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={ref}>
        <torusGeometry args={[2.4, 0.06, 32, 120]} />
        <meshStandardMaterial
          color="#d4af37"
          emissive="#8b6914"
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>
    </Float>
  );
}

function InnerGlow() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
      ref.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.2, 48, 48]} />
      <meshStandardMaterial
        color="#1a2744"
        emissive="#2a4a7a"
        emissiveIntensity={0.35}
        transparent
        opacity={0.55}
      />
    </mesh>
  );
}

function ParticleField() {
  const ref = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[PARTICLE_POSITIONS, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#f5d77a"
        transparent
        opacity={0.7}
        sizeAttenuation
      />
    </points>
  );
}

export default function Scene3D({ active }: { active: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#050a14"]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color="#ffd87a" />
      <pointLight position={[-4, -2, 2]} intensity={0.6} color="#4a7cff" />
      <Stars
        radius={80}
        depth={40}
        count={3000}
        factor={3}
        saturation={0.2}
        fade
        speed={0.5}
      />
      <ParticleField />
      {active && (
        <>
          <GoldRing />
          <InnerGlow />
        </>
      )}
    </Canvas>
  );
}

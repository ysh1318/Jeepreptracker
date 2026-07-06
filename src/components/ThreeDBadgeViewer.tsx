import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// 3D Star component made from two intersecting pyramids (cones)
function Star3D({ position, scale = 1, color = '#ffffff' }: { position: [number, number, number]; scale?: number; color?: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 1.5;
    }
  });
  return (
    <group ref={ref} position={position} scale={[scale, scale, scale]}>
      <mesh>
        <coneGeometry args={[0.3, 0.7, 4]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.3, 0.7, 4]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// 1. Bronze Assembly: Bronze Shield + Outer Copper Ring
function BronzeBadge() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
    }
  });
  return (
    <group ref={groupRef}>
      {/* Shield Backing */}
      <mesh>
        <cylinderGeometry args={[1.0, 0.8, 0.25, 6]} />
        <meshStandardMaterial color="#8a4f2a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Outer Torus Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.1, 8, 32]} />
        <meshStandardMaterial color="#cd7f32" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// 2. Silver Assembly: Silver Shield + Glowing Center Star
function SilverBadge() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
    }
  });
  return (
    <group ref={groupRef}>
      {/* Shield */}
      <mesh>
        <cylinderGeometry args={[1.1, 0.9, 0.25, 6]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Center Star */}
      <Star3D position={[0, 0, 0.2]} scale={1.1} color="#60a5fa" />
    </group>
  );
}

// 3. Gold Assembly: Gold Shield + Double Wings
function GoldBadge() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
    }
  });
  return (
    <group ref={groupRef}>
      {/* Shield */}
      <mesh>
        <cylinderGeometry args={[1.1, 0.9, 0.25, 6]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Left Wing */}
      <mesh position={[-0.9, 0, -0.1]} rotation={[0, 0.2, 0.4]}>
        <boxGeometry args={[0.5, 0.8, 0.1]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Right Wing */}
      <mesh position={[0.9, 0, -0.1]} rotation={[0, -0.2, -0.4]}>
        <boxGeometry args={[0.5, 0.8, 0.1]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Star */}
      <Star3D position={[0, 0, 0.2]} scale={0.9} color="#ffffff" />
    </group>
  );
}

// 4. Platinum Assembly: Platinum Shield + Floating Rings
function PlatinumBadge() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
    if (ringRef.current) ringRef.current.rotation.z = -state.clock.getElapsedTime() * 1.0;
  });
  return (
    <group ref={groupRef}>
      {/* Shield */}
      <mesh>
        <cylinderGeometry args={[1.2, 1.0, 0.25, 6]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Diagonal Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <torusGeometry args={[1.4, 0.08, 8, 32]} />
        <meshStandardMaterial color="#10b981" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Star */}
      <Star3D position={[0, 0, 0.25]} scale={1.0} color="#34d399" />
    </group>
  );
}

// 5. Diamond Assembly: Rotating Diamond Gem Inside Platinum Frame
function DiamondBadge() {
  const groupRef = useRef<THREE.Group>(null);
  const gemRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    if (gemRef.current) gemRef.current.rotation.y = state.clock.getElapsedTime() * 1.2;
  });
  return (
    <group ref={groupRef}>
      {/* Outer Torus Frame */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.15, 12, 48]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Rotating Inner Diamond Gem */}
      <mesh ref={gemRef} scale={[0.8, 1.2, 0.8]}>
        <octahedronGeometry args={[1.0, 0]} />
        <MeshDistortMaterial
          color="#06b6d4"
          roughness={0.01}
          metalness={0.9}
          distort={0.1}
          speed={2}
          clearcoat={1.0}
        />
      </mesh>
    </group>
  );
}

// 6. Heroic Assembly: Red Ruby Crystal + Golden Wings & Flaming Halo
function HeroicBadge() {
  const groupRef = useRef<THREE.Group>(null);
  const gemRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
    if (gemRef.current) gemRef.current.rotation.x = state.clock.getElapsedTime() * 0.8;
  });
  return (
    <group ref={groupRef}>
      {/* Left Golden Crest Wing */}
      <mesh position={[-0.8, 0.3, -0.2]} rotation={[0.2, 0.2, 0.8]}>
        <coneGeometry args={[0.3, 1.2, 4]} />
        <meshStandardMaterial color="#ea580c" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Right Golden Crest Wing */}
      <mesh position={[0.8, 0.3, -0.2]} rotation={[0.2, -0.2, -0.8]}>
        <coneGeometry args={[0.3, 1.2, 4]} />
        <meshStandardMaterial color="#ea580c" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Central Red Ruby */}
      <mesh ref={gemRef} scale={[0.8, 1.3, 0.8]}>
        <octahedronGeometry args={[0.9, 0]} />
        <MeshDistortMaterial
          color="#ef4444"
          roughness={0.02}
          metalness={0.9}
          distort={0.2}
          speed={3}
          clearcoat={1.0}
        />
      </mesh>
      {/* Base Ring */}
      <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.08, 8, 24]} />
        <meshStandardMaterial color="#ea580c" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// 7. Grandmaster Assembly: Royal Crown Crest + Golden Aura + Orbiting Stars
function GrandmasterBadge() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
    if (coreRef.current) {
      coreRef.current.rotation.y = state.clock.getElapsedTime() * 1.5;
      coreRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 2) * 0.1;
    }
  });
  return (
    <group ref={groupRef}>
      {/* Crown Arch Base */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.12, 12, 48]} />
        <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Crown Spike 1 (Center) */}
      <mesh position={[0, 0.8, -0.1]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.2, 0.7, 4]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Crown Spike 2 (Left) */}
      <mesh position={[-0.6, 0.6, -0.1]} rotation={[0, 0, 0.4]}>
        <coneGeometry args={[0.15, 0.6, 4]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Crown Spike 3 (Right) */}
      <mesh position={[0.6, 0.6, -0.1]} rotation={[0, 0, -0.4]}>
        <coneGeometry args={[0.15, 0.6, 4]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Central Rotating Golden Sun / Diamond */}
      <mesh ref={coreRef} scale={[0.8, 1.2, 0.8]}>
        <octahedronGeometry args={[0.8, 0]} />
        <MeshDistortMaterial
          color="#fbbf24"
          roughness={0.01}
          metalness={0.95}
          distort={0.25}
          speed={4}
          clearcoat={1.0}
        />
      </mesh>
      {/* Orbiting Stars */}
      <Star3D position={[-1.5, 0, 0]} scale={0.6} color="#ffffff" />
      <Star3D position={[1.5, 0, 0]} scale={0.6} color="#ffffff" />
    </group>
  );
}

interface ThreeDBadgeViewerProps {
  rankTitle: string;
}

export default function ThreeDBadgeViewer({ rankTitle }: ThreeDBadgeViewerProps) {
  const renderBadge = () => {
    const t = rankTitle.toLowerCase();
    if (t.includes('grandmaster')) return <GrandmasterBadge />;
    if (t.includes('heroic')) return <HeroicBadge />;
    if (t.includes('diamond')) return <DiamondBadge />;
    if (t.includes('platinum')) return <PlatinumBadge />;
    if (t.includes('gold')) return <GoldBadge />;
    if (t.includes('silver')) return <SilverBadge />;
    return <BronzeBadge />;
  };

  return (
    <div className="w-full h-full min-h-[145px] relative select-none">
      <Canvas shadows camera={{ position: [0, 0, 3.8], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.8} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.6} />
        
        <Suspense fallback={null}>
          <Float speed={2.0} rotationIntensity={0.6} floatIntensity={0.6}>
            {renderBadge()}
          </Float>
          <OrbitControls enableZoom={false} autoRotate={false} />
        </Suspense>
      </Canvas>
    </div>
  );
}

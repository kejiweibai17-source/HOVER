"use client";

import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import * as THREE from "three";
import { ReactLenis } from "@studio-freight/react-lenis";

import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib";
RectAreaLightUniformsLib.init();
function Model({ setInfoVisible, groupRef, showScanLight }) {
  const { scene } = useGLTF("/assets/josta.glb");
  const scanLightRef = useRef();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const oldMaterial = child.material;
        if (!(oldMaterial instanceof THREE.MeshStandardMaterial)) {
          const newMaterial = new THREE.MeshStandardMaterial({
            color: oldMaterial.color || new THREE.Color("#ffffff"),
            map: oldMaterial.map || null,
            roughness: 0.4,
            metalness: 0.1,
            transparent: oldMaterial.transparent || false,
            opacity: oldMaterial.opacity || 1,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0,
          });
          child.material = newMaterial;
        } else {
          child.material.roughness = 0.4;
          child.material.metalness = 0.1;
          child.material.emissiveIntensity = 0;
        }
      }
    });

    const update = () => {
      const scroll = window.scrollY / window.innerHeight;
      if (!groupRef.current) {
        requestAnimationFrame(update);
        return;
      }

      const spinStart = 5.3;
      groupRef.current.position.y = -Math.min(scroll, spinStart) * 0.06;

      if (scroll < 4.5) {
        groupRef.current.rotation.y = scroll * Math.PI * 1.5;
        groupRef.current.rotation.x = Math.sin(scroll * Math.PI) * 0.5;
      } else if (scroll >= spinStart) {
        groupRef.current.rotation.y = Math.PI * 6;
        groupRef.current.rotation.x = 0.25;
      } else {
        groupRef.current.rotation.y += (0 - groupRef.current.rotation.y) * 0.05;
        groupRef.current.rotation.x += (0 - groupRef.current.rotation.x) * 0.05;
      }

      if (scroll > 1 && scroll < 1.8) {
        setInfoVisible(true);
      } else {
        setInfoVisible(false);
      }

      requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  }, [scene, setInfoVisible, groupRef]);

  return (
    <group>
      <primitive ref={groupRef} object={scene} scale={1} position={[0, 0, 0]} />
      {showScanLight && (
        <rectAreaLight
          ref={scanLightRef}
          width={2.5}
          height={0.2}
          intensity={25}
          color="#ff0033"
          position={[-2, 1, 1]}
          lookAt={[0, 0, 0]} // 讓它朝向模型
        />
      )}
    </group>
  );
}

export default function Scroll3DExperience() {
  const soundRef = useRef(null);
  const modelGroupRef = useRef(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [showScanLight, setShowScanLight] = useState(false);
  const checkoutRef = useRef(null);
  const [isSticky, setIsSticky] = useState(false);
  const soundPlayedOnce = useRef(false);

  useEffect(() => {
    const lenis = new Lenis({ smooth: true });
    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    const unlock = () => {
      if (soundRef.current) {
        soundRef.current.play().then(() => {
          soundRef.current.pause();
          soundRef.current.currentTime = 0;
        });
      }
      window.removeEventListener("click", unlock);
    };
    window.addEventListener("click", unlock);

    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.create({
      trigger: checkoutRef.current,
      start: "top center",
      end: "+=200vh",
      onEnter: () => {
        setTimeout(() => {
          setIsSticky(true);
          setShowScanLight(true);
          if (!soundPlayedOnce.current && soundRef.current) {
            soundRef.current.currentTime = 0;
            soundRef.current.play().catch(() => {});
            soundPlayedOnce.current = true;
          }
          if (modelGroupRef.current) {
            gsap.to(modelGroupRef.current.position, {
              y: -5.3 * 0.06,
              duration: 1.2,
              ease: "power2.out",
            });
          }
        }, 800); // 延遲 800ms 執行
      },

      onLeave: () => {
        setIsSticky(false);
        setShowScanLight(false);
      },
      onEnterBack: () => {
        setIsSticky(true);
        setShowScanLight(true);
      },
      onLeaveBack: () => {
        setIsSticky(false);
        setShowScanLight(false);
        soundPlayedOnce.current = false;
      },
    });
  }, []);

  return (
    <ReactLenis root>
      <div>
        <div className="relative w-full h-[640vh] text-black">
          <div className="title absolute top-20 left-1/2 -translate-x-1/2 flex flex-col justify-center items-center">
            <h1 className="text-[13rem] text-[#ff452c] font-extrabold ">
              BEVERAGE
            </h1>
          </div>
          <div className="title absolute top-[7%] z-50 left-1/2 -translate-x-1/2 flex flex-col justify-center items-center">
            <p className="text-[5rem] text-[#ff452c] font-normal ">EVERY DAY</p>
          </div>
          <div className="sticky top-0 h-screen z-0">
            <Canvas
              shadows
              camera={{ position: [0, 0, 4], fov: 75 }}
              gl={{ toneMappingExposure: 1.0 }}
              className="w-full h-full"
            >
              <hemisphereLight
                skyColor="#cceeff"
                groundColor="#ffffff"
                intensity={0.8}
              />
              <ambientLight intensity={0.6} />
              <directionalLight
                castShadow
                intensity={3}
                position={[5, 10, 5]}
              />
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
              <Model
                setInfoVisible={setInfoVisible}
                groupRef={modelGroupRef}
                showScanLight={showScanLight}
              />
            </Canvas>
          </div>

          <audio ref={soundRef} src="/assets/scan-sfx.mp3" preload="auto" />

          <section
            id="section-1"
            className="h-[200vh] flex items-center justify-center z-10 relative"
          >
            <h1 className="text-4xl">滑動來旋轉 3D 產品</h1>
            <h2 className="font-extrabold text-[#ff4e08]">BEVERAGE</h2>
          </section>

          <section
            id="section-2"
            className="flex h-[150vh] items-center justify-center z-10 relative"
          >
            <h2 className="text-2xl">探索產品資訊</h2>
            {infoVisible && (
              <div className="absolute top-[20%] right-[10%] bg-white/90 backdrop-blur-lg p-6 rounded-lg border border-black max-w-xs">
                <h3 className="text-xl mb-2">Josta 產品介紹</h3>
                <p className="text-sm leading-relaxed">
                  這是一款設計極簡的產品，展現優雅與科技感。可作為展示或購買使用，讓生活充滿品味。
                </p>
              </div>
            )}
          </section>

          <div ref={checkoutRef} className=" sticky top-20">
            <div className="absolute bottom-0 left-5 z-30">
              <img
                src="/assets/barcode.png"
                alt="QR Code"
                width={200}
                height={80}
              />
            </div>
            <div className="absolute bottom-8 right-5 z-30">
              <button className="border-rose-500 border-2 rounded-[30px] px-4 py-1 text-rose-600 text-[1.2rem] font-bold">
                checkout Now!
              </button>
            </div>
            <h2 className="text-2xl mb-4">Checkout!</h2>
            <div className="flex w-full">
              <div className="qr-img h-full w-[20%] flex flex-col justify-end  items-end " />
              <div className="square flex justify-center w-[60%] items-center">
                <div className="w-[400px] h-[550px] border-2 border-gray-700 rounded-[40px] p-2" />
              </div>
              <div className="qr-img h-full w-[20%] flex flex-col justify-end  items-end " />
            </div>
          </div>

          <section className="h-[200vh]" />
        </div>
      </div>
    </ReactLenis>
  );
}

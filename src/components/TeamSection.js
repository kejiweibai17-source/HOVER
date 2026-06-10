"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/dist/SplitText";

export default function TeamSection() {
  const containerRef = useRef(null);
  const profileImagesContainerRef = useRef(null);
  const profileImagesRef = useRef([]);
  const nameElementsRef = useRef([]);
  const nameHeadingsRef = useRef([]);

  useGSAP(
    () => {
      if (typeof window !== "undefined") {
        gsap.registerPlugin(SplitText);
      }

      const profileImagesContainer = profileImagesContainerRef.current;
      const profileImages = profileImagesRef.current;
      const nameElements = nameElementsRef.current;
      const nameHeadings = nameHeadingsRef.current.filter(Boolean);

      nameHeadings.forEach((heading) => {
        const split = new SplitText(heading, { type: "chars" });
        split.chars.forEach((char) => {
          char.classList.add("letter");
        });
      });

      if (nameElements[0]) {
        const defaultLetters = nameElements[0].querySelectorAll(".letter");
        gsap.set(defaultLetters, { y: "100%" });

        if (window.innerWidth >= 900) {
          profileImages.forEach((img, index) => {
            if (!img) return;

            const correspondingName = nameElements[index + 1];
            if (!correspondingName) return;

            const letters = correspondingName.querySelectorAll(".letter");

            img.addEventListener("mouseenter", () => {
              gsap.to(img, {
                width: 140,
                height: 140,
                duration: 0.5,
                ease: "power4.out",
              });

              gsap.to(letters, {
                y: "-100%",
                ease: "power4.out",
                duration: 0.75,
                stagger: {
                  each: 0.025,
                  from: "center",
                },
              });
            });

            img.addEventListener("mouseleave", () => {
              gsap.to(img, {
                width: 70,
                height: 70,
                duration: 0.5,
                ease: "power4.out",
              });

              gsap.to(letters, {
                y: "0%",
                ease: "power4.out",
                duration: 0.75,
                stagger: {
                  each: 0.025,
                  from: "center",
                },
              });
            });
          });

          if (profileImagesContainer) {
            profileImagesContainer.addEventListener("mouseenter", () => {
              const defaultLetters =
                nameElements[0].querySelectorAll(".letter");
              gsap.to(defaultLetters, {
                y: "0%",
                ease: "power4.out",
                duration: 0.75,
                stagger: {
                  each: 0.025,
                  from: "center",
                },
              });
            });

            profileImagesContainer.addEventListener("mouseleave", () => {
              const defaultLetters =
                nameElements[0].querySelectorAll(".letter");
              gsap.to(defaultLetters, {
                y: "100%",
                ease: "power4.out",
                duration: 0.75,
                stagger: {
                  each: 0.025,
                  from: "center",
                },
              });
            });
          }
        }
      }

      return () => {
        if (window.innerWidth >= 900) {
          profileImages.forEach((img, index) => {
            if (!img) return;

            img.removeEventListener("mouseenter", () => {});
            img.removeEventListener("mouseleave", () => {});
          });

          if (profileImagesContainer) {
            profileImagesContainer.removeEventListener("mouseenter", () => {});
            profileImagesContainer.removeEventListener("mouseleave", () => {});
          }
        }
      };
    },
    { scope: containerRef }
  );

  return (
    <section className="team" ref={containerRef}>
      <div className="profile-images" ref={profileImagesContainerRef}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num, index) => (
          <div
            key={`img${num}`}
            className="img"
            ref={(el) => (profileImagesRef.current[index] = el)}
          >
            <Image
              src={`/img${num}.jpeg`}
              alt={`Team member ${num}`}
              width={140}
              height={140}
              priority={index < 4}
            />
          </div>
        ))}
      </div>

      <div className="profile-names">
        <div
          className="name default"
          ref={(el) => (nameElementsRef.current[0] = el)}
        >
          <h1 ref={(el) => (nameHeadingsRef.current[0] = el)}>The Squad</h1>
        </div>
        {[
          "Taipei ",
          "Taichung",
          "Nantou",
          "Chiayi",
          "Tainan",
          "Kaohsiung",
          "Pingtung",
          "Yilan",
          "Hualien",
        ].map((name, index) => (
          <div
            key={name}
            className="name"
            ref={(el) => (nameElementsRef.current[index + 1] = el)}
          >
            <h1 ref={(el) => (nameHeadingsRef.current[index + 1] = el)}>
              {name}
            </h1>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";

type HeroCarouselImage = {
  src: string;
  alt: string;
};

type HeroCarouselProps = {
  images: HeroCarouselImage[];
};

export default function HeroCarousel({ images }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [images.length]);

  const activeImage = images[activeIndex];

  return (
    <div className="home-carousel-shell">
      <div className="home-carousel" aria-label="Galería de trabajos Delifesti">
        <div className="home-carousel-frame">
          <img className="home-carousel-image" src={activeImage.src} alt={activeImage.alt} />
        </div>
      </div>
      <div className="home-carousel-controls">
        <div className="home-carousel-dots" aria-hidden="true">
          {images.map((image, index) => (
            <span className={index === activeIndex ? "home-carousel-dot-active" : ""} key={image.src} />
          ))}
        </div>
      </div>
    </div>
  );
}

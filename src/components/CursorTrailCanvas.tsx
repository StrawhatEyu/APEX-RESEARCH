import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  maxLife: number; // in frames, e.g. 30 frames is ~0.5s at 60fps
  life: number;
}

export default function CursorTrailCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Set canvas dimensions
    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Clean, beautiful, pure white glowing particle trail
    const colors = [
      "rgba(255, 255, 255, "
    ];

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const now = performance.now();
      
      const dx = x - lastMousePos.current.x;
      const dy = y - lastMousePos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = now - lastMousePos.current.time;
      
      // Speed threshold: only generate a substantial trail if cursor moves quickly
      const speed = dt > 0 ? dist / dt : 0;

      // Cap maximum particles in list to keep render pipeline safe (especially on mobile)
      if (particles.length < 100) {
        // Number of particles depends on speed
        const count = Math.min(6, Math.max(1, Math.floor(speed * 2)));
        
        for (let i = 0; i < count; i++) {
          // Add small offset to center the particles around pointer
          const offsetX = (Math.random() - 0.5) * 6;
          const offsetY = (Math.random() - 0.5) * 6;
          
          // Random velocity direction with small scatter
          const angle = Math.random() * Math.PI * 2;
          const speedScalar = 0.4 + Math.random() * 1.4; // gentle scatter speed
          
          // Select a vibrant glow color
          const baseColor = colors[Math.floor(Math.random() * colors.length)];
          
          particles.push({
            x: x + offsetX,
            y: y + offsetY,
            vx: Math.cos(angle) * speedScalar + (dx * 0.05), // carry a tiny bit of cursor inertia
            vy: Math.sin(angle) * speedScalar + (dy * 0.05),
            size: 3 + Math.random() * 5, // size between 3px and 8px
            color: baseColor,
            maxLife: 30 + Math.floor(Math.random() * 10), // ~0.5s fade duration
            life: 0
          });
        }
      }

      lastMousePos.current = { x, y, time: now };
    };

    // Support touch devices gracefully
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const dummyEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY
        } as MouseEvent;
        handleMouseMove(dummyEvent);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    // Core Animation loop
    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      // Filter and update particles
      particles = particles.filter((p) => {
        p.life += 1;
        if (p.life >= p.maxLife) return false;

        // Apply velocities
        p.x += p.vx;
        p.y += p.vy;

        // Decelerate velocities gently over time (friction)
        p.vx *= 0.96;
        p.vy *= 0.96;

        const progress = p.life / p.maxLife; // 0 to 1
        const opacity = 1 - progress; // fade out smoothly
        
        // Draw particle
        ctx.save();
        ctx.beginPath();
        
        // Create radial gradient for a glorious glowing aura
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.size * 1.5
        );
        gradient.addColorStop(0, p.color + opacity + ")");
        gradient.addColorStop(0.3, p.color + (opacity * 0.6) + ")");
        gradient.addColorStop(1, p.color + "0)");

        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full mix-blend-screen"
      style={{ display: "block" }}
    />
  );
}

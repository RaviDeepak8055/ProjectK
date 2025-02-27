import React, { useEffect } from 'react';

const SnowEffect = () => {
  useEffect(() => {
    const canvas = document.getElementById('snowCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let snowflakes = [];

    const createSnowflake = () => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 4 + 1;
      const speed = Math.random() * 1 + 0.5;
      snowflakes.push({ x, y, radius, speed });
    };

    const drawSnowflakes = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      snowflakes.forEach(snowflake => {
        ctx.beginPath();
        ctx.arc(snowflake.x, snowflake.y, snowflake.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const updateSnowflakes = () => {
      snowflakes.forEach(snowflake => {
        snowflake.y += snowflake.speed;
        if (snowflake.y > canvas.height) {
          snowflake.y = 0;
          snowflake.x = Math.random() * canvas.width;
        }
      });
    };

    const animate = () => {
      drawSnowflakes();
      updateSnowflakes();
      requestAnimationFrame(animate);
    };

    for (let i = 0; i < 50; i++) {
      createSnowflake();
    }

    animate();

    return () => {
      snowflakes = [];
    };
  }, []);

  return <canvas id="snowCanvas" style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 999 }} />;
};

export default SnowEffect;

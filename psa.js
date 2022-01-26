// A lot of this code is based on this website (written by younger me): https://user3456.insomnia247.nl/rgb/script.js
// Yes, the original code is quite ugly

// Wrap everything so global scope remains clean
(() => {
    'use strict';

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const state = {};

    const updateSize = () => {
        canvas.width = document.documentElement.clientWidth;
        canvas.height = document.documentElement.clientHeight;
    };

    const draw = () => {
        // Redraw background
        ctx.fillStyle = 'rgb(0, 255, 255)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Debug text
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.font = '48px serif';
        ctx.fillText('Hello, World!', 10, 50);
        ctx.fillText(state.i.toString(), 50, 200);
    };

    const update = () => {
        state.i = state.i + 1 || 1;
        draw();
        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);

    window.addEventListener('resize', (e) => {
        updateSize();
        updateSize(); // Update size twice, in case scrollbars appear for any reason
        // Then redraw
        draw();
    })

    updateSize(); // Fit canvas to screen
})();

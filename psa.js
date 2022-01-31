/** psa.js
  *
  * Set up the canvas, then load and play the animation.
  *
  */

// A lot of this code is based on this website (written by younger me): https://user3456.insomnia247.nl/rgb/script.js
// Yes, the original code is quite ugly

// Wrap everything so global scope remains clean
(() => {
    'use strict';
    
    const args = new URL(document.location.href).searchParams;

    const debug = args.get('debug') || false;
    const cinematic = args.get('cinematic') || false;

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const target_fps = 60;
    let last_tick = Date.now();
    let tick_duration = 1000 / target_fps;

    const scaledwidth = size => size * canvas.width / 1920;
    const scaledheight = size => size * canvas.height / 969;

    const state = {
        fps: {
            lastsecond: 0,
            fps: 0,
            tickingfps: 0,
        },
        current_slide: -1,
        animation_state: 0,
        animation_raw_progress: 0,
        animation_progress: 0,
        animation_paused: false, // true means we're waiting for a user keypress
        mini_progress: 0,
        pause_count: 0,
        current_animation: undefined,
        background_style: '#00ffff',
    };

    const strings = {
        defn: [
            'Anxiety Disorder', // Heading
            '/ang\ufeff\u00b7zai\ufeff\u00b7uh\ufeff\u00b7tee dis\ufeff\u00b7or\ufeff\u00b7dr/', // Subheading. \ufeff\u00b7 is the MIDDLE DOT character (U+00B7)
            'noun', // Italicized, lighter color
            'Frequent, intense, excessive, and persistent worry and fear about everyday situations.',
            'Often, anxiety disorders involve repeated panic attacks, which are sudden feelings of',
            'intense anxiety and fear or terror that reach a peak within minutes. These feelings of',
            'anxiety and panic interfere with daily activities, are difficult to control, are out of',
            'proportion to the actual danger, and can last a long time. Anxiety disorders include panic',
            'disorder, obsessive-compulsive disorder (OCD), phobias, or generalized anxiety disorder.',
        ],
        nextprompt: 'Press any key to continue'
    };

    const draw_text = {
        defn: (opacity) => {
            ctx.save();
            ctx.translate(0, canvas.height * 0.15);

            ctx.fillStyle = 'rgba(255, 255, 255, ' + opacity + ')';
            ctx.textAlign = 'start';

            ctx.font = 'bold ' + scaledheight(72) + 'px serif';
            ctx.fillText(strings.defn[0], canvas.width * 0.3, canvas.height * 0.1);

            ctx.font = scaledheight(36) + 'px serif';
            ctx.fillText(strings.defn[1], canvas.width * 0.3, canvas.height * 0.15);

            ctx.font = 'italic ' + scaledheight(24) + 'px serif';
            ctx.fillText(strings.defn[2], canvas.width * 0.3, canvas.height * 0.2);

            ctx.font = scaledheight(24) + 'px serif';
            ctx.fillText(strings.defn[3], canvas.width * 0.3, canvas.height * 0.25, 810);
            ctx.fillText(strings.defn[4], canvas.width * 0.3, canvas.height * 0.3, 810);
            ctx.fillText(strings.defn[5], canvas.width * 0.3, canvas.height * 0.35, 810);
            ctx.fillText(strings.defn[6], canvas.width * 0.3, canvas.height * 0.4, 810);
            ctx.fillText(strings.defn[7], canvas.width * 0.3, canvas.height * 0.45, 810);
            ctx.fillText(strings.defn[8], canvas.width * 0.3, canvas.height * 0.5, 810);

            ctx.restore();
        },
        nextprompt: () => {
            if (cinematic) return;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = scaledheight(24) + 'px monospace';
            ctx.fillText(strings.nextprompt, canvas.width / 2, canvas.height * 0.975);
            ctx.textAlign = 'start';
        }
    };

    const animations = [
        { // Fade in definition of anxiety disorder
            duration: 1500, // milliseconds
            update: (progress) => {
                // progress = value between 0 and 1 where 1 == complete
                state.background_style = '#000000';
            },
            draw: (progress) => {
                draw_text.defn(progress);
            },
        },
        { // Show definition of anxiety disorder
            duration: cinematic ? 30000 : 1, // 30s if cinematic, otherwise until keypress
            start_paused: true,
            update: () => {
                state.background_style = '#000000';
            },
            draw: () => {
                draw_text.defn(1);
                draw_text.nextprompt();
            }
        },
        { // Fade out definition
            duration: 1500, // ms
            update: (progress) => {
                state.background_style = '#000000';
            },
            draw: (progress) => {
                draw_text.defn(1 - progress); // Invert, since its fade out
            }
        },
        { // Ending
            duration: Infinity, // Does not end
            update: () => {
                state.background_style = '#000000';
            },
            draw: () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillText('END', 50, 50);
            },
        },
    ];

    const updateSize = () => {
        canvas.width = document.documentElement.clientWidth;
        canvas.height = document.documentElement.clientHeight;
    };

    const draw = () => {
        // Redraw background
        ctx.fillStyle = state.background_style;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw current animation
        state.current_animation.draw(state.animation_progress)

        ctx.resetTransform(); // In case the animation decides to change transform settings (scale, rotation, etc.)

        if (debug) {
            // Draw FPS counter
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.font = scaledheight(48) + 'px monospace';
            ctx.fillText('FPS: ' + state.fps.fps, scaledwidth(25), canvas.height - scaledheight(25));
        }
    };

    const update = () => {
        // Calculate delta time
        let now = Date.now();
        let deltatime = now - last_tick;
        last_tick = now;
        state.dt = deltatime;

        // Update animation progress
        if (state.animation_progress >= 1 || !state.current_animation) {
            state.current_slide += 1;
            state.current_animation = animations[state.current_slide];
            state.animation_raw_progress = 0;
            state.pause_count = 0;
            state.animation_paused = state.current_animation.start_paused;
        }

        if (cinematic || !state.animation_paused)
            state.animation_raw_progress += deltatime;
        state.animation_progress = Math.min(state.animation_raw_progress / state.current_animation.duration, 1);

        state.current_animation.update(state.animation_progress);

        if (debug) {
            state.fps.tickingfps += 1;
            if (state.fps.lastsecond != Math.floor(Date.now() / 1000)) {
                state.fps.lastsecond = Math.floor(Date.now()/1000);
                state.fps.fps = state.fps.tickingfps;
                state.fps.tickingfps = 0;
            }
        }

        draw();
        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);

    window.addEventListener('resize', (e) => {
        updateSize();
        updateSize(); // Update size twice, in case scrollbars appear for any reason
        // Then redraw
        draw();
    });

    if (!cinematic)
        window.addEventListener('keydown', (event) => {
            state.animation_paused = false;
        });

    updateSize(); // Fit canvas to screen
})();
